import { BuiltIns, Schema, DirectiveDefinition, NamedType, Directive, FieldDefinition, CompositeType, InputFieldDefinition } from "./definitions";
import { SDLValidationRule } from "graphql/validation/ValidationContext";
import { ASTNode, DocumentNode, GraphQLError } from "graphql";
import { SelectionSet } from './operations';
import { ErrorCodeDefinition } from "./error";
export declare const entityTypeName = "_Entity";
export declare const serviceTypeName = "_Service";
export declare const anyTypeName = "_Any";
export declare const fieldSetTypeName = "_FieldSet";
export declare const keyDirectiveName = "key";
export declare const extendsDirectiveName = "extends";
export declare const externalDirectiveName = "external";
export declare const requiresDirectiveName = "requires";
export declare const providesDirectiveName = "provides";
export declare const tagDirectiveName = "tag";
export declare const serviceFieldName = "_service";
export declare const entitiesFieldName = "_entities";
export declare const FEDERATION_RESERVED_SUBGRAPH_NAME = "_";
export declare class FederationBuiltIns extends BuiltIns {
    addBuiltInTypes(schema: Schema): void;
    addBuiltInDirectives(schema: Schema): void;
    prepareValidation(schema: Schema): void;
    onValidation(schema: Schema): GraphQLError[];
    validationRules(): readonly SDLValidationRule[];
    keyDirective(schema: Schema): DirectiveDefinition<{
        fields: any;
    }>;
    extendsDirective(schema: Schema): DirectiveDefinition<Record<string, never>>;
    externalDirective(schema: Schema): DirectiveDefinition<Record<string, never>>;
    requiresDirective(schema: Schema): DirectiveDefinition<{
        fields: any;
    }>;
    providesDirective(schema: Schema): DirectiveDefinition<{
        fields: any;
    }>;
    tagDirective(schema: Schema): DirectiveDefinition<{
        name: string;
    }>;
    maybeUpdateSubgraphDocument(schema: Schema, document: DocumentNode): DocumentNode;
}
export declare const federationBuiltIns: FederationBuiltIns;
export declare function isFederationSubgraphSchema(schema: Schema): boolean;
export declare function isFederationType(type: NamedType): boolean;
export declare function isFederationTypeName(typeName: string): boolean;
export declare function isFederationField(field: FieldDefinition<CompositeType>): boolean;
export declare function isFederationDirective(directive: DirectiveDefinition | Directive): boolean;
export declare function isEntityType(type: NamedType): boolean;
export declare function buildSubgraph(name: string, source: DocumentNode | string): Schema;
export declare function parseFieldSetArgument(parentType: CompositeType, directive: Directive<NamedType | FieldDefinition<CompositeType>, {
    fields: any;
}>, fieldAccessor?: (type: CompositeType, fieldName: string) => FieldDefinition<any> | undefined): SelectionSet;
export interface ServiceDefinition {
    typeDefs: DocumentNode;
    name: string;
    url?: string;
}
export declare function subgraphsFromServiceList(serviceList: ServiceDefinition[]): Subgraphs | GraphQLError[];
export declare class Subgraphs {
    private readonly subgraphs;
    add(subgraph: Subgraph): Subgraph;
    add(name: string, url: string, schema: Schema | DocumentNode | string): Subgraph;
    get(name: string): Subgraph | undefined;
    size(): number;
    names(): readonly string[];
    values(): readonly Subgraph[];
    [Symbol.iterator](): Generator<Subgraph, void, unknown>;
    toString(): string;
}
export declare class Subgraph {
    readonly name: string;
    readonly url: string;
    readonly schema: Schema;
    constructor(name: string, url: string, schema: Schema, validateSchema?: boolean);
    toString(): string;
}
export declare type SubgraphASTNode = ASTNode & {
    subgraph: string;
};
export declare function addSubgraphToASTNode(node: ASTNode, subgraph: string): SubgraphASTNode;
export declare function addSubgraphToError(e: GraphQLError, subgraphName: string, errorCode?: ErrorCodeDefinition): GraphQLError;
export declare class ExternalTester {
    readonly schema: Schema;
    private readonly fakeExternalFields;
    constructor(schema: Schema);
    private collectFakeExternals;
    isExternal(field: FieldDefinition<any> | InputFieldDefinition): boolean;
    isFakeExternal(field: FieldDefinition<any> | InputFieldDefinition): boolean;
    selectsAnyExternalField(selectionSet: SelectionSet): boolean;
}
//# sourceMappingURL=federation.d.ts.map