import * as _ from "lodash";

let BLOCK = 'BLOCK';

type BlockType = 'ROOT' |
    'FUNCTION' |
    'IF' |
    'ELIF' |
    'ELSE' |
    'SWITCH' |
    'FOR' |
    'WHILE' |
    'OBJECT' |
    'INCOMMENT' |
    'BLCOMMENT' |
    'CLASS' |
    'ROUNDBLOCK' |
    'CURLYBLOCK' |
    'SQUAREBLOCK' |
    'REGEX' |
    'STRING' |
    'CTOR' |
    'CLASSMETHOD' |
    'CLASSPROP';


export let Blocks = {
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
} as any;

interface BlockBaseOptions {
    type: BlockType;
    docs?: string[];
}

interface SimpleCodeBlockOptions extends BlockBaseOptions {
    code?: string;
}

interface BlockWithBodyOptions extends BlockBaseOptions {
    bodyID: string;
}

interface BlockWithHeaderAndBodyOptions extends BlockWithBodyOptions {
    headerID: string;
}

interface FunctionBlockOptions extends BlockWithHeaderAndBodyOptions {
    functionName?: string;
}

interface ClassBlockOptions extends BlockBaseOptions {
    className: string;
    parentClassName?: string;
    interfaceNames?: string[];
    ctor?: string;
    methods?: string[];
    vars?: string[];
}

interface ClassVariableOptions {
    name: string;
    accessType: 'public_' | 'private_' | 'protracted_';
    isStatic: boolean;
}

interface ClassMethodBlockOptions extends ClassVariableOptions, BlockWithHeaderAndBodyOptions {
}

interface ClassPropBlockOptions extends ClassVariableOptions, SimpleCodeBlockOptions {
}

export abstract class BlockBase {
    public readonly id: string;
    public readonly type: BlockType;
    public docs: string[] = [];

    constructor(options: BlockBaseOptions) {
        this.id = NewBlockID(options.type);
        this.type = options.type;
        this.docs = options.docs || [];
    }
}

// like comment, object array and round blocks
export class SimpleCodeBlock extends BlockBase {
    public code?: string;
    constructor(options: SimpleCodeBlockOptions) {
        super(options);
        this.code = options.code;
    }
}

// like else block
export class BlockWithBody extends BlockBase {
    public readonly bodyID: string;
    constructor(options: BlockWithBodyOptions) {
        super(options);
        this.bodyID = options.bodyID;
    }
}

// like if, switch, for, while, class method blocks
export class BlockWithHeaderAndBody extends BlockWithBody {
    public readonly headerID: string;
    constructor(options: BlockWithHeaderAndBodyOptions) {
        super(options);
        this.headerID = options.headerID;
    }
}

//
export class FunctionBlock extends BlockWithHeaderAndBody {
    public functionName?: string;
    constructor(options: FunctionBlockOptions) {
        super(options);
        this.functionName = options.functionName;
    }
}

// class block ->  class Foo extends Bar implements Baz {...}
export class ClassBlock extends BlockBase {
    public readonly className: string;
    public readonly parentClassName?: string;
    public readonly interfaceNames?: string[];
    public readonly ctor?: string;
    public readonly methods?: string[];
    public readonly vars?: string[];

    constructor(options: ClassBlockOptions) {
        super(options);
        this.className = options.className;
        this.parentClassName = options.parentClassName;
        this.interfaceNames = options.interfaceNames;
        this.ctor = options.ctor;
        this.methods = options.methods;
        this.vars = options.vars;
    }
}

export class ClassMethodBlock extends BlockWithHeaderAndBody {
    public readonly name: string;
    public readonly accessType: 'public_' | 'private_' | 'protracted_';
    public readonly isStatic: boolean;

    constructor(options: ClassMethodBlockOptions) {
        super(options);
        this.name = options.name;
        this.accessType = options.accessType;
        this.isStatic = options.isStatic;
    }
}


// No easy way to achieve multiple inheritance :(
export class ClassPropBlock extends SimpleCodeBlock {
    public readonly name: string;
    public readonly accessType: 'public_' | 'private_' | 'protracted_';
    public readonly isStatic: boolean;

