"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformSchema = void 0;
const graphql_1 = require("graphql");
function mapValues(object, callback) {
    const result = Object.create(null);
    for (const [key, value] of Object.entries(object)) {
        result[key] = callback(value);
    }
    return result;
}
function transformSchema(schema, transformType) {
    const typeMap = Object.create(null);
    for (const oldType of Object.values(schema.getTypeMap())) {
        if ((0, graphql_1.isIntrospectionType)(oldType))
            continue;
        const result = transformType(oldType);
        if (result === null)
            continue;
        const newType = result || oldType;
        typeMap[newType.name] = recreateNamedType(newType);
    }
    const schemaConfig = schema.toConfig();
    return new graphql_1.GraphQLSchema({
        ...schemaConfig,
        types: Object.values(typeMap),
        query: replaceMaybeType(schemaConfig.query),
        mutation: replaceMaybeType(schemaConfig.mutation),
        subscription: replaceMaybeType(schemaConfig.subscription),
        directives: replaceDirectives(schemaConfig.directives)
    });
    function recreateNamedType(type) {
        if ((0, graphql_1.isObjectType)(type)) {
            const config = type.toConfig();
            return new graphql_1.GraphQLObjectType({
                ...config,
                interfaces: () => config.interfaces.map(replaceNamedType),
                fields: () => replaceFields(config.fields)
            });
        }
        else if ((0, graphql_1.isInterfaceType)(type)) {
            const config = type.toConfig();
            return new graphql_1.GraphQLInterfaceType({
                ...config,
                interfaces: () => config.interfaces.map(replaceNamedType),
                fields: () => replaceFields(config.fields)
            });
        }
        else if ((0, graphql_1.isUnionType)(type)) {
            const config = type.toConfig();
            return new graphql_1.GraphQLUnionType({
                ...config,
                types: () => config.types.map(replaceNamedType)
            });
        }
        else if ((0, graphql_1.isInputObjectType)(type)) {
            const config = type.toConfig();
            return new graphql_1.GraphQLInputObjectType({
                ...config,
                fields: () => replaceInputFields(config.fields)
            });
        }
        return type;
    }
    function replaceType(type) {
        if ((0, graphql_1.isListType)(type)) {
            return new graphql_1.GraphQLList(replaceType(type.ofType));
        }
        else if ((0, graphql_1.isNonNullType)(type)) {
            return new graphql_1.GraphQLNonNull(replaceType(type.ofType));
        }
        return replaceNamedType(type);
    }
    function replaceNamedType(type) {
        const newType = typeMap[type.name];
        return newType ? newType : type;
    }
    function replaceMaybeType(type) {
        return type ? replaceNamedType(type) : undefined;
    }
    function replaceFields(fieldsMap) {
        return mapValues(fieldsMap, field => ({
            ...field,
            type: replaceType(field.type),
            args: field.args ? replaceArgs(field.args) : undefined
        }));
    }
    function replaceInputFields(fieldsMap) {
        return mapValues(fieldsMap, field => ({
            ...field,
            type: replaceType(field.type)
        }));
    }
    function replaceArgs(args) {
        return mapValues(args, (arg) => ({
            ...arg,
            type: replaceType(arg.type),
        }));
    }
    function replaceDirectives(directives) {
        return directives.map((directive) => {
            const config = directive.toConfig();
            return new graphql_1.GraphQLDirective({
                ...config,
                args: replaceArgs(config.args),
            });
        });
    }
}
exports.transformSchema = transformSchema;
//# sourceMappingURL=transformSchema.js.map