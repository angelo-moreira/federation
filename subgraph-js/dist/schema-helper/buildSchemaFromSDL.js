"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSchemaFromSDL = exports.addResolversToSchema = exports.modulesFromSDL = exports.isDocumentNode = exports.isNode = void 0;
const graphql_1 = require("graphql");
const validation_1 = require("graphql/validation");
const validate_1 = require("graphql/validation/validate");
const specifiedRules_1 = require("graphql/validation/specifiedRules");
const error_1 = require("./error");
function isNotNullOrUndefined(value) {
    return value !== null && typeof value !== 'undefined';
}
function isNode(maybeNode) {
    return maybeNode && typeof maybeNode.kind === "string";
}
exports.isNode = isNode;
function isDocumentNode(node) {
    return isNode(node) && node.kind === graphql_1.Kind.DOCUMENT;
}
exports.isDocumentNode = isDocumentNode;
function mapValues(object, callback) {
    const result = Object.create(null);
    for (const [key, value] of Object.entries(object)) {
        result[key] = callback(value);
    }
    return result;
}
const skippedSDLRules = [
    validation_1.KnownTypeNamesRule,
    validation_1.UniqueDirectivesPerLocationRule,
    validation_1.PossibleTypeExtensionsRule,
];
const sdlRules = specifiedRules_1.specifiedSDLRules.filter(rule => !skippedSDLRules.includes(rule));
const extKindToDefKind = {
    [graphql_1.Kind.SCALAR_TYPE_EXTENSION]: graphql_1.Kind.SCALAR_TYPE_DEFINITION,
    [graphql_1.Kind.OBJECT_TYPE_EXTENSION]: graphql_1.Kind.OBJECT_TYPE_DEFINITION,
    [graphql_1.Kind.INTERFACE_TYPE_EXTENSION]: graphql_1.Kind.INTERFACE_TYPE_DEFINITION,
    [graphql_1.Kind.UNION_TYPE_EXTENSION]: graphql_1.Kind.UNION_TYPE_DEFINITION,
    [graphql_1.Kind.ENUM_TYPE_EXTENSION]: graphql_1.Kind.ENUM_TYPE_DEFINITION,
    [graphql_1.Kind.INPUT_OBJECT_TYPE_EXTENSION]: graphql_1.Kind.INPUT_OBJECT_TYPE_DEFINITION
};
function modulesFromSDL(modulesOrSDL) {
    if (Array.isArray(modulesOrSDL)) {
        return modulesOrSDL.map(moduleOrSDL => {
            if (isNode(moduleOrSDL) && isDocumentNode(moduleOrSDL)) {
                return { typeDefs: moduleOrSDL };
            }
            else {
                return moduleOrSDL;
            }
        });
    }
    else {
        return [{ typeDefs: modulesOrSDL }];
    }
}
exports.modulesFromSDL = modulesFromSDL;
function addResolversToSchema(schema, resolvers) {
    for (const [typeName, fieldConfigs] of Object.entries(resolvers)) {
        const type = schema.getType(typeName);
        if ((0, graphql_1.isAbstractType)(type)) {
            for (const [fieldName, fieldConfig] of Object.entries(fieldConfigs)) {
                if (fieldName.startsWith("__")) {
                    type[fieldName.substring(2)] = fieldConfig;
                }
            }
        }
        if ((0, graphql_1.isScalarType)(type)) {
            for (const fn in fieldConfigs) {
                type[fn] = fieldConfigs[fn];
            }
        }
        if ((0, graphql_1.isEnumType)(type)) {
            const values = type.getValues();
            const newValues = {};
            values.forEach(value => {
                let newValue = fieldConfigs[value.name];
                if (newValue === undefined) {
                    newValue = value.name;
                }
                newValues[value.name] = {
                    value: newValue,
                    deprecationReason: value.deprecationReason,
                    description: value.description,
                    astNode: value.astNode,
                    extensions: undefined
                };
            });
            Object.assign(type, new graphql_1.GraphQLEnumType({
                ...type.toConfig(),
                values: newValues
            }));
        }
        if (!(0, graphql_1.isObjectType)(type))
            continue;
        const fieldMap = type.getFields();
        for (const [fieldName, fieldConfig] of Object.entries(fieldConfigs)) {
            if (fieldName.startsWith("__")) {
                type[fieldName.substring(2)] = fieldConfig;
                continue;
            }
            const field = fieldMap[fieldName];
            if (!field)
                continue;
            if (typeof fieldConfig === "function") {
                field.resolve = fieldConfig;
            }
            else {
                field.resolve = fieldConfig.resolve;
            }
        }
    }
}
exports.addResolversToSchema = addResolversToSchema;
function buildSchemaFromSDL(modulesOrSDL, schemaToExtend) {
    const modules = modulesFromSDL(modulesOrSDL);
    const documentAST = (0, graphql_1.concatAST)(modules.map(module => module.typeDefs));
    const errors = (0, validate_1.validateSDL)(documentAST, schemaToExtend, sdlRules);
    if (errors.length > 0) {
        throw new error_1.GraphQLSchemaValidationError(errors);
    }
    const definitionsMap = Object.create(null);
    const extensionsMap = Object.create(null);
    const directiveDefinitions = [];
    const schemaDefinitions = [];
    const schemaExtensions = [];
    const schemaDirectives = [];
    for (const definition of documentAST.definitions) {
        if ((0, graphql_1.isTypeDefinitionNode)(definition)) {
            const typeName = definition.name.value;
            if (definitionsMap[typeName]) {
                definitionsMap[typeName].push(definition);
            }
            else {
                definitionsMap[typeName] = [definition];
            }
        }
        else if ((0, graphql_1.isTypeExtensionNode)(definition)) {
            const typeName = definition.name.value;
            if (extensionsMap[typeName]) {
                extensionsMap[typeName].push(definition);
            }
            else {
                extensionsMap[typeName] = [definition];
            }
        }
        else if (definition.kind === graphql_1.Kind.DIRECTIVE_DEFINITION) {
            directiveDefinitions.push(definition);
        }
        else if (definition.kind === graphql_1.Kind.SCHEMA_DEFINITION) {
            schemaDefinitions.push(definition);
            schemaDirectives.push(...(definition.directives ? definition.directives : []));
        }
        else if (definition.kind === graphql_1.Kind.SCHEMA_EXTENSION) {
            schemaExtensions.push(definition);
        }
    }
    let schema = schemaToExtend
        ? schemaToExtend
        : new graphql_1.GraphQLSchema({
            query: undefined
        });
    const missingTypeDefinitions = [];
    for (const [extendedTypeName, extensions] of Object.entries(extensionsMap)) {
        if (!definitionsMap[extendedTypeName]) {
            const extension = extensions[0];
            const kind = extension.kind;
            const definition = {
                kind: extKindToDefKind[kind],
                name: extension.name
            };
            missingTypeDefinitions.push(definition);
        }
    }
    schema = (0, graphql_1.extendSchema)(schema, {
        kind: graphql_1.Kind.DOCUMENT,
        definitions: [
            ...Object.values(definitionsMap).flat(),
            ...missingTypeDefinitions,
            ...directiveDefinitions
        ]
    }, {
        assumeValidSDL: true
    });
    schema = (0, graphql_1.extendSchema)(schema, {
        kind: graphql_1.Kind.DOCUMENT,
        definitions: Object.values(extensionsMap).flat(),
    }, {
        assumeValidSDL: true
    });
    let operationTypeMap;
    if (schemaDefinitions.length > 0 || schemaExtensions.length > 0) {
        operationTypeMap = {};
        const operationTypes = [...schemaDefinitions, ...schemaExtensions]
            .map(node => node.operationTypes)
            .filter(isNotNullOrUndefined)
            .flat();
        for (const { operation, type } of operationTypes) {
            operationTypeMap[operation] = type.name.value;
        }
    }
    else {
        operationTypeMap = {
            query: "Query",
            mutation: "Mutation",
            subscription: "Subscription"
        };
    }
    schema = new graphql_1.GraphQLSchema({
        ...schema.toConfig(),
        ...mapValues(operationTypeMap, typeName => typeName
            ? schema.getType(typeName)
            : undefined),
        astNode: {
            kind: graphql_1.Kind.SCHEMA_DEFINITION,
            directives: schemaDirectives,
            operationTypes: []
        }
    });
    for (const module of modules) {
        if (!module.resolvers)
            continue;
        addResolversToSchema(schema, module.resolvers);
    }
    return schema;
}
exports.buildSchemaFromSDL = buildSchemaFromSDL;
//# sourceMappingURL=buildSchemaFromSDL.js.map