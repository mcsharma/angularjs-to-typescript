"use strict";
var _ = require("lodash");
var util_1 = require("./util");
var JS2TS = (function () {
    function JS2TS(moduleName, exportRegex, groupIndex) {
        this.moduleName = moduleName;
        this.exportRegex = exportRegex;
        this.groupIndex = groupIndex;
        this.nodeIdToNode = {};
        this.functionPlaceholderToObjMap = {};
    }
    JS2TS.prototype.run = function (input) {
        var _this = this;
        var ret = util_1.processCode(input);
        this.nodeIdToNode = ret.table;
        var code = ret.code, codeCopy = code;
        var split;
        var scope = {};
        var exportedToken;
        var inheritance = {};
        while (split = util_1.getNextInstruction(codeCopy)) {
            var str = split.instruction;
            codeCopy = split.remain;
            if (util_1.IsBlockID(str, util_1.Blocks.FUNCTION)) {
                scope[this.nodeIdToNode[str].functionName] = str;
            }
        }
        var currentCommentList = [], lastCommentList = [];
        var order = 0, orderMap = {}, keysOrder = {};
        while (split = util_1.getNextInstruction(code)) {
            var str = split.instruction;
            code = split.remain;
            if (util_1.IsCommentBlockID(str)) {
                currentCommentList.push(str);
                continue;
            }
            lastCommentList = currentCommentList;
            currentCommentList = [];
            if (str.match(/^var\s+/)) {
                var decls = str.replace(/var\s+/, '').split(',').map(function (decl) {
                    return decl.trim();
                });
                decls.forEach(function (decl) {
                    var nameAndVal = decl.split('=').map(function (token) {
                        return token.trim();
                    });
                    scope[nameAndVal[0]] = _this.expandObject(nameAndVal[1]);
                    if (util_1.IsBlockID(nameAndVal[1], util_1.Blocks.FUNCTION)) {
                        _this.nodeIdToNode[nameAndVal[1]]
                            .functionName = nameAndVal[0];
                        _this.nodeIdToNode[nameAndVal[1]].docs = lastCommentList;
                    }
                    orderMap[nameAndVal[0]] = util_1.IsBlockID(nameAndVal[1], util_1.Blocks.FUNCTION)
                        ? Number.POSITIVE_INFINITY
                        : order + 1;
                    order++;
                });
                continue;
            }
            if (util_1.IsBlockID(str, util_1.Blocks.FUNCTION)) {
                var funcBlock = this.nodeIdToNode[str];
                funcBlock.docs = lastCommentList;
                scope[funcBlock.functionName] = str;
                orderMap[funcBlock.functionName] = Number.POSITIVE_INFINITY;
                continue;
            }
            var match = (/^([\$_\w]+(\.[\$_\w]+)*)\s*=\s*([^;]+)$/).exec(str);
            if (match) {
                var left = match[1], right = match[3];
                this.setObjectProps(scope, left, right, lastCommentList);
                if (left.indexOf('.') === -1) {
                    orderMap[left] = order++;
                }
                else {
                    keysOrder[left] = order++;
                }
                continue;
            }
            match = this.exportRegex.exec(str);
            if (match) {
                exportedToken = match[this.groupIndex];
                continue;
            }
            match = str.match(new RegExp("^(util\\.inherits|angular\\.extend)\\s*(" +
                util_1.GetRegexToMatchBlock(util_1.Blocks.ROUNDBLOCK).source + ")$"));
            if (match) {
                var isAngularExtend = match[1] === 'angular.extend';
                var roundBlock = this.nodeIdToNode[match[2]];
                var params = roundBlock.code.split(',').map(function (param) { return param.trim(); });
                if (params.length !== 2) {
                    throw new Error('Unhandled way of defining inheritance!');
                }
                if (isAngularExtend) {
                    params = params.map(function (param) {
                        return param.replace(/\.prototype$/, '');
                    });
                }
                if (!scope[params[0]]) {
                    throw new Error('Undefined Variable ' + params[0]);
                }
                inheritance[params[0]] = params[1];
                continue;
            }
            console.error('unhandled code found: \n' + util_1.expandCodeRecursive(str, this.nodeIdToNode));
            console.error('Exiting!');
            return -1;
        }
        _.forEach(scope, function (val, name) {
            if (_this.IsFunctionUsedAsClass(val)) {
                scope[name] = _this.ConvertToClassBlock(val, name, inheritance[name]);
            }
        });
        if (!exportedToken) {
            throw new Error('Could not find any export/return instructions, is this module not exporting anything?');
        }
        var exported = {};
        var annotations = {};
        var renames = {};
        var provideFactory = '';
        if (exportedToken) {
            if (util_1.IsVarName(exportedToken)) {
                if (util_1.IsBlockID(scope[exportedToken], util_1.Blocks.FUNCTION)) {
                    exported[exportedToken] = true;
                    provideFactory = "Provide('" + this.moduleName + "')(" + exportedToken + ");";
                }
                else if (util_1.IsBlockID(scope[exportedToken], util_1.Blocks.CLASS)) {
                    exported[exportedToken] = true;
                    annotations[exportedToken] = "@Provide('" + this.moduleName + "')";
                }
                else if (_.isObject(scope[exportedToken])) {
                    var allKeys = Object.keys(scope[exportedToken]).join(',\n');
                    provideFactory = "Provide('" + this.moduleName + "')({\n" + allKeys + "\n});";
                    for (var k in scope[exportedToken]) {
                        var val = scope[exportedToken][k];
                        if (util_1.IsVarName(val)) {
                            exported[val] = true;
                            renames[exportedToken] = renames[exportedToken] || {};
                            renames[exportedToken][k] = val;
                        }
                        else if (util_1.IsBlockID(val, util_1.Blocks.FUNCTION)) {
                            if (this.IsFunctionUsedAsClass(val)) {
                                val = this.ConvertToClassBlock(val, k, null);
                            }
                            scope[k] = val;
                            orderMap[k] = Number.POSITIVE_INFINITY;
                            exported[k] = true;
                            this.nodeIdToNode[val].functionName = k;
                            renames[exportedToken] = renames[exportedToken] || {};
                            renames[exportedToken][k] = k;
                        }
                        else {
                            scope[k] = val;
                            orderMap[k] = keysOrder[exportedToken + '.' + k];
                            exported[k] = true;
                            renames[exportedToken] = renames[exportedToken] || {};
                            renames[exportedToken][k] = k;
                        }
                    }
                    delete scope[exportedToken];
                    delete orderMap[exportedToken];
                }
                else {
                    throw new Error('Returning a variable that is neither class/function nor object is not' +
                        'yet supported!');
                }
            }
            else if (util_1.IsBlockID(exportedToken, util_1.Blocks.FUNCTION)) {
                if (this.IsFunctionUsedAsClass(exportedToken)) {
                    exportedToken = this.ConvertToClassBlock(exportedToken, this.moduleName, null);
                    annotations[this.moduleName] = "@Provide('" + this.moduleName + "')";
                }
                else {
                    this.nodeIdToNode[exportedToken].functionName =
                        this.moduleName;
                    provideFactory = "Provide('" + this.moduleName + "')(" + this.moduleName + ");";
                }
                scope[this.moduleName] = exportedToken;
                orderMap[this.moduleName] = Number.POSITIVE_INFINITY;
                exported[this.moduleName] = true;
            }
            else if (util_1.IsBlockID(exportedToken, util_1.Blocks.OBJECT)) {
                var returnedObj = this.expandObject(exportedToken);
                var allKeys = Object.keys(returnedObj).join(',\n');
                provideFactory = "Provide('" + this.moduleName + "')({\n" + allKeys + "\n});";
                for (var k in returnedObj) {
                    var val = returnedObj[k];
                    if (util_1.IsVarName(val)) {
                        exported[val] = true;
                    }
                    else if (util_1.IsBlockID(val, util_1.Blocks.FUNCTION)) {
                        if (this.IsFunctionUsedAsClass(val)) {
                            val = this.ConvertToClassBlock(val, k, null);
                        }
                        scope[k] = val;
                        orderMap[k] = Number.POSITIVE_INFINITY;
                        exported[k] = true;
                        this.nodeIdToNode[val].functionName = k;
                    }
                    else {
                        scope[k] = val;
                        orderMap[k] = Number.POSITIVE_INFINITY;
                        exported[k] = true;
                    }
                }
            }
        }
        var output = '';
        var ordering = [];
        for (var varName in orderMap) {
            ordering.push([varName, orderMap[varName]]);
        }
        ordering.sort(function (p1, p2) {
            return p1[1] - p2[1];
        }).forEach(function (p) {
            var name = p[0];
            if (util_1.IsBlockID(scope[name], util_1.Blocks.CLASS)) {
                output += '\n';
                if (annotations[name]) {
                    output += annotations[name] + '\n';
                }
                output += scope[name] + '\n';
            }
            else if (util_1.IsBlockID(scope[name], util_1.Blocks.FUNCTION)) {
                output += scope[name] + '\n';
            }
            else {
                output += 'let ' + name + ' = ' + JS2TS.serializeObject(scope[name]) + ';\n';
            }
        });
        if (Object.keys(exported).length > 0) {
            var exports_1 = 'export {\n' + Object.keys(exported).join(',\n') + '\n}\n';
            output += '\n' + exports_1;
        }
        output += '\n' + provideFactory;
        output = util_1.expandCodeRecursive(output, this.nodeIdToNode) + '\n';
        for (var objName in renames) {
            var objNameDollarEscaped = objName.replace(/\$/g, '\\$');
            for (var from in renames[objName]) {
                var fromDollarEscaped = from.replace(/\$/g, '\\$');
                var fromRegex = new RegExp(objNameDollarEscaped + "\\s*\\.\\s*" + fromDollarEscaped, 'gm');
                var to = util_1.EscapeDollar(renames[objName][from]);
                output = output.replace(fromRegex, to);
            }
        }
        return output;
    };
    JS2TS.prototype.expandObject = function (nodeId) {
        var _this = this;
        if (!util_1.IsBlockID(nodeId, util_1.Blocks.OBJECT)) {
            return nodeId;
        }
        var objectCode = this.nodeIdToNode[util_1.expandBlock(this.nodeIdToNode[nodeId])].code;
        var pairs = objectCode.split(',').map(function (token) { return token.trim(); }).filter(function (token) { return !!token; });
        var obj = {};
        pairs.forEach(function (pair) {
            var key = pair.replace(/^([^:]+)\s*:([^,]+)$/gm, "$1");
            var val = pair.replace(/^([^:]+)\s*:([^,]+)$/gm, "$2").trim();
            obj[key] = _this.expandObject(val);
        });
        return obj;
    };
    JS2TS.serializeObject = function (obj) {
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
    };
    JS2TS.prototype.setObjectProps = function (scope, props, val, lastCommentList) {
        var _this = this;
        val = this.expandObject(val);
        if (util_1.IsBlockID(val, util_1.Blocks.FUNCTION)) {
            this.nodeIdToNode[val].docs = lastCommentList;
        }
        var curObj = scope;
        var propsList = props.split('.');
        propsList.forEach(function (prop, index) {
            if (index == propsList.length - 1) {
                curObj[prop] = val;
                return;
            }
            if (!curObj[prop])
                throw new Error('Accessing an object that is not present in scope!');
            curObj = curObj[prop];
            if (_.isString(curObj)) {
                if (!util_1.IsBlockID(curObj, util_1.Blocks.FUNCTION)) {
                    throw new Error('setting key on something that is neither an object nor function');
                }
                if (!_this.functionPlaceholderToObjMap[curObj]) {
                    _this.functionPlaceholderToObjMap[curObj] = { prototype: {} };
                }
                curObj = _this.functionPlaceholderToObjMap[curObj];
            }
        });
    };
    JS2TS.prototype.IsFunctionUsedAsClass = function (blockID) {
        if (!util_1.IsBlockID(blockID, util_1.Blocks.FUNCTION)) {
            return false;
        }
        var node = this.nodeIdToNode[blockID];
        var settingPropToThis = !!this.nodeIdToNode[node.bodyID].code.match(/this\.([_\w]+)\s*=/);
        if (settingPropToThis) {
            return true;
        }
        return this.functionPlaceholderToObjMap[blockID] && !!this.functionPlaceholderToObjMap[blockID].prototype &&
            Object.keys(this.functionPlaceholderToObjMap[blockID].prototype).length > 0;
    };
    JS2TS.prototype.ConvertToClassBlock = function (blockID, className, parentClassName) {
        var _this = this;
        if (!util_1.IsBlockID(blockID, util_1.Blocks.FUNCTION)) {
            throw new Error('Must be a function block');
        }
        var funcBlock = this.nodeIdToNode[blockID];
        var instanceMethodIDs = [], instanceVarIDs = [];
        this.functionPlaceholderToObjMap[blockID] =
            this.functionPlaceholderToObjMap[blockID] || { prototype: {} };
        _.forEach(this.functionPlaceholderToObjMap[blockID].prototype, function (val, key) {
            if (!_.isString(val)) {
                throw new Error('Setting an object on a key of prototype? thats not supported yet');
            }
            if (_this.nodeIdToNode[val] instanceof util_1.FunctionBlock) {
                var methodNode = _this.nodeIdToNode[val];
                var cmb = new util_1.ClassMethodBlock({
                    type: util_1.Blocks.CLASSMETHOD,
                    accessType: 'public_',
                    isStatic: false,
                    name: key,
                    headerID: methodNode.headerID,
                    bodyID: methodNode.bodyID,
                    docs: methodNode.docs
                });
                _this.nodeIdToNode[cmb.id] = cmb;
                instanceMethodIDs.push(cmb.id);
            }
            else {
                var cpb = new util_1.ClassPropBlock({
                    type: util_1.Blocks.CLASSPROP,
                    accessType: 'public_',
                    isStatic: false,
                    name: key,
                    code: val
                });
                _this.nodeIdToNode[cpb.id] = cpb;
                instanceVarIDs.push(cpb.id);
            }
        });
        var staticMethodIDs = [], staticVarIDs = [];
        _.forEach(this.functionPlaceholderToObjMap[blockID], function (val, key) {
            if (key === 'prototype') {
                return;
            }
            if (_.isString(val) && (_this.nodeIdToNode[val] instanceof util_1.FunctionBlock)) {
                var methodNode = _this.nodeIdToNode[val];
                var cmb = new util_1.ClassMethodBlock({
                    type: util_1.Blocks.CLASSMETHOD,
                    accessType: 'public_',
                    isStatic: true,
                    name: key,
                    headerID: methodNode.headerID,
                    bodyID: methodNode.bodyID,
                    docs: methodNode.docs
                });
                _this.nodeIdToNode[cmb.id] = cmb;
                staticMethodIDs.push(cmb.id);
            }
            else {
                var cpb = new util_1.ClassPropBlock({
                    type: util_1.Blocks.CLASSPROP,
                    accessType: 'public_',
                    isStatic: true,
                    name: key,
                    code: JS2TS.serializeObject(val)
                });
                _this.nodeIdToNode[cpb.id] = cpb;
                staticVarIDs.push(cpb.id);
            }
        });
        var methodIDs = staticMethodIDs.concat(instanceMethodIDs);
        var ctorBlock = new util_1.BlockWithHeaderAndBody({
            type: util_1.Blocks.CTOR,
            headerID: funcBlock.headerID,
            bodyID: funcBlock.bodyID,
            docs: funcBlock.docs
        });
        this.nodeIdToNode[ctorBlock.id] = ctorBlock;
        this.updateSuperCall(ctorBlock);
        var instanceVars = this.extractInstanceVars([ctorBlock.id].concat(instanceMethodIDs));
        for (var varName in instanceVars) {
            var cpb = new util_1.ClassPropBlock({
                type: util_1.Blocks.CLASSPROP,
                accessType: 'public_',
                isStatic: false,
                name: varName,
            });
            this.nodeIdToNode[cpb.id] = cpb;
            instanceVarIDs.push(cpb.id);
        }
        var varIDs = staticVarIDs.concat(instanceVarIDs);
        var classBlock = new util_1.ClassBlock({
            type: util_1.Blocks.CLASS,
            className: className,
            parentClassName: parentClassName,
            ctor: ctorBlock.id,
            methods: methodIDs,
            vars: varIDs
        });
        this.nodeIdToNode[classBlock.id] = classBlock;
        return classBlock.id;
    };
    JS2TS.prototype.updateSuperCall = function (ctor) {
        var regex = new RegExp("[_\\w]+\\.__super\\.call\\s*(" + util_1.GetRegexToMatchBlock(util_1.Blocks.ROUNDBLOCK).source + ")\\s*;");
        var ctorBody = this.nodeIdToNode[ctor.bodyID];
        var match = ctorBody.code.match(regex);
        if (!match) {
            return;
        }
        ctorBody.code = ctorBody.code.replace(regex, 'super$1;');
        var paramsBlock = this.nodeIdToNode[match[1]];
        paramsBlock.code = paramsBlock.code.replace(/^\s*this\s*,/, '');
    };
    JS2TS.prototype.extractInstanceVars = function (instanceBlockIDs) {
        var _this = this;
        var ret = {};
        instanceBlockIDs.forEach(function (blockID) {
            var methodBodyID = _this.nodeIdToNode[blockID].bodyID;
            var res = _this.extractInstanceVarsForCode(_this.nodeIdToNode[methodBodyID].code);
            for (var k in res) {
                ret[k] = 1;
            }
        });
        return ret;
    };
    JS2TS.prototype.extractInstanceVarsForCode = function (code) {
        var expandedCode = util_1.expandCodeRecursive(code, this.nodeIdToNode, JS2TS.NodeTypesWithSameScopeAsParent);
        var regex = /this\.([_\w]+)\s*=/g;
        var match = regex.exec(expandedCode);
        var ret = {};
        while (match != null) {
            ret[match[1]] = 1;
            match = regex.exec(expandedCode);
        }
        return ret;
    };
    return JS2TS;
}());
JS2TS.NodeTypesWithSameScopeAsParent = [
    util_1.Blocks.CURLYBLOCK, util_1.Blocks.ROUNDBLOCK, util_1.Blocks.SQUAREBLOCK,
    util_1.Blocks.IF, util_1.Blocks.ELSE, util_1.Blocks.SWITCH,
    util_1.Blocks.FOR, util_1.Blocks.WHILE
];
module.exports = JS2TS;
//# sourceMappingURL=JS2TS.js.map