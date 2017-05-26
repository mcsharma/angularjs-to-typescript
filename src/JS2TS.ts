import * as _ from 'lodash';
import {
    Blocks, BlockBase, processCode, getNextInstruction, IsCommentBlockID,
    IsBlockID, FunctionBlock, GetRegexToMatchBlock, SimpleCodeBlock, IsVarName, expandCodeRecursive,
    EscapeDollar, expandBlock, ClassMethodBlock, ClassPropBlock, BlockWithHeaderAndBody, ClassBlock
} from './util';

// TODOs
/**
 * 1. Handle comments b/w variable definitions.
 * 2. Handle var a = b = c;
 * 3. Fix hack in function/if/else detection.
 * 4. Move class declaration downwards.
 */
class JS2TS {

    private static NodeTypesWithSameScopeAsParent = [
        Blocks.CURLYBLOCK, Blocks.ROUNDBLOCK, Blocks.SQUAREBLOCK,
        Blocks.IF, Blocks.ELSE, Blocks.SWITCH,
        Blocks.FOR, Blocks.WHILE // todo: object too?
    ];

    private nodeIdToNode: {[key: string]: BlockBase} = {};
    private functionPlaceholderToObjMap: {[blockID: string]: any} = {};

    constructor(
        private moduleName: string,
        private exportRegex: RegExp,
        private groupIndex: number
    ) {
    }

