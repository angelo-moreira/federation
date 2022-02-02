"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.builtTypeReference = exports.buildSchemaFromAST = exports.buildSchema = void 0;
const graphql_1 = require("graphql");
const definitions_1 = require("./definitions");
function buildValue(value) {
    return value ? (0, graphql_1.valueFromASTUntyped)(value) : undefined;
}
function buildSchema(source, builtIns = definitions_1.graphQLBuiltIns, validate = true) {
    return buildSchemaFromAST((0, graphql_1.parse)(source), builtIns, validate);
}
exports.buildSchema = buildSchema;
function buildSchemaFromAST(documentNode, builtIns = definitions_1.graphQLBuiltIns, validate = true) {
    const schema = new definitions_1.Schema(builtIns);
    const directiveDefinitionNodes = buildNamedTypeAndDirectivesShallow(documentNode, schema);
    for (const directiveDefinitionNode of directiveDefinitionNodes) {
        buildDirectiveDefinitionInner(directiveDefinitionNode, schema.directive(directiveDefinitionNode.name.value));
    }
    for (const definitionNode of documentNode.definitions) {
        switch (definitionNode.kind) {
            case 'OperationDefinition':
            case 'FragmentDefinition':
                throw new graphql_1.GraphQLError("Invalid executable definition found while building schema", definitionNode);
            case 'SchemaDefinition':
                buildSchemaDefinitionInner(definitionNode, schema.schemaDefinition);
                break;
            case 'SchemaExtension':
                buildSchemaDefinitionInner(definitionNode, schema.schemaDefinition, schema.schemaDefinition.newExtension());
                break;
            case 'ScalarTypeDefinition':
            case 'ObjectTypeDefinition':
            case 'InterfaceTypeDefinition':
            case 'UnionTypeDefinition':
            case 'EnumTypeDefinition':
            case 'InputObjectTypeDefinition':
                buildNamedTypeInner(definitionNode, schema.type(definitionNode.name.value));
                break;
            case 'ScalarTypeExtension':
            case 'ObjectTypeExtension':
            case 'InterfaceTypeExtension':
            case 'UnionTypeExtension':
            case 'EnumTypeExtension':
            case 'InputObjectTypeExtension':
                const toExtend = schema.type(definitionNode.name.value);
                const extension = toExtend.newExtension();
                extension.sourceAST = definitionNode;
                buildNamedTypeInner(definitionNode, toExtend, extension);
                break;
        }
    }
    definitions_1.Schema.prototype['forceSetCachedDocument'].call(schema, documentNode);
    if (validate) {
        schema.validate();
    }
    return schema;
}
exports.buildSchemaFromAST = buildSchemaFromAST;
function buildNamedTypeAndDirectivesShallow(documentNode, schema) {
    const directiveDefinitionNodes = [];
    for (const definitionNode of documentNode.definitions) {
        switch (definitionNode.kind) {
            case 'ScalarTypeDefinition':
            case 'ObjectTypeDefinition':
            case 'InterfaceTypeDefinition':
            case 'UnionTypeDefinition':
            case 'EnumTypeDefinition':
            case 'InputObjectTypeDefinition':
            case 'ScalarTypeExtension':
            case 'ObjectTypeExtension':
            case 'InterfaceTypeExtension':
            case 'UnionTypeExtension':
            case 'EnumTypeExtension':
            case 'InputObjectTypeExtension':
                const existing = schema.type(definitionNode.name.value);
                if (!existing || existing.isBuiltIn) {
                    schema.addType((0, definitions_1.newNamedType)(withoutTrailingDefinition(definitionNode.kind), definitionNode.name.value));
                }
                break;
            case 'DirectiveDefinition':
                directiveDefinitionNodes.push(definitionNode);
                schema.addDirectiveDefinition(definitionNode.name.value);
                break;
        }
    }
    return directiveDefinitionNodes;
}
function withoutTrailingDefinition(str) {
    const endString = str.endsWith('Definition') ? 'Definition' : 'Extension';
    return str.slice(0, str.length - endString.length);
}
function getReferencedType(node, schema) {
    const type = schema.type(node.name.value);
    if (!type) {
        throw new graphql_1.GraphQLError(`Unknown type ${node.name.value}`, node);
    }
    return type;
}
function withNodeAttachedToError(operation, node) {
    try {
        operation();
    }
    catch (e) {
        if (e instanceof graphql_1.GraphQLError) {
            const allNodes = e.nodes ? [node, ...e.nodes] : node;
            throw new graphql_1.GraphQLError(e.message, allNodes, e.source, e.positions, e.path, e, e.extensions);
        }
        else {
            throw e;
        }
    }
}
function buildSchemaDefinitionInner(schemaNode, schemaDefinition, extension) {
    var _a, _b;
    for (const opTypeNode of (_a = schemaNode.operationTypes) !== null && _a !== void 0 ? _a : []) {
        withNodeAttachedToError(() => schemaDefinition.setRoot(opTypeNode.operation, opTypeNode.type.name.value).setOfExtension(extension), opTypeNode);
    }
    schemaDefinition.sourceAST = schemaNode;
    schemaDefinition.description = 'description' in schemaNode ? (_b = schemaNode.description) === null || _b === void 0 ? void 0 : _b.value : undefined;
    buildAppliedDirectives(schemaNode, schemaDefinition, extension);
}
function buildAppliedDirectives(elementNode, element, extension) {
    var _a;
    for (const directive of (_a = elementNode.directives) !== null && _a !== void 0 ? _a : []) {
        withNodeAttachedToError(() => {
            const d = element.applyDirective(directive.name.value, buildArgs(directive));
            d.setOfExtension(extension);
            d.sourceAST = directive;
        }, directive);
    }
}
function buildArgs(argumentsNode) {
    var _a;
    const args = Object.create(null);
    for (const argNode of (_a = argumentsNode.arguments) !== null && _a !== void 0 ? _a : []) {
        args[argNode.name.value] = buildValue(argNode.value);
    }
    return args;
}
function buildNamedTypeInner(definitionNode, type, extension) {
    var _a, _b, _c, _d, _e, _f, _g;
    switch (definitionNode.kind) {
        case 'ObjectTypeDefinition':
        case 'ObjectTypeExtension':
        case 'InterfaceTypeDefinition':
        case 'InterfaceTypeExtension':
            const fieldBasedType = type;
            for (const fieldNode of (_a = definitionNode.fields) !== null && _a !== void 0 ? _a : []) {
                const field = fieldBasedType.addField(fieldNode.name.value);
                field.setOfExtension(extension);
                buildFieldDefinitionInner(fieldNode, field);
            }
            for (const itfNode of (_b = definitionNode.interfaces) !== null && _b !== void 0 ? _b : []) {
                withNodeAttachedToError(() => {
                    const itfName = itfNode.name.value;
                    if (fieldBasedType.implementsInterface(itfName)) {
                        throw new graphql_1.GraphQLError(`Type ${type} can only implement ${itfName} once.`);
                    }
                    fieldBasedType.addImplementedInterface(itfName).setOfExtension(extension);
                }, itfNode);
            }
            break;
        case 'UnionTypeDefinition':
        case 'UnionTypeExtension':
            const unionType = type;
            for (const namedType of (_c = definitionNode.types) !== null && _c !== void 0 ? _c : []) {
                withNodeAttachedToError(() => {
                    const name = namedType.name.value;
                    if (unionType.hasTypeMember(name)) {
                        throw new graphql_1.GraphQLError(`Union type ${unionType} can only include type ${name} once.`);
                    }
                    unionType.addType(name).setOfExtension(extension);
                }, namedType);
            }
            break;
        case 'EnumTypeDefinition':
        case 'EnumTypeExtension':
            const enumType = type;
            for (const enumVal of (_d = definitionNode.values) !== null && _d !== void 0 ? _d : []) {
                const v = enumType.addValue(enumVal.name.value);
                v.description = (_e = enumVal.description) === null || _e === void 0 ? void 0 : _e.value;
                v.setOfExtension(extension);
                buildAppliedDirectives(enumVal, v);
            }
            break;
        case 'InputObjectTypeDefinition':
        case 'InputObjectTypeExtension':
            const inputObjectType = type;
            for (const fieldNode of (_f = definitionNode.fields) !== null && _f !== void 0 ? _f : []) {
                const field = inputObjectType.addField(fieldNode.name.value);
                field.setOfExtension(extension);
                buildInputFieldDefinitionInner(fieldNode, field);
            }
            break;
    }
    buildAppliedDirectives(definitionNode, type, extension);
    type.description = (_g = definitionNode.description) === null || _g === void 0 ? void 0 : _g.value;
    type.sourceAST = definitionNode;
}
function buildFieldDefinitionInner(fieldNode, field) {
    var _a, _b;
    const type = buildTypeReferenceFromAST(fieldNode.type, field.schema());
    field.type = ensureOutputType(type, field.coordinate, fieldNode);
    for (const inputValueDef of (_a = fieldNode.arguments) !== null && _a !== void 0 ? _a : []) {
        buildArgumentDefinitionInner(inputValueDef, field.addArgument(inputValueDef.name.value));
    }
    buildAppliedDirectives(fieldNode, field);
    field.description = (_b = fieldNode.description) === null || _b === void 0 ? void 0 : _b.value;
    field.sourceAST = fieldNode;
}
function ensureOutputType(type, what, node) {
    if ((0, definitions_1.isOutputType)(type)) {
        return type;
    }
    else {
        throw new graphql_1.GraphQLError(`The type of ${what} must be Output Type but got: ${type}, a ${type.kind}.`, node);
    }
}
function ensureInputType(type, what, node) {
    if ((0, definitions_1.isInputType)(type)) {
        return type;
    }
    else {
        throw new graphql_1.GraphQLError(`The type of ${what} must be Input Type but got: ${type}, a ${type.kind}.`, node);
    }
}
function builtTypeReference(encodedType, schema) {
    return buildTypeReferenceFromAST((0, graphql_1.parseType)(encodedType), schema);
}
exports.builtTypeReference = builtTypeReference;
function buildTypeReferenceFromAST(typeNode, schema) {
    switch (typeNode.kind) {
        case graphql_1.Kind.LIST_TYPE:
            return new definitions_1.ListType(buildTypeReferenceFromAST(typeNode.type, schema));
        case graphql_1.Kind.NON_NULL_TYPE:
            const wrapped = buildTypeReferenceFromAST(typeNode.type, schema);
            if (wrapped.kind == graphql_1.Kind.NON_NULL_TYPE) {
                throw new graphql_1.GraphQLError(`Cannot apply the non-null operator (!) twice to the same type`, typeNode);
            }
            return new definitions_1.NonNullType(wrapped);
        default:
            return getReferencedType(typeNode, schema);
    }
}
function buildArgumentDefinitionInner(inputNode, arg) {
    var _a;
    const type = buildTypeReferenceFromAST(inputNode.type, arg.schema());
    arg.type = ensureInputType(type, arg.coordinate, inputNode);
    arg.defaultValue = buildValue(inputNode.defaultValue);
    buildAppliedDirectives(inputNode, arg);
    arg.description = (_a = inputNode.description) === null || _a === void 0 ? void 0 : _a.value;
    arg.sourceAST = inputNode;
}
function buildInputFieldDefinitionInner(fieldNode, field) {
    var _a;
    const type = buildTypeReferenceFromAST(fieldNode.type, field.schema());
    field.type = ensureInputType(type, field.coordinate, fieldNode);
    field.defaultValue = buildValue(fieldNode.defaultValue);
    buildAppliedDirectives(fieldNode, field);
    field.description = (_a = fieldNode.description) === null || _a === void 0 ? void 0 : _a.value;
    field.sourceAST = fieldNode;
}
function buildDirectiveDefinitionInner(directiveNode, directive) {
    var _a, _b;
    for (const inputValueDef of (_a = directiveNode.arguments) !== null && _a !== void 0 ? _a : []) {
        buildArgumentDefinitionInner(inputValueDef, directive.addArgument(inputValueDef.name.value));
    }
    directive.repeatable = directiveNode.repeatable;
    const locations = directiveNode.locations.map(({ value }) => value);
    directive.addLocations(...locations);
    directive.description = (_b = directiveNode.description) === null || _b === void 0 ? void 0 : _b.value;
    directive.sourceAST = directiveNode;
}
//# sourceMappingURL=buildSchema.js.map