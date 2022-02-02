"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.variablesInValue = exports.argumentsFromAST = exports.valueFromAST = exports.isValidValue = exports.valueToAST = exports.valueNodeToConstValueNode = exports.withDefaultValues = exports.argumentsEquals = exports.valueEquals = exports.valueToString = void 0;
const definitions_1 = require("./definitions");
const graphql_1 = require("graphql");
const suggestions_1 = require("./suggestions");
const util_1 = require("util");
const types_1 = require("./types");
const utils_1 = require("./utils");
const MAX_INT = 2147483647;
const MIN_INT = -2147483648;
function valueToString(v, expectedType) {
    if (v === undefined || v === null) {
        if (expectedType && (0, definitions_1.isNonNullType)(expectedType)) {
            throw buildError(`Invalid undefined/null value for non-null type ${expectedType}`);
        }
        return "null";
    }
    if (expectedType && (0, definitions_1.isNonNullType)(expectedType)) {
        expectedType = expectedType.ofType;
    }
    if (expectedType && (0, definitions_1.isCustomScalarType)(expectedType)) {
        expectedType = undefined;
    }
    if ((0, definitions_1.isVariable)(v)) {
        return v.toString();
    }
    if (Array.isArray(v)) {
        let elementsType = undefined;
        if (expectedType) {
            if (!(0, definitions_1.isListType)(expectedType)) {
                throw buildError(`Invalid list value for non-list type ${expectedType}`);
            }
            elementsType = expectedType.ofType;
        }
        return '[' + v.map(e => valueToString(e, elementsType)).join(', ') + ']';
    }
    if (typeof v === 'object') {
        if (expectedType && !(0, definitions_1.isInputObjectType)(expectedType)) {
            throw buildError(`Invalid object value for non-input-object type ${expectedType} (isCustomScalar? ${(0, definitions_1.isCustomScalarType)(expectedType)})`);
        }
        return '{' + Object.keys(v).map(k => {
            var _a;
            const valueType = expectedType ? (_a = expectedType.field(k)) === null || _a === void 0 ? void 0 : _a.type : undefined;
            return `${k}: ${valueToString(v[k], valueType)}`;
        }).join(', ') + '}';
    }
    if (typeof v === 'string') {
        if (expectedType) {
            if ((0, definitions_1.isEnumType)(expectedType)) {
                return v;
            }
            if (expectedType === expectedType.schema().idType() && integerStringRegExp.test(v)) {
                return v;
            }
        }
        return JSON.stringify(v);
    }
    return String(v);
}
exports.valueToString = valueToString;
function valueEquals(a, b) {
    if (a === b) {
        return true;
    }
    if (Array.isArray(a)) {
        return Array.isArray(b) && arrayValueEquals(a, b);
    }
    if (typeof a === 'object') {
        return typeof b === 'object' && objectEquals(a, b);
    }
    return a === b;
}
exports.valueEquals = valueEquals;
function arrayValueEquals(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; ++i) {
        if (!valueEquals(a[i], b[i])) {
            return false;
        }
    }
    return true;
}
function objectEquals(a, b) {
    const keys1 = Object.keys(a);
    const keys2 = Object.keys(b);
    if (keys1.length != keys2.length) {
        return false;
    }
    for (const key of keys1) {
        const v1 = a[key];
        const v2 = b[key];
        if (v2 === undefined) {
            return v1 === undefined && b.hasOwnProperty(key);
        }
        if (!valueEquals(v1, v2)) {
            return false;
        }
    }
    return true;
}
function argumentsEquals(args1, args2) {
    if (args1 === args2) {
        return true;
    }
    return objectEquals(args1, args2);
}
exports.argumentsEquals = argumentsEquals;
function buildError(message) {
    return new Error(message);
}
function applyDefaultValues(value, type) {
    if ((0, definitions_1.isVariable)(value)) {
        return value;
    }
    if (value === null) {
        if ((0, definitions_1.isNonNullType)(type)) {
            throw new graphql_1.GraphQLError(`Invalid null value for non-null type ${type} while computing default values`);
        }
        return null;
    }
    if ((0, definitions_1.isNonNullType)(type)) {
        return applyDefaultValues(value, type.ofType);
    }
    if ((0, definitions_1.isListType)(type)) {
        if (Array.isArray(value)) {
            return value.map(v => applyDefaultValues(v, type.ofType));
        }
        else {
            return applyDefaultValues(value, type.ofType);
        }
    }
    if ((0, definitions_1.isInputObjectType)(type)) {
        if (typeof value !== 'object') {
            throw new graphql_1.GraphQLError(`Expected value for type ${type} to be an object, but is ${typeof value}.`);
        }
        const updated = Object.create(null);
        for (const field of type.fields()) {
            if (!field.type) {
                throw buildError(`Cannot compute default value for field ${field.name} of ${type} as the field type is undefined`);
            }
            const fieldValue = value[field.name];
            if (fieldValue === undefined) {
                if (field.defaultValue !== undefined) {
                    updated[field.name] = applyDefaultValues(field.defaultValue, field.type);
                }
                else if ((0, definitions_1.isNonNullType)(field.type)) {
                    throw new graphql_1.GraphQLError(`Field "${field.name}" of required type ${type} was not provided.`);
                }
            }
            else {
                updated[field.name] = applyDefaultValues(fieldValue, field.type);
            }
        }
        for (const fieldName of Object.keys(value)) {
            if (!type.field(fieldName)) {
                const suggestions = (0, suggestions_1.suggestionList)(fieldName, type.fields().map(f => f.name));
                throw new graphql_1.GraphQLError(`Field "${fieldName}" is not defined by type "${type}".` + (0, suggestions_1.didYouMean)(suggestions));
            }
        }
        return updated;
    }
    return value;
}
function withDefaultValues(value, argument) {
    if (!argument.type) {
        throw buildError(`Cannot compute default value for argument ${argument} as the type is undefined`);
    }
    if (value === undefined) {
        if (argument.defaultValue) {
            return applyDefaultValues(argument.defaultValue, argument.type);
        }
    }
    return applyDefaultValues(value, argument.type);
}
exports.withDefaultValues = withDefaultValues;
const integerStringRegExp = /^-?(?:0|[1-9][0-9]*)$/;
function objectFieldNodeToConst(field) {
    return { ...field, value: valueNodeToConstValueNode(field.value) };
}
function valueNodeToConstValueNode(value) {
    if (value.kind === graphql_1.Kind.NULL
        || value.kind === graphql_1.Kind.INT
        || value.kind === graphql_1.Kind.FLOAT
        || value.kind === graphql_1.Kind.STRING
        || value.kind === graphql_1.Kind.BOOLEAN
        || value.kind === graphql_1.Kind.ENUM) {
        return value;
    }
    if (value.kind === graphql_1.Kind.LIST) {
        const constValues = value.values.map(v => valueNodeToConstValueNode(v));
        return { ...value, values: constValues };
    }
    if (value.kind === graphql_1.Kind.OBJECT) {
        const constFields = value.fields.map(f => objectFieldNodeToConst(f));
        return { ...value, fields: constFields };
    }
    if (value.kind === graphql_1.Kind.VARIABLE) {
        throw new Error('Unexpected VariableNode in const AST');
    }
    (0, utils_1.assertUnreachable)(value);
}
exports.valueNodeToConstValueNode = valueNodeToConstValueNode;
function valueToAST(value, type) {
    if (value === undefined) {
        return undefined;
    }
    if ((0, definitions_1.isNonNullType)(type)) {
        const astValue = valueToAST(value, type.ofType);
        if ((astValue === null || astValue === void 0 ? void 0 : astValue.kind) === graphql_1.Kind.NULL) {
            throw buildError(`Invalid null value ${valueToString(value)} for non-null type ${type}`);
        }
        return astValue;
    }
    if (value === null) {
        return { kind: graphql_1.Kind.NULL };
    }
    if ((0, definitions_1.isVariable)(value)) {
        return { kind: graphql_1.Kind.VARIABLE, name: { kind: graphql_1.Kind.NAME, value: value.name } };
    }
    if ((0, definitions_1.isCustomScalarType)(type)) {
        return valueToASTUntyped(value);
    }
    if ((0, definitions_1.isListType)(type)) {
        const itemType = type.ofType;
        const items = Array.from(value);
        if (items != null) {
            const valuesNodes = [];
            for (const item of items) {
                const itemNode = valueToAST(item, itemType);
                if (itemNode != null) {
                    valuesNodes.push(itemNode);
                }
            }
            return { kind: graphql_1.Kind.LIST, values: valuesNodes };
        }
        return valueToAST(value, itemType);
    }
    if ((0, definitions_1.isInputObjectType)(type)) {
        if (typeof value !== 'object') {
            throw buildError(`Invalid non-objet value for input type ${type}, cannot be converted to AST: ${(0, util_1.inspect)(value, true, 10, true)}`);
        }
        const fieldNodes = [];
        for (const field of type.fields()) {
            if (!field.type) {
                throw buildError(`Cannot convert value ${valueToString(value)} as field ${field} has no type set`);
            }
            const fieldValue = valueToAST(value[field.name], field.type);
            if (fieldValue) {
                fieldNodes.push({
                    kind: graphql_1.Kind.OBJECT_FIELD,
                    name: { kind: graphql_1.Kind.NAME, value: field.name },
                    value: fieldValue,
                });
            }
        }
        return { kind: graphql_1.Kind.OBJECT, fields: fieldNodes };
    }
    if (typeof value === 'boolean') {
        return { kind: graphql_1.Kind.BOOLEAN, value: value };
    }
    if (typeof value === 'number' && isFinite(value)) {
        const stringNum = String(value);
        return integerStringRegExp.test(stringNum)
            ? { kind: graphql_1.Kind.INT, value: stringNum }
            : { kind: graphql_1.Kind.FLOAT, value: stringNum };
    }
    if (typeof value === 'string') {
        if ((0, definitions_1.isEnumType)(type)) {
            return { kind: graphql_1.Kind.ENUM, value: value };
        }
        if (type === type.schema().idType() && integerStringRegExp.test(value)) {
            return { kind: graphql_1.Kind.INT, value: value };
        }
        return {
            kind: graphql_1.Kind.STRING,
            value: value,
        };
    }
    throw buildError(`Invalid value for type ${type}, cannot be converted to AST: ${(0, util_1.inspect)(value)}`);
}
exports.valueToAST = valueToAST;
function valueToASTUntyped(value) {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return { kind: graphql_1.Kind.NULL };
    }
    if ((0, definitions_1.isVariable)(value)) {
        return { kind: graphql_1.Kind.VARIABLE, name: { kind: graphql_1.Kind.NAME, value: value.name } };
    }
    if (Array.isArray(value)) {
        const valuesNodes = [];
        for (const item of value) {
            const itemNode = valueToASTUntyped(item);
            if (itemNode !== undefined) {
                valuesNodes.push(itemNode);
            }
        }
        return { kind: graphql_1.Kind.LIST, values: valuesNodes };
    }
    if (typeof value === 'object') {
        const fieldNodes = [];
        for (const key of Object.keys(value)) {
            const fieldValue = valueToASTUntyped(value[key]);
            if (fieldValue) {
                fieldNodes.push({
                    kind: graphql_1.Kind.OBJECT_FIELD,
                    name: { kind: graphql_1.Kind.NAME, value: key },
                    value: fieldValue,
                });
            }
        }
        return { kind: graphql_1.Kind.OBJECT, fields: fieldNodes };
    }
    if (typeof value === 'boolean') {
        return { kind: graphql_1.Kind.BOOLEAN, value: value };
    }
    if (typeof value === 'number' && isFinite(value)) {
        const stringNum = String(value);
        return integerStringRegExp.test(stringNum)
            ? { kind: graphql_1.Kind.INT, value: stringNum }
            : { kind: graphql_1.Kind.FLOAT, value: stringNum };
    }
    if (typeof value === 'string') {
        return { kind: graphql_1.Kind.STRING, value: value };
    }
    throw buildError(`Invalid value, cannot be converted to AST: ${(0, util_1.inspect)(value, true, 10, true)}`);
}
function isValidVariable(variable, locationType, locationDefault) {
    const variableType = variable.type;
    if ((0, definitions_1.isNonNullType)(locationType) && !(0, definitions_1.isNonNullType)(variableType)) {
        const hasVariableDefault = variable.defaultValue !== undefined && variable.defaultValue !== null;
        const hasLocationDefault = locationDefault !== undefined;
        if (!hasVariableDefault && !hasLocationDefault) {
            return false;
        }
        return areTypesCompatible(variableType, locationType.ofType);
    }
    return areTypesCompatible(variableType, locationType);
}
function areTypesCompatible(variableType, locationType) {
    if ((0, definitions_1.isNonNullType)(locationType)) {
        if (!(0, definitions_1.isNonNullType)(variableType)) {
            return false;
        }
        return areTypesCompatible(variableType.ofType, locationType.ofType);
    }
    if ((0, definitions_1.isNonNullType)(variableType)) {
        return areTypesCompatible(variableType.ofType, locationType);
    }
    if ((0, definitions_1.isListType)(locationType)) {
        if (!(0, definitions_1.isListType)(variableType)) {
            return false;
        }
        return areTypesCompatible(variableType.ofType, locationType.ofType);
    }
    return !(0, definitions_1.isListType)(variableType) && (0, types_1.sameType)(variableType, locationType);
}
function isValidValue(value, argument, variableDefinitions) {
    return isValidValueApplication(value, argument.type, argument.defaultValue, variableDefinitions);
}
exports.isValidValue = isValidValue;
function isValidValueApplication(value, locationType, locationDefault, variableDefinitions) {
    if ((0, definitions_1.isVariable)(value)) {
        const definition = variableDefinitions.definition(value);
        return !!definition && isValidVariable(definition, locationType, locationDefault);
    }
    if ((0, definitions_1.isNonNullType)(locationType)) {
        return value !== null && isValidValueApplication(value, locationType.ofType, undefined, variableDefinitions);
    }
    if (value === null || value === undefined) {
        return true;
    }
    if ((0, definitions_1.isCustomScalarType)(locationType)) {
        return true;
    }
    if ((0, definitions_1.isListType)(locationType)) {
        const itemType = locationType.ofType;
        if (Array.isArray(value)) {
            return value.every(item => isValidValueApplication(item, itemType, undefined, variableDefinitions));
        }
        return isValidValueApplication(value, itemType, locationDefault, variableDefinitions);
    }
    if ((0, definitions_1.isInputObjectType)(locationType)) {
        if (typeof value !== 'object') {
            return false;
        }
        const isValid = locationType.fields().every(field => isValidValueApplication(value[field.name], field.type, undefined, variableDefinitions));
        return isValid;
    }
    const schema = locationType.schema();
    if (typeof value === 'boolean') {
        return locationType === schema.booleanType();
    }
    if (typeof value === 'number' && isFinite(value)) {
        const stringNum = String(value);
        if (locationType === schema.intType() || locationType === schema.idType()) {
            return integerStringRegExp.test(stringNum);
        }
        return locationType === schema.floatType();
    }
    if (typeof value === 'string') {
        if ((0, definitions_1.isEnumType)(locationType)) {
            return locationType.value(value) !== undefined;
        }
        return (0, definitions_1.isScalarType)(locationType)
            && locationType !== schema.booleanType()
            && locationType !== schema.intType()
            && locationType !== schema.floatType();
    }
    return false;
}
function valueFromAST(node, expectedType) {
    if (node.kind === graphql_1.Kind.NULL) {
        if ((0, definitions_1.isNonNullType)(expectedType)) {
            throw new graphql_1.GraphQLError(`Invalid null value for non-null type "${expectedType}"`);
        }
        return null;
    }
    if (node.kind === graphql_1.Kind.VARIABLE) {
        return new definitions_1.Variable(node.name.value);
    }
    if ((0, definitions_1.isNonNullType)(expectedType)) {
        expectedType = expectedType.ofType;
    }
    if ((0, definitions_1.isListType)(expectedType)) {
        const baseType = expectedType.ofType;
        if (node.kind === graphql_1.Kind.LIST) {
            return node.values.map(v => valueFromAST(v, baseType));
        }
        return [valueFromAST(node, baseType)];
    }
    if ((0, definitions_1.isIntType)(expectedType)) {
        if (node.kind !== graphql_1.Kind.INT) {
            throw new graphql_1.GraphQLError(`Int cannot represent non-integer value ${(0, graphql_1.print)(node)}.`);
        }
        const i = parseInt(node.value, 10);
        if (i > MAX_INT || i < MIN_INT) {
            throw new graphql_1.GraphQLError(`Int cannot represent non 32-bit signed integer value ${i}.`);
        }
        return i;
    }
    if ((0, definitions_1.isFloatType)(expectedType)) {
        let parsed;
        if (node.kind === graphql_1.Kind.INT) {
            parsed = parseInt(node.value, 10);
        }
        else if (node.kind === graphql_1.Kind.FLOAT) {
            parsed = parseFloat(node.value);
        }
        else {
            throw new graphql_1.GraphQLError(`Float can only represent integer or float value, but got a ${node.kind}.`);
        }
        if (!isFinite(parsed)) {
            throw new graphql_1.GraphQLError(`Float cannot represent non numeric value ${parsed}.`);
        }
        return parsed;
    }
    if ((0, definitions_1.isBooleanType)(expectedType)) {
        if (node.kind !== graphql_1.Kind.BOOLEAN) {
            throw new graphql_1.GraphQLError(`Boolean cannot represent a non boolean value ${(0, graphql_1.print)(node)}.`);
        }
        return node.value;
    }
    if ((0, definitions_1.isStringType)(expectedType)) {
        if (node.kind !== graphql_1.Kind.STRING) {
            throw new graphql_1.GraphQLError(`String cannot represent non string value ${(0, graphql_1.print)(node)}.`);
        }
        return node.value;
    }
    if ((0, definitions_1.isIDType)(expectedType)) {
        if (node.kind !== graphql_1.Kind.STRING && node.kind !== graphql_1.Kind.INT) {
            throw new graphql_1.GraphQLError(`ID cannot represent value ${(0, graphql_1.print)(node)}.`);
        }
        return node.value;
    }
    if ((0, definitions_1.isScalarType)(expectedType)) {
        return valueFromASTUntyped(node);
    }
    if ((0, definitions_1.isInputObjectType)(expectedType)) {
        if (node.kind !== graphql_1.Kind.OBJECT) {
            throw new graphql_1.GraphQLError(`Input Object Type ${expectedType} cannot represent non-object value ${(0, graphql_1.print)(node)}.`);
        }
        const obj = Object.create(null);
        for (const f of node.fields) {
            const name = f.name.value;
            const field = expectedType.field(name);
            if (!field) {
                throw new graphql_1.GraphQLError(`Unknown field "${name}" found in value for Input Object Type "${expectedType}".`);
            }
            obj[name] = valueFromAST(f.value, field.type);
        }
        return obj;
    }
    if ((0, definitions_1.isEnumType)(expectedType)) {
        if (node.kind !== graphql_1.Kind.STRING && node.kind !== graphql_1.Kind.ENUM) {
            throw new graphql_1.GraphQLError(`Enum Type ${expectedType} cannot represent value ${(0, graphql_1.print)(node)}.`);
        }
        if (!expectedType.value(node.value)) {
            throw new graphql_1.GraphQLError(`Enum Type ${expectedType} has no value ${node.value}.`);
        }
        return node.value;
    }
    (0, utils_1.assert)(false, () => `Unexpected input type ${expectedType} of kind ${expectedType.kind}.`);
}
exports.valueFromAST = valueFromAST;
function valueFromASTUntyped(node) {
    switch (node.kind) {
        case graphql_1.Kind.NULL:
            return null;
        case graphql_1.Kind.INT:
            return parseInt(node.value, 10);
        case graphql_1.Kind.FLOAT:
            return parseFloat(node.value);
        case graphql_1.Kind.STRING:
        case graphql_1.Kind.ENUM:
        case graphql_1.Kind.BOOLEAN:
            return node.value;
        case graphql_1.Kind.LIST:
            return node.values.map(valueFromASTUntyped);
        case graphql_1.Kind.OBJECT:
            const obj = Object.create(null);
            node.fields.forEach(f => obj[f.name.value] = valueFromASTUntyped(f.value));
            return obj;
        case graphql_1.Kind.VARIABLE:
            return new definitions_1.Variable(node.name.value);
    }
}
function argumentsFromAST(context, args, argsDefiner) {
    var _a;
    const values = Object.create(null);
    if (args) {
        for (const argNode of args) {
            const name = argNode.name.value;
            const expectedType = (_a = argsDefiner.argument(name)) === null || _a === void 0 ? void 0 : _a.type;
            if (!expectedType) {
                throw new graphql_1.GraphQLError(`Unknown argument "${name}" found in value: ${context} has no argument named "${name}"`);
            }
            try {
                values[name] = valueFromAST(argNode.value, expectedType);
            }
            catch (e) {
                if (e instanceof graphql_1.GraphQLError) {
                    throw new graphql_1.GraphQLError(`Invalid value for argument ${name}: ${e.message}`);
                }
                throw e;
            }
        }
    }
    return values;
}
exports.argumentsFromAST = argumentsFromAST;
function variablesInValue(value) {
    const variables = [];
    collectVariables(value, variables);
    return variables;
}
exports.variablesInValue = variablesInValue;
function collectVariables(value, variables) {
    if ((0, definitions_1.isVariable)(value)) {
        if (!variables.some(v => v.name === value.name)) {
            variables.push(value);
        }
        return;
    }
    if (!value) {
        return;
    }
    if (Array.isArray(value)) {
        value.forEach(v => collectVariables(v, variables));
    }
    if (typeof value === 'object') {
        Object.keys(value).forEach(k => collectVariables(value[k], variables));
    }
}
//# sourceMappingURL=values.js.map