"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var BLOCK = 'BLOCK';
exports.Blocks = {
    INCOMMENT: 'INCOMMENT',
    BLCOMMENT: 'BLCOMMENT',
    REGEX: 'REGEX',
    STRING: 'STRING',
    ROUNDBLOCK: 'ROUNDBLOCK',
    CURLYBLOCK: 'CURLYBLOCK',
    SQUAREBLOCK: 'SQUAREBLOCK',
    IF: 'IF',
    ELIF: 'ELIF',
    ELSE: 'ELSE',
    SWITCH: 'SWITCH',
    FOR: 'FOR',
    WHILE: 'WHILE',
    OBJECT: 'OBJECT',
    FUNCTION: 'FUNCTION',
    CLASS: 'CLASS',
    CTOR: 'CTOR',
    CLASSMETHOD: 'CLASSMETHOD',
    CLASSPROP: 'CLASSPROP'
};
var BlockBase = (function () {
    function BlockBase(options) {
        this.docs = [];
        this.id = NewBlockID(options.type);
        this.type = options.type;
        this.docs = options.docs || [];
    }
    return BlockBase;
}());
exports.BlockBase = BlockBase;
var SimpleCodeBlock = (function (_super) {
    __extends(SimpleCodeBlock, _super);
    function SimpleCodeBlock(options) {
        var _this = _super.call(this, options) || this;
        _this.code = options.code;
        return _this;
    }
    return SimpleCodeBlock;
}(BlockBase));
exports.SimpleCodeBlock = SimpleCodeBlock;
var BlockWithBody = (function (_super) {
    __extends(BlockWithBody, _super);
    function BlockWithBody(options) {
        var _this = _super.call(this, options) || this;
        _this.bodyID = options.bodyID;
        return _this;
    }
    return BlockWithBody;
}(BlockBase));
exports.BlockWithBody = BlockWithBody;
var BlockWithHeaderAndBody = (function (_super) {
    __extends(BlockWithHeaderAndBody, _super);
    function BlockWithHeaderAndBody(options) {
        var _this = _super.call(this, options) || this;
        _this.headerID = options.headerID;
        return _this;
    }
    return BlockWithHeaderAndBody;
}(BlockWithBody));
exports.BlockWithHeaderAndBody = BlockWithHeaderAndBody;
var FunctionBlock = (function (_super) {
    __extends(FunctionBlock, _super);
    function FunctionBlock(options) {
        var _this = _super.call(this, options) || this;
        _this.functionName = options.functionName;
        return _this;
    }
    return FunctionBlock;
}(BlockWithHeaderAndBody));
exports.FunctionBlock = FunctionBlock;
var ClassBlock = (function (_super) {
    __extends(ClassBlock, _super);
    function ClassBlock(options) {
        var _this = _super.call(this, options) || this;
        _this.className = options.className;
        _this.parentClassName = options.parentClassName;
        _this.interfaceNames = options.interfaceNames;
        _this.ctor = options.ctor;
        _this.methods = options.methods;
        _this.vars = options.vars;
        return _this;
    }
    return ClassBlock;
}(BlockBase));
exports.ClassBlock = ClassBlock;
var ClassMethodBlock = (function (_super) {
    __extends(ClassMethodBlock, _super);
    function ClassMethodBlock(options) {
        var _this = _super.call(this, options) || this;
        _this.name = options.name;
        _this.accessType = options.accessType;
        _this.isStatic = options.isStatic;
        return _this;
    }
    return ClassMethodBlock;
}(BlockWithHeaderAndBody));
exports.ClassMethodBlock = ClassMethodBlock;
var ClassPropBlock = (function (_super) {
    __extends(ClassPropBlock, _super);
    function ClassPropBlock(options) {
        var _this = _super.call(this, options) || this;
        _this.name = options.name;
        _this.accessType = options.accessType;
        _this.isStatic = options.isStatic;
        return _this;
    }
    return ClassPropBlock;
}(SimpleCodeBlock));
exports.ClassPropBlock = ClassPropBlock;
function NewBlockID(blockType) {
    var num = Math.floor(Math.random() * (1000000000 - 1 + 1)) + 1;
    return '@' + BLOCK + '_' + blockType + '_' + num + '@';
}
exports.NewBlockID = NewBlockID;
function GetRegexToMatchBlock(blockType) {
    var blockRegex = blockType || "[A-Z]+";
    return new RegExp("@" + BLOCK + "_" + blockRegex + "_\\d+@");
}
exports.GetRegexToMatchBlock = GetRegexToMatchBlock;
function GetRegexToFindAllBlocks() {
    return new RegExp("@" + BLOCK + "_" + "[A-Z]+" + "_\\d+@", "g");
}
exports.GetRegexToFindAllBlocks = GetRegexToFindAllBlocks;
function GetRegexToFindSpecificBlocks(types) {
    var blockRegex = "(" + types.join('|') + ")";
    return new RegExp("@" + BLOCK + "_" + blockRegex + "_\\d+@", "g");
}
exports.GetRegexToFindSpecificBlocks = GetRegexToFindSpecificBlocks;
function GetRegexToExactMatchBlock(blockType) {
    var blockRegex = blockType || "[A-Z]+";
    return new RegExp("^@" + BLOCK + "_" + blockRegex + "_\\d+@$");
}
exports.GetRegexToExactMatchBlock = GetRegexToExactMatchBlock;
function GetRegexToMatchBlockInBeginning(blockType) {
    var blockRegex = blockType || "[A-Z]+";
    return new RegExp("^@" + BLOCK + "_" + blockRegex + "_\\d+@");
}
exports.GetRegexToMatchBlockInBeginning = GetRegexToMatchBlockInBeginning;
function IsBlockID(str, blockType) {
    if (!_.isString(str))
        return false;
    return !!str.match(GetRegexToExactMatchBlock(blockType));
}
exports.IsBlockID = IsBlockID;
function IsCommentBlockID(str) {
    return IsBlockID(str, exports.Blocks.BLCOMMENT) || IsBlockID(str, exports.Blocks.INCOMMENT);
}
exports.IsCommentBlockID = IsCommentBlockID;
function getRegexToMatchVarName() {
    return "[_\\$A-Za-z][_\\$\\w]*";
}
exports.getRegexToMatchVarName = getRegexToMatchVarName;
function IsVarName(str) {
    return _.isString(str) && !!(str.match(/^[_\$A-Za-z][_\$\w]*$/));
}
exports.IsVarName = IsVarName;
function GetLastMatchedPosition(str, regex) {
    if (regex.flags.indexOf('g') === -1) {
        throw new Error('must pass regex with global flag');
    }
    var match = regex.exec(str), nextMatch;
    if (!match)
        return -1;
    while (nextMatch = regex.exec(str)) {
        match = nextMatch;
    }
    return match.index;
}
exports.GetLastMatchedPosition = GetLastMatchedPosition;
function EscapeDollar(str) {
    var ans = '';
    for (var i = 0; i < str.length; i++) {
        ans += str[i] == '$' ? '$$' : str[i];
    }
    return ans;
}
exports.EscapeDollar = EscapeDollar;
function computeMatchingBraces(code, openChar, closeChar) {
    var matches = {}, opens = [];
    for (var i = 0; i < code.length; i++) {
        if (code[i] == openChar) {
            opens.push(i);
        }
        else if (code[i] == closeChar) {
            var open = opens.pop();
            matches[open] = i;
            matches[i] = open;
        }
    }
    return matches;
}
exports.computeMatchingBraces = computeMatchingBraces;
function minifyCommentsRegexAndStrings(code) {
    var index = 0;
    var ans = '';
    var map = {};
    while (index < code.length) {
        var ch = code[index];
        if (ch === '/') {
            if (code[index + 1] == '/') {
                var end = code.indexOf('\n', index);
                if (end === -1) {
                    end = code.length - 1;
                }
                var block = new SimpleCodeBlock({
                    type: exports.Blocks.INCOMMENT,
                    code: code.slice(index, end + 1)
                });
                ans += block.id;
                map[block.id] = block;
                index = end + 1;
            }
            else if (code[index + 1] == '*') {
                var end = code.indexOf('*/', index + 1) + 1;
                var block = new SimpleCodeBlock({
                    type: exports.Blocks.BLCOMMENT,
                    code: code.slice(index, end + 1)
                });
                ans += block.id;
                map[block.id] = block;
                index = end + 1;
            }
            else {
                var lastNonWhitespaceChart = ans.match(/([^\s]?)\s*$/)[1];
                if (lastNonWhitespaceChart == ')') {
                    throw new Error('not implemented');
                }
                else if (lastNonWhitespaceChart.match(/[_\w]/)) {
                    ans += ch;
                    index++;
                }
                else {
                    var start = index;
                    index = code.indexOf(ch, index + 1);
                    while (code.slice(0, index).match(/[\\]*$/)[0].length % 2 == 1) {
                        index = code.indexOf(ch, index + 1);
                    }
                    var end = index;
                    var block = new SimpleCodeBlock({
                        type: exports.Blocks.REGEX,
                        code: code.slice(start, end + 1)
                    });
                    ans += block.id;
                    map[block.id] = block;
                    index = end + 1;
                }
            }
        }
        else if (ch === "'" || ch === '"') {
            var start = index;
            index = code.indexOf(ch, index + 1);
            while (code.slice(0, index).match(/[\\]*$/)[0].length % 2 == 1) {
                index = code.indexOf(ch, index + 1);
            }
            var end = index;
            var block = new SimpleCodeBlock({
                type: exports.Blocks.STRING,
                code: code.slice(start, end + 1)
            });
            ans += block.id;
            map[block.id] = block;
            index = end + 1;
        }
        else {
            ans += ch;
            index++;
        }
    }
    return {
        code: ans,
        table: map
    };
}
exports.minifyCommentsRegexAndStrings = minifyCommentsRegexAndStrings;
function minifyBrackets(code) {
    var opens = '({[', closes = ')}]';
    var bracketToType = {
        '(': exports.Blocks.ROUNDBLOCK,
        '{': exports.Blocks.CURLYBLOCK,
        '[': exports.Blocks.SQUAREBLOCK
    };
    var matching = {};
    for (var i = 0; i < 3; i++) {
        var matches = computeMatchingBraces(code, opens[i], closes[i]);
        _.forEach(matches, function (val, key) {
            matching[key] = val;
        });
    }
    var index = 0;
    var ans = '';
    var map = {};
    while (index < code.length) {
        var ch = code[index];
        if (!!matching[index]) {
            var closePos = matching[index];
            var res = minifyBrackets(code.slice(index + 1, closePos));
            var block = new SimpleCodeBlock({ type: bracketToType[ch], code: res.code });
            _.forEach(res.table, function (val, key) {
                map[key] = val;
            });
            map[block.id] = block;
            ans += block.id;
            index = closePos + 1;
        }
        else {
            ans += ch;
            index++;
        }
    }
    return {
        code: ans,
        table: map
    };
}
exports.minifyBrackets = minifyBrackets;
function combineBlocksWithHeaders(code) {
    var index = 0;
    var ans = '';
    var map = {};
    while (index < code.length) {
        var ch = code[index];
        if (ch.match(/\s/)) {
            ans += ch;
            index++;
            continue;
        }
        var str = code.slice(index);
        var match = void 0;
        match = str.match(GetRegexToMatchBlockInBeginning(exports.Blocks.CURLYBLOCK));
        if (match) {
            var objBlock = new BlockWithBody({
                type: exports.Blocks.OBJECT,
                bodyID: match[0]
            });
            ans += objBlock.id;
            map[objBlock.id] = objBlock;
            index += match[0].length;
            continue;
        }
        match = str.match(/^(if|else\s+if|else|for|while|switch|function)\b/);
        if (match) {
            var headerID = '', bodyID = void 0, functionName = void 0;
            str = str.replace(/^(if|else\s+if|else|for|while|switch|function)\s*/, '');
            var keyword = match[1];
            if (keyword == 'function') {
                var funcNameMatch = str.match(new RegExp("^(" + getRegexToMatchVarName() + ")\\s*"));
                if (funcNameMatch && !IsBlockID(funcNameMatch[1])) {
                    functionName = funcNameMatch[1];
                    str = str.slice(funcNameMatch[0].length);
                }
            }
            if (keyword != 'else') {
                var roundMatch = str.match(GetRegexToMatchBlockInBeginning(exports.Blocks.ROUNDBLOCK));
                if (!roundMatch) {
                    throw new Error('invalid code 1');
                }
                headerID = roundMatch[0];
                str = str.slice(roundMatch[0].length);
                str = str.replace(/^\s*/, '');
            }
            var curlyMatch = str.match(GetRegexToMatchBlockInBeginning(exports.Blocks.CURLYBLOCK));
            if (!curlyMatch) {
                throw new Error('Expecting a curly block after ' + keyword);
            }
            bodyID = curlyMatch[0];
            str = str.slice(curlyMatch[0].length);
            var type = keyword.match(/else\s+if/) ? exports.Blocks.ELIF : keyword.toUpperCase(), block = void 0;
            if (type === exports.Blocks.FUNCTION) {
                block = new FunctionBlock({
                    type: type,
                    headerID: headerID,
                    bodyID: bodyID,
                    functionName: functionName
                });
            }
            else if (type === exports.Blocks.ELSE) {
                block = new BlockWithBody({
                    type: type,
                    bodyID: bodyID
                });
            }
            else {
                block = new BlockWithHeaderAndBody({
                    type: type,
                    headerID: headerID,
                    bodyID: bodyID
                });
            }
            ans += block.id;
            map[block.id] = block;
            index = code.length - str.length;
            continue;
        }
        if (ch.match(/\w/)) {
            while (ch.match(/\w/)) {
                ans += ch;
                index++;
                if (index == code.length)
                    break;
                ch = code[index];
            }
        }
        else {
            ans += ch;
            index++;
        }
    }
    return {
        code: ans,
        table: map
    };
}
exports.combineBlocksWithHeaders = combineBlocksWithHeaders;
function getNextInstruction(code) {
    code = code.replace(/^\s*/, '');
    if (!code) {
        return null;
    }
    var regex = GetRegexToMatchBlockInBeginning();
    var match = code.match(regex);
    if (!!match) {
        return {
            instruction: match[0],
            remain: code.replace(GetRegexToMatchBlockInBeginning(), '').replace(/^\s*;/, '')
        };
    }
    var end = code.indexOf(';');
    if (end === -1) {
        throw new Error('instruction not ending with semicolon');
    }
    return {
        instruction: code.slice(0, end).trim(),
        remain: code.slice(end + 1)
    };
}
exports.getNextInstruction = getNextInstruction;
function processCode(code) {
    var res = minifyCommentsRegexAndStrings(code);
    var table = res.table;
    res = minifyBrackets(res.code);
    table = _.merge(table, res.table);
    res = combineBlocksWithHeaders(res.code);
    table = _.merge(table, res.table);
    _.forEach(table, function (val, key) {
        if (IsBlockID(key, exports.Blocks.ROUNDBLOCK) ||
            IsBlockID(key, exports.Blocks.CURLYBLOCK) ||
            IsBlockID(key, exports.Blocks.SQUAREBLOCK)) {
            var simpleCodeBlock = val;
            var res_1 = combineBlocksWithHeaders(simpleCodeBlock.code);
            simpleCodeBlock.code = res_1.code;
            table = _.merge(table, res_1.table);
        }
    });
    return {
        code: res.code,
        table: table
    };
}
exports.processCode = processCode;
function extractBlockIDs(code, specificBlockTypes) {
    var regex = specificBlockTypes === void 0
        ? GetRegexToFindAllBlocks()
        : GetRegexToFindSpecificBlocks(specificBlockTypes);
    var match = regex.exec(code);
    var ret = [];
    while (match != null) {
        ret.push(match[0]);
        match = regex.exec(code);
    }
    return ret;
}
exports.extractBlockIDs = extractBlockIDs;
function expandCodeRecursive(code, table, specificBlockTypes) {
    var blockIDs = extractBlockIDs(code, specificBlockTypes);
    while (blockIDs.length > 0) {
        blockIDs.forEach(function (id) {
            var node = table[id];
            code = code.replace(new RegExp(id), expandBlock(node));
        });
        blockIDs = extractBlockIDs(code, specificBlockTypes);
    }
    return code;
}
exports.expandCodeRecursive = expandCodeRecursive;
function expandBlock(node) {
    var replaceText = '';
    switch (node.type) {
        case exports.Blocks.FUNCTION:
            var funcNode = node;
            replaceText = expandFunctionBlock(funcNode);
            break;
        case exports.Blocks.ELSE:
            var elseBlock = node;
            replaceText = "else " + elseBlock.bodyID;
            break;
        case exports.Blocks.IF:
        case exports.Blocks.ELIF:
        case exports.Blocks.SWITCH:
        case exports.Blocks.FOR:
        case exports.Blocks.WHILE:
            var switchNode = node;
            var keyword = node.type === exports.Blocks.ELIF ? 'else if' : node.type.toLowerCase();
            replaceText =
                keyword + " " + switchNode.headerID + " " + switchNode.bodyID;
            break;
        case exports.Blocks.OBJECT:
            var objNode = node;
            replaceText = objNode.bodyID;
            break;
        case exports.Blocks.INCOMMENT:
            var inCommentBlock = node;
            replaceText = inCommentBlock.code;
            break;
        case exports.Blocks.BLCOMMENT:
            var blCommentBlock = node;
            replaceText = blCommentBlock.code;
            break;
        case exports.Blocks.CTOR:
            var ctorBlock = node;
            replaceText = expandCtorBlock(ctorBlock);
            break;
        case exports.Blocks.CLASS:
            var classNode = node;
            replaceText = expandClassBlock(classNode);
            break;
        case exports.Blocks.ROUNDBLOCK:
            var roundBlock = node;
            replaceText = '(' + roundBlock.code + ')';
            break;
        case exports.Blocks.CURLYBLOCK:
            var curlyBlock = node;
            replaceText = '{ ' + curlyBlock.code + ' }';
            break;
        case exports.Blocks.SQUAREBLOCK:
            var sqBlock = node;
            replaceText = '[' + sqBlock.code + ']';
            break;
        case exports.Blocks.REGEX:
            var regexBlock = node;
            replaceText = regexBlock.code;
            break;
        case exports.Blocks.STRING:
            var strBlock = node;
            replaceText = strBlock.code;
            break;
        case exports.Blocks.CLASSMETHOD:
            var classMethodBlock = node;
            replaceText = expandClassMethodBlock(classMethodBlock);
            break;
        case exports.Blocks.CLASSPROP:
            var classPropBlock = node;
            replaceText = expandClassPropBlock(classPropBlock);
            break;
        default:
            throw new Error('block type not handled in expandBlock()');
    }
    return replaceText;
}
exports.expandBlock = expandBlock;
function expandClassBlock(node) {
    var methods = '';
    if (node.methods.length > 0) {
        methods = node.methods.join('\n') + '\n';
    }
    var vars = node.vars.join('\n');
    var ans = "class " + node.className;
    if (node.parentClassName) {
        ans += " extends " + node.parentClassName;
    }
    return ans + " {\n" + vars + "\n" + node.ctor + "\n " + methods + "}";
}
exports.expandClassBlock = expandClassBlock;
function expandCtorBlock(node) {
    var docs = '';
    if (node.docs.length > 0) {
        docs = node.docs.join('');
        if (IsBlockID(node.docs[node.docs.length - 1], exports.Blocks.BLCOMMENT)) {
            docs += '\n';
        }
    }
    return docs + "constructor " + node.headerID + " " + node.bodyID;
}
exports.expandCtorBlock = expandCtorBlock;
function expandClassMethodBlock(block) {
    var ans = '';
    if (block.docs.length > 0) {
        ans += block.docs.join('');
        if (IsBlockID(block.docs[block.docs.length - 1], exports.Blocks.BLCOMMENT)) {
            ans += '\n';
        }
    }
    ans += block.accessType.replace(/_$/, '');
    if (block.isStatic) {
        ans += ' static';
    }
    ans += ' ' + block.name;
    ans += block.headerID + ' ' + block.bodyID;
    return ans;
}
exports.expandClassMethodBlock = expandClassMethodBlock;
function expandClassPropBlock(block) {
    var ans = '';
    ans += block.accessType.replace(/_$/, '');
    if (block.isStatic) {
        ans += ' static';
    }
    ans += ' ' + block.name;
    if (block.code && block.code.trim()) {
        ans += ' = ' + block.code;
    }
    ans += ';';
    return ans;
}
exports.expandClassPropBlock = expandClassPropBlock;
function expandFunctionBlock(funcNode) {
    var prefix = '';
    if (funcNode.functionName) {
        prefix += '\n';
    }
    if (funcNode.docs.length > 0) {
        var docs = funcNode.docs.join('');
        if (IsBlockID(funcNode.docs[funcNode.docs.length - 1], exports.Blocks.BLCOMMENT)) {
            docs += '\n';
        }
        prefix += docs;
    }
    return prefix + "function " + (funcNode.functionName || '') + " " + funcNode.headerID + " " + funcNode.bodyID;
}
exports.expandFunctionBlock = expandFunctionBlock;
//# sourceMappingURL=util.js.map