    constructor(options: ClassPropBlockOptions) {
        super(options);
        this.name = options.name;
        this.accessType = options.accessType;
        this.isStatic = options.isStatic;
    }
}

export function NewBlockID(blockType: BlockType): string {
    let num = Math.floor(Math.random() * (1000000000 - 1 + 1)) + 1;
    return '@' + BLOCK + '_' + blockType + '_' + num + '@';
}

export function GetRegexToMatchBlock(blockType?: BlockType): RegExp {
    let blockRegex = blockType || "[A-Z]+";
    return new RegExp("@" + BLOCK + "_" + blockRegex + "_\\d+@");
}

export function GetRegexToFindAllBlocks(): RegExp {
    return new RegExp("@" + BLOCK + "_" + "[A-Z]+" + "_\\d+@", "g");
}

export function GetRegexToFindSpecificBlocks(types: BlockType[]): RegExp {
    let blockRegex = "(" + types.join('|') + ")";
    return new RegExp("@" + BLOCK + "_" + blockRegex + "_\\d+@", "g");
}

export function GetRegexToExactMatchBlock(blockType?: BlockType): RegExp {
    let blockRegex = blockType || "[A-Z]+";
    return new RegExp("^@" + BLOCK + "_" + blockRegex + "_\\d+@$");
}

export function GetRegexToMatchBlockInBeginning(blockType?: BlockType): RegExp {
    let blockRegex = blockType || "[A-Z]+";
    return new RegExp("^@" + BLOCK + "_" + blockRegex + "_\\d+@");
}

export function IsBlockID(str, blockType?: BlockType): boolean {
    if (!_.isString(str)) return false;
    return !!str.match(GetRegexToExactMatchBlock(blockType));
}

export function IsCommentBlockID(str): boolean {
    return IsBlockID(str, Blocks.BLCOMMENT) || IsBlockID(str, Blocks.INCOMMENT);
}

export function getRegexToMatchVarName(): string {
    return "[_\\$A-Za-z][_\\$\\w]*";
}

export function IsVarName(str): boolean {
    return _.isString(str) && !!(str.match(/^[_\$A-Za-z][_\$\w]*$/));
}


export function GetLastMatchedPosition(str: string, regex: RegExp): number {
    if (regex.flags.indexOf('g') === -1) {
        throw new Error('must pass regex with global flag');
    }
    let match = regex.exec(str), nextMatch;
    if (!match) return -1;
    while (nextMatch = regex.exec(str)) {
        match = nextMatch;
    }
    return match.index;
}

export function EscapeDollar(str: string): string {
    let ans = '';
    for (var i = 0; i < str.length; i++) {
        ans += str[i] == '$' ? '$$' : str[i];
    }
    return ans;
}

export function computeMatchingBraces(
    code: string,
    openChar: '{' | '[' | '(',
    closeChar: '}' | ']' | ')'
): {[position: number]: number} {
    let matches = {}, opens = [];
    for (let i = 0; i < code.length; i++) {
        if (code[i] == openChar) {
            opens.push(i);
        } else if (code[i] == closeChar) {
            var open = opens.pop();
            matches[open] = i;
            matches[i] = open;
        }
    }
    return matches;
}

