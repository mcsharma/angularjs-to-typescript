"use strict";
var util_1 = require("./util");
var JS2TS = require("./JS2TS");
var AngularjsToTypeScript = (function () {
    function AngularjsToTypeScript() {
    }
    AngularjsToTypeScript.prototype.run = function (input) {
        var ret = util_1.processCode(input);
        var nodeIdToNode = ret.table;
        var code = ret.code;
        var split;
        var output = '';
        var factoryFound = false;
        var _loop_1 = function () {
            var str = split.instruction;
            code = split.remain;
            if (util_1.IsBlockID(str, util_1.Blocks.STRING) &&
                nodeIdToNode[str].code.match(/("|')use\sstrict('|")/)) {
                return "continue";
            }
            if (util_1.IsCommentBlockID(str)) {
                output += str + '\n';
                return "continue";
            }
            var roundBlockRegex = util_1.GetRegexToMatchBlock(util_1.Blocks.ROUNDBLOCK).source;
            if (str.match(new RegExp("add(Boolean|Number|String)Flag\\s*" + roundBlockRegex + "$"))) {
                output += str + ';\n';
                return "continue";
            }
            match = str.match(new RegExp("^blink\\.app\\.factory\\s*(" + roundBlockRegex + ")$"));
            if (match) {
                if (factoryFound) {
                    console.log('More than 1 factory present! exiting!');
                    return { value: -1 };
                }
                var roundBlock = nodeIdToNode[match[1]];
                var stringBlockRegex = util_1.GetRegexToMatchBlock(util_1.Blocks.STRING).source;
                var arrBlockRegex = util_1.GetRegexToMatchBlock(util_1.Blocks.SQUAREBLOCK).source;
                var deps_1 = [], factoryBody_1 = '', moduleName = void 0;
                var match2 = roundBlock.code.match(new RegExp("^\\s*(" + stringBlockRegex + ")\\s*,\\s*(" + arrBlockRegex + ")\\s*$"));
                if (match2) {
                    moduleName = AngularjsToTypeScript.stripQuotes(nodeIdToNode[match2[1]].code);
                    var depsArray_1 = nodeIdToNode[match2[2]].code
                        .split(',');
                    depsArray_1.forEach(function (dep, index) {
                        dep = dep.trim();
                        if (index == depsArray_1.length - 1) {
                            if (!util_1.IsBlockID(dep, util_1.Blocks.FUNCTION)) {
                                throw new Error('invalid format of factory!');
                            }
                            factoryBody_1 = nodeIdToNode[nodeIdToNode[dep].bodyID].code;
                        }
                        else {
                            if (!util_1.IsBlockID(dep, util_1.Blocks.STRING)) {
                                throw new Error('invalid format of factory!');
                            }
                            deps_1.push(AngularjsToTypeScript.stripQuotes(nodeIdToNode[dep].code));
                        }
                    });
                }
                else {
                    var funcBlockRegex = util_1.GetRegexToMatchBlock(util_1.Blocks.FUNCTION).source;
                    match2 = roundBlock.code.match(new RegExp("^\\s*(" + stringBlockRegex + ")\\s*,\\s*(" + funcBlockRegex + ")\\s*$"));
                    moduleName = AngularjsToTypeScript.stripQuotes(nodeIdToNode[match2[1]].code);
                    factoryBody_1 = nodeIdToNode[nodeIdToNode[match2[2]].bodyID].code;
                }
                var decoratorImports = ['Provide'];
                if (deps_1.length > 0) {
                    decoratorImports.unshift('ngRequire');
                }
                var importCode = "import {" + decoratorImports.join(', ') + "} from 'src/base/decorators';";
                var depsCode = deps_1.map(function (dep) {
                    return "let " + dep + " = ngRequire('" + dep + "');";
                }).join('\n');
                var factoryBodyCode = new JS2TS(moduleName, /return\s+(.*)$/, 1).run(util_1.expandCodeRecursive(factoryBody_1, nodeIdToNode));
                if (factoryBodyCode === -1) {
                    return { value: -1 };
                }
                output += '\n' + importCode + '\n\n' + depsCode + '\n\n' + factoryBodyCode + '\n';
                factoryFound = true;
                return "continue";
            }
            console.log('Unhandled code present at top level. Exiting!');
            return { value: -1 };
        };
        var match;
        while (split = util_1.getNextInstruction(code)) {
            var state_1 = _loop_1();
            if (typeof state_1 === "object")
                return state_1.value;
        }
        if (!factoryFound) {
            console.log('No factory found! Exiting');
            return -1;
        }
        return util_1.expandCodeRecursive(output, nodeIdToNode);
    };
    AngularjsToTypeScript.stripQuotes = function (str) {
        return str.replace(/^("|')/, '').replace(/("|')$/, '');
    };
    return AngularjsToTypeScript;
}());
module.exports = AngularjsToTypeScript;
//# sourceMappingURL=AngularjsToTypeScript.js.map