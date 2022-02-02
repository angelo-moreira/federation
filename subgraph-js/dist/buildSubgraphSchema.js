"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFederatedSchema = exports.buildSubgraphSchema = void 0;
const util_1 = require("util");
const graphql_1 = require("graphql");
const schema_helper_1 = require("./schema-helper");
const directives_1 = require("./directives");
const types_1 = require("./types");
const printSubgraphSchema_1 = require("./printSubgraphSchema");
function buildSubgraphSchema(modulesOrSDL) {
    let shapedModulesOrSDL;
    if ('typeDefs' in modulesOrSDL) {
        const { typeDefs, resolvers } = modulesOrSDL;
        const augmentedTypeDefs = Array.isArray(typeDefs) ? typeDefs : [typeDefs];
        shapedModulesOrSDL = augmentedTypeDefs.map((typeDefs, i) => {
            const module = { typeDefs };
            if (i === 0 && resolvers)
                module.resolvers = resolvers;
            return module;
        });
    }
    else {
        shapedModulesOrSDL = modulesOrSDL;
    }
    const modules = (0, schema_helper_1.modulesFromSDL)(shapedModulesOrSDL);
    let schema = (0, schema_helper_1.buildSchemaFromSDL)(modules, new graphql_1.GraphQLSchema({
        query: undefined,
        directives: [...graphql_1.specifiedDirectives, ...directives_1.federationDirectives],
    }));
    const sdl = (0, printSubgraphSchema_1.printSubgraphSchema)(schema);
    if (!schema.getQueryType()) {
        schema = new graphql_1.GraphQLSchema({
            ...schema.toConfig(),
            query: new graphql_1.GraphQLObjectType({
                name: 'Query',
                fields: {},
            }),
        });
    }
    const entityTypes = Object.values(schema.getTypeMap()).filter((type) => (0, graphql_1.isObjectType)(type) && (0, directives_1.typeIncludesDirective)(type, 'key'));
    const hasEntities = entityTypes.length > 0;
    schema = (0, schema_helper_1.transformSchema)(schema, (type) => {
        if ((0, graphql_1.isObjectType)(type) && type === schema.getQueryType()) {
            const config = type.toConfig();
            return new graphql_1.GraphQLObjectType({
                ...config,
                fields: {
                    ...(hasEntities && { _entities: types_1.entitiesField }),
                    _service: {
                        ...types_1.serviceField,
                        resolve: () => ({ sdl }),
                    },
                    ...config.fields,
                },
            });
        }
        return undefined;
    });
    schema = (0, schema_helper_1.transformSchema)(schema, (type) => {
        if (hasEntities && (0, graphql_1.isUnionType)(type) && type.name === types_1.EntityType.name) {
            return new graphql_1.GraphQLUnionType({
                ...types_1.EntityType.toConfig(),
                types: entityTypes.filter(graphql_1.isObjectType),
            });
        }
        return undefined;
    });
    for (const module of modules) {
        if (!module.resolvers)
            continue;
        (0, schema_helper_1.addResolversToSchema)(schema, module.resolvers);
    }
    return schema;
}
exports.buildSubgraphSchema = buildSubgraphSchema;
exports.buildFederatedSchema = (0, util_1.deprecate)(buildSubgraphSchema, `'buildFederatedSchema' is deprecated. Use 'buildSubgraphSchema' instead.`);
//# sourceMappingURL=buildSubgraphSchema.js.map