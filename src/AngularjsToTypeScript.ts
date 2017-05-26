import {
    processCode, getNextInstruction, IsBlockID, Blocks, expandCodeRecursive,
    SimpleCodeBlock, FunctionBlock, GetRegexToMatchBlock, IsCommentBlockID
} from './util';

import JS2TS = require('./JS2TS');

class AngularjsToTypeScript {
    public run(input: string): string|number {
        let ret = processCode(input);
        let nodeIdToNode = ret.table;
        let code = ret.code;
        let split;
        let output = '';
        let factoryFound = false;
        while (split = getNextInstruction(code)) {
            let str = split.instruction;
            code = split.remain;
            if (IsBlockID(str, Blocks.STRING) &&
                (nodeIdToNode[str] as SimpleCodeBlock).code.match(/("|')use\sstrict('|")/)) {
                continue;
            }
            if (IsCommentBlockID(str)) {
                output += str + '\n';
                continue;
            }

            let roundBlockRegex = GetRegexToMatchBlock(Blocks.ROUNDBLOCK).source;
            if (str.match(new RegExp("add(Boolean|Number|String)Flag\\s*" + roundBlockRegex + "$"))) {
                output += str + ';\n';
                continue;
            }

            var match = str.match(new RegExp("^blink\\.app\\.factory\\s*(" + roundBlockRegex + ")$"));
            if (match) {
                if (factoryFound) {
                    console.log('More than 1 factory present! exiting!');
                    return -1;
                }
                let roundBlock = nodeIdToNode[match[1]] as SimpleCodeBlock;
                let stringBlockRegex = GetRegexToMatchBlock(Blocks.STRING).source;
                let arrBlockRegex = GetRegexToMatchBlock(Blocks.SQUAREBLOCK).source;

                let deps = [], factoryBody = '', moduleName;

                let match2 = roundBlock.code.match(new RegExp(
                    `^\\s*(${stringBlockRegex})\\s*,\\s*(${arrBlockRegex})\\s*$`
                ));
                if (match2) {
                    moduleName = AngularjsToTypeScript.stripQuotes(
                        (nodeIdToNode[match2[1]] as SimpleCodeBlock).code
                    );
                    let depsArray = (nodeIdToNode[match2[2]] as SimpleCodeBlock).code
                        .split(',');
                    depsArray.forEach((dep, index) => {
                        dep = dep.trim();
                        if (index == depsArray.length - 1) {
                            if (!IsBlockID(dep, Blocks.FUNCTION)) {
                                throw new Error('invalid format of factory!');
                            }
                            factoryBody = (
                                nodeIdToNode[(nodeIdToNode[dep] as FunctionBlock).bodyID] as SimpleCodeBlock
                            ).code;
                        } else {
                            if (!IsBlockID(dep, Blocks.STRING)) {
                                throw new Error('invalid format of factory!');
                            }
                            deps.push(AngularjsToTypeScript.stripQuotes(
                                (nodeIdToNode[dep] as SimpleCodeBlock).code
                            ));
                        }
                    });
                } else {
                    let funcBlockRegex = GetRegexToMatchBlock(Blocks.FUNCTION).source;
                    match2 = roundBlock.code.match(new RegExp(
                        `^\\s*(${stringBlockRegex})\\s*,\\s*(${funcBlockRegex})\\s*$`
                    ));
                    moduleName = AngularjsToTypeScript.stripQuotes(
                        (nodeIdToNode[match2[1]] as SimpleCodeBlock).code
                    );
                    factoryBody = (
                        nodeIdToNode[(nodeIdToNode[match2[2]] as FunctionBlock).bodyID] as SimpleCodeBlock
                    ).code;
                }

                let decoratorImports = ['Provide'];
                if (deps.length > 0) {
                    decoratorImports.unshift('ngRequire');
                }
                let importCode =
                    `import {${decoratorImports.join(', ')}} from 'src/base/decorators';`;

                let depsCode = deps.map(dep => {
                    return `let ${dep} = ngRequire('${dep}');`;
                }).join('\n');

                let factoryBodyCode = new JS2TS(moduleName, /return\s+(.*)$/, 1).run(
                    expandCodeRecursive(factoryBody, nodeIdToNode)
                );
                output += '\n' + importCode + '\n\n' + depsCode + '\n\n' + factoryBodyCode + '\n';
                factoryFound = true;
                continue;
            }

            console.log('Unhandled code present at top level. Exiting!');
            return -1;
        }

        if (!factoryFound) {
            console.log('No factory found! Exiting');
            return -1;
        }

        return expandCodeRecursive(output, nodeIdToNode);
    }

    private static stripQuotes(str: string): string {
        return str.replace(/^("|')/, '').replace(/("|')$/, '');
    }
}

export = AngularjsToTypeScript;