export function minifyCommentsRegexAndStrings(
    code: string
): {
    code: string,
    table: {[blockID: string]: BlockBase}
} {

    let index = 0;
    let ans = '';
    let map = {};
    while (index < code.length) {
        var ch = code[index];
        if (ch === '/') {
            // It can either be a regex, inline comment or block comment start.
            if (code[index + 1] == '/') {
                let end = code.indexOf('\n', index);
                if (end === -1) {
                    end = code.length - 1;
                }
                let block =
                    new SimpleCodeBlock({
                        type: Blocks.INCOMMENT,
                        code: code.slice(index, end + 1)
                    });
                ans += block.id;
                map[block.id] = block;
                index = end + 1;
            } else if (code[index + 1] == '*') {
                let end = code.indexOf('*/', index + 1) + 1;
                let block =
                    new SimpleCodeBlock({
                        type: Blocks.BLCOMMENT,
                        code: code.slice(index, end + 1)
                    });
                ans += block.id;
                map[block.id] = block;
                index = end + 1;
            } else {
                let lastNonWhitespaceChart = ans.match(/([^\s]?)\s*$/)[1];
                if (lastNonWhitespaceChart == ')') {
                    throw new Error('not implemented');
                } else if (lastNonWhitespaceChart.match(/[_\w]/)) {
                    // definitely division operation
                    ans += ch;
                    index++;
                } else {
                    // definitely regex
                    // find next non-escaped /
                    let start = index;
                    index = code.indexOf(ch, index + 1);
                    while (code.slice(0, index).match(/[\\]*$/)[0].length % 2 == 1) {
                        index = code.indexOf(ch, index + 1);
                    }

                    let end = index;
                    let block =
                        new SimpleCodeBlock({
                            type: Blocks.REGEX,
                            code: code.slice(start, end + 1)
                        });
                    ans += block.id;
                    map[block.id] = block;
                    index = end + 1;
                }
            }
        } else if (ch === "'" || ch === '"') {
            let start = index;
            index = code.indexOf(ch, index + 1);
            while (code.slice(0, index).match(/[\\]*$/)[0].length % 2 == 1) {
                index = code.indexOf(ch, index + 1);
            }
            let end = index;
            let block =
                new SimpleCodeBlock({
                    type: Blocks.STRING,
                    code: code.slice(start, end + 1)
                });
            ans += block.id;
            map[block.id] = block;
            index = end + 1;
        } else {
            ans += ch;
            index++;
        }
    }

    return {
        code: ans,
        table: map
    };
}

export function minifyBrackets(
    code: string
): {
    code: string,
    table: {[blockID: string]: BlockBase}
} {
    let opens = '({[', closes = ')}]';
    let bracketToType = {
        '(': Blocks.ROUNDBLOCK,
        '{': Blocks.CURLYBLOCK,
        '[': Blocks.SQUAREBLOCK
    };
    let matching = {};
    for (let i = 0; i < 3; i++) {
        let matches = computeMatchingBraces(code, opens[i] as any, closes[i] as any);
        _.forEach(matches, (val, key) => {
            matching[key] = val;
        });
    }
    let index = 0;
    let ans = '';
    let map = {};
    while (index < code.length) {
        var ch = code[index];
        if (!!matching[index]) {
            let closePos = matching[index];
            let res = minifyBrackets(code.slice(index + 1, closePos));
            let block = new SimpleCodeBlock({type: bracketToType[ch], code: res.code});
            _.forEach(res.table, (val, key) => {
                map[key] = val;
            });
            map[block.id] = block;
            ans += block.id;
            index = closePos + 1;
        } else {
            ans += ch;
            index++;
        }
    }

    return {
        code: ans,
        table: map
    };
}

export function combineBlocksWithHeaders(
    code: string
): {
    code: string,
    table: {[blockID: string]: BlockBase}
} {
    let index = 0;
    let ans = '';
    let map = {};
    while (index < code.length) {
        let ch = code[index];
        if (ch.match(/\s/)) {
            ans += ch;
            index++;
            continue;
        }
        let str = code.slice(index);
        let match;
        match = str.match(GetRegexToMatchBlockInBeginning(Blocks.CURLYBLOCK));
        if (match) {
            let objBlock = new BlockWithBody({
                type: Blocks.OBJECT,
                bodyID: match[0]
            });
            ans += objBlock.id;
            map[objBlock.id] = objBlock;
            index += match[0].length;
            continue;
        }
        // HACK fix it,
        match = str.match(/^(if|else\s+if|else|for|while|switch|function)\b/);
        if (match) {
            let headerID = '', bodyID, functionName;
            str = str.replace(/^(if|else\s+if|else|for|while|switch|function)\s*/, '');
            let keyword = match[1];

            if (keyword == 'function') {
                let funcNameMatch = str.match(new RegExp(
                    "^(" + getRegexToMatchVarName() + ")\\s*"
                ));
                if (funcNameMatch && !IsBlockID(funcNameMatch[1])) {

                    functionName = funcNameMatch[1];
                    str = str.slice(funcNameMatch[0].length);
                }
            }
            if (keyword != 'else') {
                let roundMatch = str.match(GetRegexToMatchBlockInBeginning(Blocks.ROUNDBLOCK));
                if (!roundMatch) {
                    throw new Error('invalid code 1');
                }

                headerID = roundMatch[0];
                str = str.slice(roundMatch[0].length);
                str = str.replace(/^\s*/, '');
            }
            let curlyMatch = str.match(GetRegexToMatchBlockInBeginning(Blocks.CURLYBLOCK));
            if (!curlyMatch) {
                throw new Error('Expecting a curly block after ' +  keyword);
            }
            bodyID = curlyMatch[0];
            str = str.slice(curlyMatch[0].length);

            let type = keyword.match(/else\s+if/) ? Blocks.ELIF : keyword.toUpperCase(),
                block;
            if (type === Blocks.FUNCTION) {
                block = new FunctionBlock({
                    type: type,
                    headerID: headerID,
                    bodyID: bodyID,
                    functionName: functionName
                });
            } else if (type === Blocks.ELSE) {
                block = new BlockWithBody({
                    type: type,
                    bodyID: bodyID
                });
            } else {
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
                if (index == code.length) break;
                ch = code[index];
            }
        } else {
            ans += ch;
            index++;
        }


    }

    return {
        code: ans,
        table: map
    };
}

