"use strict";
var util_1 = require("./util");
var JS2TS = require("./JS2TS");
var BlinkJS2TS = (function () {
    function BlinkJS2TS() {
    }
    BlinkJS2TS.prototype.run = function (input) {
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
            match = str.match(new RegExp("^blink\\.app\\.factory\\s*(" + roundBlockRegex + ")$"));
            if (match) {
                if (factoryFound) {
                    throw new Error('Only supports one factory per file!');
                }
                var roundBlock = nodeIdToNode[match[1]];
                var stringBlockRegex = util_1.GetRegexToMatchBlock(util_1.Blocks.STRING).source;
                var arrBlockRegex = util_1.GetRegexToMatchBlock(util_1.Blocks.SQUAREBLOCK).source;
                var match2 = roundBlock.code.match(new RegExp("^\\s*(" + stringBlockRegex + ")\\s*,\\s*(" + arrBlockRegex + ")\\s*$"));
                if (!match2) {
                    throw new Error('invalid format of factory!');
                }
                var moduleName = BlinkJS2TS.stripQuotes(nodeIdToNode[match2[1]].code);
                var depsArray_1 = nodeIdToNode[match2[2]].code
                    .split(',');
                var deps_1 = [], factoryBody_1 = '';
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
                        deps_1.push(BlinkJS2TS.stripQuotes(nodeIdToNode[dep].code));
                    }
                });
                output += '\n' + deps_1.map(function (dep) {
                    return "let " + dep + " = ngRequire('" + dep + "');";
                }).join('\n');
                output += '\n\n';
                var factoryBodyCode = util_1.expandCodeRecursive(factoryBody_1, nodeIdToNode);
                var tsModuleCode = new JS2TS(moduleName, /return\s+(.*)$/, 1).run(factoryBodyCode);
                output += tsModuleCode + '\n';
                factoryFound = true;
                return "continue";
            }
            throw new Error('global code present in the file!');
        };
        var match;
        while (split = util_1.getNextInstruction(code)) {
            _loop_1();
        }
        return util_1.expandCodeRecursive(output, nodeIdToNode);
    };
    BlinkJS2TS.stripQuotes = function (str) {
        return str.replace(/^("|')/, '').replace(/("|')$/, '');
    };
    return BlinkJS2TS;
}());
module.exports = BlinkJS2TS;
//# sourceMappingURL=BlinkJS2TS.js.map