    public run(input: string) {

        let ret = processCode(input);
        this.nodeIdToNode = ret.table;

        let code = ret.code, codeCopy = code;
        let split;
        let scope: any = {};
        let order = [];
        let exportedToken;
        let inheritance: {[derivedClass: string]: string} = {};

        // process all the functions first. So that they are available in the scope since the
        // beginning
        while (split = getNextInstruction(codeCopy)) {
            let str = split.instruction;
            codeCopy = split.remain;
            // function foo() {..}
            if (IsBlockID(str, Blocks.FUNCTION)) {
                scope[(this.nodeIdToNode[str] as FunctionBlock).functionName] = str;
            }
        }


        let currentCommentList: string[] = [],
            lastCommentList: string[] = [];

        while (split = getNextInstruction(code)) {
            let str = split.instruction;
            code = split.remain;

            // Inline or block comment
            if (IsCommentBlockID(str)) {
                currentCommentList.push(str);
                continue;
            }

            lastCommentList = currentCommentList;
            currentCommentList = [];

            // var x = 1, y = function () {..} ...;
            if (str.match(/^var\s+/)) {
                let decls = str.replace(/var\s+/, '').split(',').map((decl) => {
                    return decl.trim();
                });
                decls.forEach((decl) => {
                    let nameAndVal = decl.split('=').map((token) => {
                        return token.trim();
                    });
                    scope[nameAndVal[0]] = this.expandObject(nameAndVal[1]);
                    if (IsBlockID(nameAndVal[1], Blocks.FUNCTION)) {
                        (this.nodeIdToNode[nameAndVal[1]] as FunctionBlock)
                            .functionName = nameAndVal[0];
                        this.nodeIdToNode[nameAndVal[1]].docs = lastCommentList;
                    }
                    order.push(nameAndVal[0]);
                });
                continue;
            }

            // function foo() {..}
            if (IsBlockID(str, Blocks.FUNCTION)) {
                let funcBlock = this.nodeIdToNode[str] as FunctionBlock;
                funcBlock.docs = lastCommentList;
                scope[funcBlock.functionName] = str;
                order.push(funcBlock.functionName);
                continue;
            }

            // setting object properties.
            // Foo.bar.x.y = c;
            let match = (/^([\$_\w]+(\.[\$_\w]+)*)\s*=\s*([^;]+)$/).exec(str);
            if (match) {
                var left = match[1],
                    right = match[3];
                this.setObjectProps(scope, left, right, lastCommentList);
                continue;
            }

            // module.exports = ... or return ...
            match = this.exportRegex.exec(str);
            if (match) {
                exportedToken = match[this.groupIndex];
                continue;
            }

            // Inheritance:
            //   util.inherits(Derived, Base); OR
            //   angular.extend(Derived.prototype, Base.prototype);
            match = str.match(new RegExp(
                "^(util\\.inherits|angular\\.extend)\\s*(" +
                GetRegexToMatchBlock(Blocks.ROUNDBLOCK).source + ")$"
            ));
            if (match) {
                let isAngularExtend = match[1] === 'angular.extend';
                let roundBlock = this.nodeIdToNode[match[2]] as SimpleCodeBlock;
                let params = roundBlock.code.split(',').map(param => param.trim());
                if (params.length !== 2) {
                    throw new Error('Unhandled way of defining inheritance!');
                }
                if (isAngularExtend) {
                    params = params.map((param) => {
                        return param.replace(/\.prototype$/, '');
                    });
                }
                if (!scope[params[0]]) {
                    throw new Error('Undefined Variable ' + params[0]);
                }
                inheritance[params[0]] = params[1];
                continue;
            }

            //         console.log('unhandled instruction: ', str);
        }

        _.forEach(scope, (val, name) => {
            if (this.IsFunctionUsedAsClass(val)) {
                scope[name] = this.ConvertToClassBlock(val, name, inheritance[name]);
            }
        });

        if (!exportedToken) {
            throw new Error('Could not find any export/return instructions, is this module not exporting anything?');
        }

        let exported: {[name: string]: boolean} = {};
        let annotations: {[name: string]: string} = {};
        let renames: {[obj: string]: {[prop: string]: string}} = {};
        let provideFactory = '';
        if (exportedToken) {
            if (IsVarName(exportedToken)) {
                if (IsBlockID(scope[exportedToken], Blocks.FUNCTION)) {
                    exported[exportedToken] = true;
                    provideFactory = `Provide('${this.moduleName}')(${exportedToken});`;
                } else if (IsBlockID(scope[exportedToken], Blocks.CLASS)) {
                    exported[exportedToken] = true;
                    annotations[exportedToken] = `@Provide('${this.moduleName}')`;
                } else if (_.isObject(scope[exportedToken])) {
                    let allKeys = Object.keys(scope[exportedToken]).join(',\n');
                    provideFactory = `Provide('${this.moduleName}')({\n${allKeys}\n});`;
                    for (let k in scope[exportedToken]) {
                        let val = scope[exportedToken][k];
                        if (IsVarName(val)) {
                            exported[val] = true;
                            renames[exportedToken] = renames[exportedToken] || {};
                            renames[exportedToken][k] = val;
                        } else if (IsBlockID(val, Blocks.FUNCTION)) {
                            if (this.IsFunctionUsedAsClass(val)) {
                                val = this.ConvertToClassBlock(val, k, null);
                            }
                            scope[k] = val;
                            order.push(k);
                            exported[k] = true;
                            (this.nodeIdToNode[val] as FunctionBlock).functionName = k;
                            renames[exportedToken] = renames[exportedToken] || {};
                            renames[exportedToken][k] = k;
                        } else {
                            scope[k] = val;
                            order.push(k);
                            exported[k] = true;
                        }
                    }
                    delete scope[exportedToken];
                    _.pull(order, exportedToken);
                } else {
                    throw new Error('Returning a variable that is neither class/function nor object is not' +
                        'yet supported!');
                }
            } else if (IsBlockID(exportedToken, Blocks.FUNCTION)) {
                if (this.IsFunctionUsedAsClass(exportedToken)) {
                    exportedToken = this.ConvertToClassBlock(exportedToken, this.moduleName, null);
                    annotations[this.moduleName] = `@Provide('${this.moduleName}')`;
                } else {
                    (this.nodeIdToNode[exportedToken] as FunctionBlock).functionName =
                        this.moduleName;
                    provideFactory = `Provide('${this.moduleName}')(${this.moduleName});`;
                }
                scope[this.moduleName] = exportedToken;
                order.push(this.moduleName);
                exported[this.moduleName] = true;
            } else if (IsBlockID(exportedToken, Blocks.OBJECT)) {
                let returnedObj = this.expandObject(exportedToken);
                let allKeys = Object.keys(returnedObj).join(',\n');
                provideFactory = `Provide('${this.moduleName}')({\n${allKeys}\n});`;
                for (let k in returnedObj) {
                    let val = returnedObj[k];
                    if (IsVarName(val)) {
                        exported[val] = true;
                    } else if (IsBlockID(val, Blocks.FUNCTION)) {
                        if (this.IsFunctionUsedAsClass(val)) {
                            val = this.ConvertToClassBlock(val, k, null);
                        }
                        scope[k] = val;
                        order.push(k);
                        exported[k] = true;
                        (this.nodeIdToNode[val] as FunctionBlock).functionName = k;
                    } else {
                        scope[k] = val;
                        order.push(k);
                        exported[k] = true;
                    }
                }
            }
        }

        let output = '';

        // Define all the variables first and then classes and functions.
        order.sort((name1, name2) => {
            let is1Func = IsBlockID(scope[name1], Blocks.CLASS) ||
                IsBlockID(scope[name1], Blocks.FUNCTION);
            let is2Func = IsBlockID(scope[name2], Blocks.CLASS) ||
                IsBlockID(scope[name2], Blocks.FUNCTION);
            return is1Func && !is2Func ? 1 : -1;
        }).forEach((name) => {
            if (IsBlockID(scope[name], Blocks.CLASS)) {
                output += '\n';
                if (annotations[name]) {
                    output += annotations[name] + '\n';
                }
                output += scope[name] + '\n';
            } else if (IsBlockID(scope[name], Blocks.FUNCTION)) {
                output += scope[name] + '\n';
            } else {
                output += 'let ' + name + ' = ' + JS2TS.serializeObject(scope[name]) + ';\n';
            }
        });

        if (Object.keys(exported).length > 0) {
            let exports = 'export {\n' + Object.keys(exported).join(',\n') + '\n}\n';
            output += '\n' + exports;
        }

        output += '\n' + provideFactory;

        // TODO expand all except strings and regex first before performing renames.
        output = expandCodeRecursive(output, this.nodeIdToNode) + '\n';

        for (let objName in renames) {
            let objNameDollarEscaped = objName.replace(/\$/g, '\\$');
            for (let from in renames[objName]) {
                let fromDollarEscaped = from.replace(/\$/g, '\\$');
                let fromRegex = new RegExp(
                    objNameDollarEscaped + "\\s*\\.\\s*" + fromDollarEscaped,
                    'gm'
                );
                let to = EscapeDollar(renames[objName][from]);
                output = output.replace(fromRegex, to);
            }
        }
        return output;

    }