export function getNextInstruction(
    code: string
): {
    instruction: string|null,
    remain?: string
}|null {
    code = code.replace(/^\s*/, '');
    if (!code) {
        return null;
    }
    let regex = GetRegexToMatchBlockInBeginning();
    let match = code.match(regex);
    if (!!match) {
        return {
            instruction: match[0],
            remain: code.replace(GetRegexToMatchBlockInBeginning(), '').replace(/^\s*;/, '')
        };
    }
    let end = code.indexOf(';');
    if (end === -1) {
        throw new Error('instruction not ending with semicolon');
    }
    return {
        instruction: code.slice(0, end).trim(),
        remain: code.slice(end + 1)
    };
}

export function processCode(
    code: string
): {
    code: string,
    table: {[blockID: string]: BlockBase}
} {
    let res = minifyCommentsRegexAndStrings(code);
    let table = res.table;
    res = minifyBrackets(res.code);
    table = _.merge(table, res.table);
    res = combineBlocksWithHeaders(res.code);
    table = _.merge(table, res.table);

    _.forEach(table, (val, key) => {
        if (IsBlockID(key, Blocks.ROUNDBLOCK) ||
            IsBlockID(key, Blocks.CURLYBLOCK) ||
            IsBlockID(key, Blocks.SQUAREBLOCK)) {
            let simpleCodeBlock = (val as SimpleCodeBlock);
            let res = combineBlocksWithHeaders(simpleCodeBlock.code);
            simpleCodeBlock.code = res.code;
            table = _.merge(table, res.table);
        }
    });

    return {
        code: res.code,
        table: table
    };
}

export function extractBlockIDs(
    code: string,
    specificBlockTypes?: BlockType[]
): string[] {
    let regex = specificBlockTypes === void 0
        ? GetRegexToFindAllBlocks()
        : GetRegexToFindSpecificBlocks(specificBlockTypes);
    let match = regex.exec(code);
    let ret = [];
    while (match != null) {
        ret.push(match[0]);
        match = regex.exec(code);
    }
    return ret;
}

export function expandCodeRecursive(
    code: string,
    table: {[blockID: string]: BlockBase},
    specificBlockTypes?: BlockType[]
): string {
    let blockIDs = extractBlockIDs(code, specificBlockTypes);
    while (blockIDs.length > 0) {
        blockIDs.forEach((id) => {
            let node = table[id];
            code = code.replace(new RegExp(id), expandBlock(node));
        });
        blockIDs = extractBlockIDs(code, specificBlockTypes);
    }

    return code;
}

