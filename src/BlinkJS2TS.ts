import {
    processCode, getNextInstruction, IsBlockID, Blocks, expandCodeRecursive,
    SimpleCodeBlock, FunctionBlock, GetRegexToMatchBlock, IsCommentBlockID
} from './util';

import JS2TS = require('./JS2TS');

class BlinkJS2TS {
    public run(input: string): string {
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
            var match = str.match(new RegExp("^blink\\.app\\.factory\\s*(" + roundBlockRegex + ")$"));
            if (match) {
                if (factoryFound) {
                    throw new Error('Only supports one factory per file!');
                }
                let roundBlock = nodeIdToNode[match[1]] as SimpleCodeBlock;
                let stringBlockRegex = GetRegexToMatchBlock(Blocks.STRING).source;
                let arrBlockRegex = GetRegexToMatchBlock(Blocks.SQUAREBLOCK).source;
                let match2 = roundBlock.code.match(new RegExp(
                    `^\\s*(${stringBlockRegex})\\s*,\\s*(${arrBlockRegex})\\s*$`
                ));
                if (!match2) {
                    throw new Error('invalid format of factory!');
                }

                let moduleName = BlinkJS2TS.stripQuotes(
                    (nodeIdToNode[match2[1]] as SimpleCodeBlock).code
                );
                let depsArray = (nodeIdToNode[match2[2]] as SimpleCodeBlock).code
                    .split(',');
                let deps = [], factoryBody = '';
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
                        deps.push(BlinkJS2TS.stripQuotes(
                            (nodeIdToNode[dep] as SimpleCodeBlock).code
                        ));
                    }
                });

                output += '\n' + deps.map(dep => {
                        return `let ${dep} = ngRequire('${dep}');`;
                    }).join('\n');
                output += '\n\n';


                let factoryBodyCode = expandCodeRecursive(factoryBody, nodeIdToNode);
                let tsModuleCode = new JS2TS(moduleName, /return\s+(.*)$/, 1).run(factoryBodyCode);
                output += tsModuleCode + '\n';

                factoryFound = true;
                continue;
            }

            throw new Error('global code present in the file!');
        }

        return expandCodeRecursive(output, nodeIdToNode);
    }

    private static stripQuotes(str: string): string {
        return str.replace(/^("|')/, '').replace(/("|')$/, '');
    }
}

export = BlinkJS2TS;