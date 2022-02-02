import { DocumentNode, GraphQLSchema } from 'graphql';
import { GraphQLSchemaModule, GraphQLResolverMap } from './schema-helper';
declare type LegacySchemaModule = {
    typeDefs: DocumentNode | DocumentNode[];
    resolvers?: GraphQLResolverMap<unknown>;
};
export { GraphQLSchemaModule };
export declare function buildSubgraphSchema(modulesOrSDL: (GraphQLSchemaModule | DocumentNode)[] | DocumentNode | LegacySchemaModule): GraphQLSchema;
export declare const buildFederatedSchema: typeof buildSubgraphSchema;
//# sourceMappingURL=buildSubgraphSchema.d.ts.map