export function expandBlock(node: BlockBase): string {
    let replaceText = '';
    switch (node.type) {
        case Blocks.FUNCTION:
            let funcNode = node as FunctionBlock;
            replaceText = expandFunctionBlock(funcNode);
            break;
        case Blocks.ELSE:
            let elseBlock = node as BlockWithBody;
            replaceText = `else ${elseBlock.bodyID}`;
            break;
        case Blocks.IF:
        case Blocks.ELIF:
        case Blocks.SWITCH:
        case Blocks.FOR:
        case Blocks.WHILE:
            let switchNode = node as BlockWithHeaderAndBody;
            let keyword = node.type === Blocks.ELIF ? 'else if' : node.type.toLowerCase();
            replaceText =
                `${keyword} ${switchNode.headerID} ${switchNode.bodyID}`;
            break;
        case Blocks.OBJECT:
            let objNode = node as BlockWithBody;
            replaceText = objNode.bodyID;
            break;
        case Blocks.INCOMMENT:
            let inCommentBlock = node as SimpleCodeBlock;
            replaceText = inCommentBlock.code;
            break;
        case Blocks.BLCOMMENT:
            let blCommentBlock = node as SimpleCodeBlock;
            replaceText = blCommentBlock.code;
            break;
        case Blocks.CTOR:
            let ctorBlock = node as BlockWithHeaderAndBody;
            replaceText = expandCtorBlock(ctorBlock);
            break;
        case Blocks.CLASS:
            let classNode = node as ClassBlock;
            replaceText = expandClassBlock(classNode);
            break;
        case Blocks.ROUNDBLOCK:
            let roundBlock = node as SimpleCodeBlock;
            replaceText = '(' + roundBlock.code + ')';
            break;
        case Blocks.CURLYBLOCK:
            let curlyBlock = node as SimpleCodeBlock;
            replaceText = '{ ' + curlyBlock.code + ' }';
            break;
        case Blocks.SQUAREBLOCK:
            let sqBlock = node as SimpleCodeBlock;
            replaceText = '[' + sqBlock.code + ']';
            break;
        case Blocks.REGEX:
            let regexBlock = node as SimpleCodeBlock;
            replaceText = regexBlock.code;
            break;
        case Blocks.STRING:
            let strBlock = node as SimpleCodeBlock;
            replaceText = strBlock.code;
            break;
        case Blocks.CLASSMETHOD:
            let classMethodBlock = node as ClassMethodBlock;
            replaceText = expandClassMethodBlock(classMethodBlock);
            break;
        case Blocks.CLASSPROP:
            let classPropBlock = node as ClassPropBlock;
            replaceText = expandClassPropBlock(classPropBlock);
            break;
        default:
            throw new Error('block type not handled in expandBlock()');
    }

    return replaceText;
}

export function expandClassBlock(node: ClassBlock): string {
    let methods = '';
    if (node.methods.length > 0) {
        methods = node.methods.join('\n') + '\n';
    }
    let vars = node.vars.join('\n');

    let ans = `class ${node.className}`;
    if (node.parentClassName) {
        ans += ` extends ${node.parentClassName}`;
    }
    return `${ans} {\n${vars}\n${node.ctor}\n ${methods}}`;
}

export function expandCtorBlock(node: BlockWithHeaderAndBody): string {
    let docs = '';
    if (node.docs.length > 0) {
        docs = node.docs.join('');
        if (IsBlockID(node.docs[node.docs.length - 1], Blocks.BLCOMMENT)) {
            docs += '\n';
        }
    }
    return `${docs}constructor ${node.headerID} ${node.bodyID}`;
}

export function expandClassMethodBlock(block: ClassMethodBlock): string {
    let ans = '';
    if (block.docs.length > 0) {
        ans += block.docs.join('');
        if (IsBlockID(block.docs[block.docs.length - 1], Blocks.BLCOMMENT)) {
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

export function expandClassPropBlock(block: ClassPropBlock): string {
    let ans = '';
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

export function expandFunctionBlock(funcNode: FunctionBlock) {
    let prefix = '';
    if (funcNode.functionName) {
        prefix += '\n';
    }
    if (funcNode.docs.length > 0) {
        let docs = funcNode.docs.join('');
        if (IsBlockID(funcNode.docs[funcNode.docs.length - 1], Blocks.BLCOMMENT)) {
            docs += '\n';
        }
        prefix += docs;
    }
    return `${prefix}function ${funcNode.functionName || ''} ${funcNode.headerID} ${funcNode.bodyID}`;
}