    private expandObject(nodeId) {
        if (!IsBlockID(nodeId, Blocks.OBJECT)) {
            return nodeId;
        }
        var objectCode = (this.nodeIdToNode[expandBlock(this.nodeIdToNode[nodeId])] as SimpleCodeBlock).code;
        var pairs = objectCode.split(',').map((token) => token.trim()).filter((token) => !!token);
        var obj = {};
        pairs.forEach((pair) => {
            var key = pair.replace(/^([^:]+)\s*:([^,]+)$/gm, "$1");
            var val = pair.replace(/^([^:]+)\s*:([^,]+)$/gm, "$2").trim();
            obj[key] = this.expandObject(val);
        });
        return obj;
    }

    private static serializeObject(obj) {
        if (!_.isObject(obj)) {
            return obj;
        }
        var ret = "{\n";
        for (var k in obj) {
            ret += k + ": " + JS2TS.serializeObject(obj[k]) + ",\n";
        }

        ret = ret.replace(/,\n$/, '');
        ret = ret + "}";
        return ret;
    }

    private setObjectProps(scope, props: string, val: string, lastCommentList: string[]) {
        val = this.expandObject(val);
        // TODO: Maybe do it for all types instead of just function.
        if (IsBlockID(val, Blocks.FUNCTION)) {
            this.nodeIdToNode[val].docs = lastCommentList;
        }
        let curObj = scope;
        let propsList = props.split('.');
        propsList.forEach((prop, index) => {
            if (index == propsList.length - 1) {
                curObj[prop] = val;
                return;
            }
            if (!curObj[prop]) throw new Error('Accessing an object that is not present in scope!');
            curObj = curObj[prop];
            if (_.isString(curObj)) {
                if (!IsBlockID(curObj, Blocks.FUNCTION)) {
                    throw new Error('setting key on something that is neither an object nor function');
                }
                if (!this.functionPlaceholderToObjMap[curObj]) {
                    this.functionPlaceholderToObjMap[curObj] = {prototype: {}};
                }
                curObj = this.functionPlaceholderToObjMap[curObj];
            }
        });
    }

