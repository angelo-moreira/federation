import { GraphQLFieldResolver, GraphQLScalarType, DocumentNode } from 'graphql';
export interface GraphQLSchemaModule {
    typeDefs: DocumentNode;
    resolvers?: GraphQLResolverMap<any>;
}
export interface GraphQLResolverMap<TContext = {}> {
    [typeName: string]: {
        [fieldName: string]: GraphQLFieldResolver<any, TContext> | {
            requires?: string;
            resolve: GraphQLFieldResolver<any, TContext>;
        };
    } | GraphQLScalarType | {
        [enumValue: string]: string | number;
    };
}
//# sourceMappingURL=resolverMap.d.ts.map