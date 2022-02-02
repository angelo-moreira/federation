import { GraphQLDirective, GraphQLNamedType, GraphQLInputObjectType, DirectiveNode, GraphQLField, FieldDefinitionNode, InputValueDefinitionNode, SchemaDefinitionNode, TypeSystemExtensionNode, TypeDefinitionNode, ExecutableDefinitionNode, DirectiveDefinitionNode } from 'graphql';
export declare const KeyDirective: GraphQLDirective;
export declare const ExtendsDirective: GraphQLDirective;
export declare const ExternalDirective: GraphQLDirective;
export declare const RequiresDirective: GraphQLDirective;
export declare const ProvidesDirective: GraphQLDirective;
export declare const TagDirective: GraphQLDirective;
export declare const federationDirectives: GraphQLDirective[];
export declare function isFederationDirective(directive: GraphQLDirective): boolean;
export declare const otherKnownDirectives: GraphQLDirective[];
export declare const knownSubgraphDirectives: GraphQLDirective[];
export declare function isKnownSubgraphDirective(directive: GraphQLDirective): boolean;
export declare type ASTNodeWithDirectives = FieldDefinitionNode | InputValueDefinitionNode | ExecutableDefinitionNode | SchemaDefinitionNode | TypeDefinitionNode | TypeSystemExtensionNode;
export declare type GraphQLNamedTypeWithDirectives = Exclude<GraphQLNamedType, GraphQLInputObjectType>;
export declare function gatherDirectives(type: GraphQLNamedTypeWithDirectives | GraphQLField<any, any>): DirectiveNode[];
export declare function typeIncludesDirective(type: GraphQLNamedType, directiveName: string): boolean;
export declare function directiveDefinitionsAreCompatible(baseDefinition: DirectiveDefinitionNode, toCompare: DirectiveDefinitionNode): boolean;
//# sourceMappingURL=directives.d.ts.map