    /**
     * Consider being used as class if one of the following is true.
     * 1. A function is being set to it's prototype.
     * 2. Some variable is being set to 'this' inside it's implementation.
     *
     * @param blockID
     * @returns {boolean}
     * @constructor
     */
    private IsFunctionUsedAsClass(blockID: string): boolean {
        if (!IsBlockID(blockID, Blocks.FUNCTION)) {
            return false;
        }

        let node = this.nodeIdToNode[blockID] as FunctionBlock;

        let settingPropToThis = !!(this.nodeIdToNode[node.bodyID] as SimpleCodeBlock).code.match(/this\.([_\w]+)\s*=/);
        if (settingPropToThis) {
            return true;
        }

        return this.functionPlaceholderToObjMap[blockID] && !!this.functionPlaceholderToObjMap[blockID].prototype &&
            Object.keys(this.functionPlaceholderToObjMap[blockID].prototype).length > 0;
    }

    private ConvertToClassBlock(
        blockID: string,
        className: string,
        parentClassName: string|undefined
    ): string {
        if (!IsBlockID(blockID, Blocks.FUNCTION)) {
            throw new Error('Must be a function block');
        }

        let funcBlock = this.nodeIdToNode[blockID] as FunctionBlock;

        let instanceMethodIDs = [], instanceVarIDs = [];
        this.functionPlaceholderToObjMap[blockID] =
            this.functionPlaceholderToObjMap[blockID] || {prototype: {}};
        _.forEach(this.functionPlaceholderToObjMap[blockID].prototype, (val: string, key: string) => {
            if (!_.isString(val)) {
                throw new Error('Setting an object on a key of prototype? thats not supported yet');
            }
            if (this.nodeIdToNode[val] instanceof FunctionBlock) {
                let methodNode = this.nodeIdToNode[val] as FunctionBlock;
                let cmb = new ClassMethodBlock({
                    type: Blocks.CLASSMETHOD,
                    accessType: 'public_',
                    isStatic: false,
                    name: key,
                    headerID: methodNode.headerID,
                    bodyID: methodNode.bodyID,
                    docs: methodNode.docs
                });
                this.nodeIdToNode[cmb.id] = cmb;
                instanceMethodIDs.push(cmb.id);
            } else {
                let cpb = new ClassPropBlock({
                    type: Blocks.CLASSPROP,
                    accessType: 'public_',
                    isStatic: false,
                    name: key,
                    code: val
                });
                this.nodeIdToNode[cpb.id] = cpb;
                instanceVarIDs.push(cpb.id);
            }
        });
        let staticMethodIDs = [], staticVarIDs = [];
        _.forEach(this.functionPlaceholderToObjMap[blockID], (val, key) => {
            if (key === 'prototype') {
                return;
            }
            if (_.isString(val) && (this.nodeIdToNode[val] instanceof FunctionBlock)) {
                let methodNode = this.nodeIdToNode[val] as FunctionBlock;
                let cmb = new ClassMethodBlock({
                    type: Blocks.CLASSMETHOD,
                    accessType: 'public_',
                    isStatic: true,
                    name: key,
                    headerID: methodNode.headerID,
                    bodyID: methodNode.bodyID,
                    docs: methodNode.docs
                });
                this.nodeIdToNode[cmb.id] = cmb;
                staticMethodIDs.push(cmb.id);
            } else {
                let cpb = new ClassPropBlock({
                    type: Blocks.CLASSPROP,
                    accessType: 'public_',
                    isStatic: true,
                    name: key,
                    code: JS2TS.serializeObject(val)
                });
                this.nodeIdToNode[cpb.id] = cpb;
                staticVarIDs.push(cpb.id);
            }
        });

        let methodIDs = staticMethodIDs.concat(instanceMethodIDs);

        let ctorBlock = new BlockWithHeaderAndBody({
            type: Blocks.CTOR,
            headerID: funcBlock.headerID,
            bodyID: funcBlock.bodyID,
            docs: funcBlock.docs
        });
        this.nodeIdToNode[ctorBlock.id] = ctorBlock;

        this.updateSuperCall(ctorBlock);

        let instanceVars = this.extractInstanceVars([ctorBlock.id].concat(instanceMethodIDs));
        for (let varName in instanceVars) {
            let cpb = new ClassPropBlock({
                type: Blocks.CLASSPROP,
                accessType: 'public_',
                isStatic: false,
                name: varName,
            });
            this.nodeIdToNode[cpb.id] = cpb;
            instanceVarIDs.push(cpb.id);
        }

        let varIDs = staticVarIDs.concat(instanceVarIDs);

        let classBlock = new ClassBlock({
            type: Blocks.CLASS,
            className: className,
            parentClassName: parentClassName,
            ctor: ctorBlock.id,
            methods: methodIDs,
            vars: varIDs
        });
        this.nodeIdToNode[classBlock.id] = classBlock;

        return classBlock.id;
    }

    private updateSuperCall(ctor: BlockWithHeaderAndBody): void {
        let regex = new RegExp(
            "[_\\w]+\\.__super\\.call\\s*(" + GetRegexToMatchBlock(Blocks.ROUNDBLOCK).source + ")\\s*;"
        );
        let ctorBody = this.nodeIdToNode[ctor.bodyID] as SimpleCodeBlock;
        let match = ctorBody.code.match(regex);
        if (!match) {
            return;
        }
        ctorBody.code = ctorBody.code.replace(regex, 'super$1;');
        let paramsBlock = this.nodeIdToNode[match[1]] as SimpleCodeBlock;
        paramsBlock.code = paramsBlock.code.replace(/^\s*this\s*,/, '');
    }

    private extractInstanceVars(instanceBlockIDs: string[]): {[name: string]: number} {
        let ret = {};
        instanceBlockIDs.forEach((blockID) => {
            let methodBodyID = (this.nodeIdToNode[blockID] as BlockWithHeaderAndBody).bodyID;
            let res = this.extractInstanceVarsForCode(
                (this.nodeIdToNode[methodBodyID] as SimpleCodeBlock).code
            );
            for (let k in res) {
                ret[k] = 1;
            }
        });
        return ret;
    }

    private extractInstanceVarsForCode(code: string): {[name: string]: number} {
        let expandedCode = expandCodeRecursive(
            code, this.nodeIdToNode,
            JS2TS.NodeTypesWithSameScopeAsParent
        );
        var regex = /this\.([_\w]+)\s*=/g;
        var match = regex.exec(expandedCode);
        let ret = {};
        while (match != null) {
            ret[match[1]] = 1;
            match = regex.exec(expandedCode);
        }
        return ret;
    }
}

export = JS2TS;
