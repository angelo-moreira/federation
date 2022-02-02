import { ASTNode, GraphQLError, Source } from "graphql";
import { SchemaRootKind } from "./definitions";
export declare type ErrorCodeMetadata = {
    addedIn: string;
    replaces?: string[];
};
export declare type GraphQLErrorArgs = {
    message: string;
    nodes?: readonly ASTNode[] | ASTNode;
    source?: Source;
    positions?: readonly number[];
    path?: readonly (string | number)[];
    originalError?: Error | null;
    extensions?: {
        [key: string]: unknown;
    };
};
export declare type ErrorCodeDefinition = {
    code: string;
    description: string;
    metadata: ErrorCodeMetadata;
    err: (args: GraphQLErrorArgs) => GraphQLError;
};
export declare type ErrorCodeCategory<TElement = string> = {
    get(element: TElement): ErrorCodeDefinition;
};
export declare function errorCode(e: GraphQLError): string | undefined;
export declare function errorCodeDef(e: GraphQLError | string): ErrorCodeDefinition | undefined;
export declare const ERROR_CATEGORIES: {
    DIRECTIVE_FIELDS_MISSING_EXTERNAL: ErrorCodeCategory<string> & {
        createCode(element: string): ErrorCodeDefinition;
    };
    DIRECTIVE_UNSUPPORTED_ON_INTERFACE: ErrorCodeCategory<string> & {
        createCode(element: string): ErrorCodeDefinition;
    };
    DIRECTIVE_INVALID_FIELDS_TYPE: ErrorCodeCategory<string> & {
        createCode(element: string): ErrorCodeDefinition;
    };
    DIRECTIVE_INVALID_FIELDS: ErrorCodeCategory<string> & {
        createCode(element: string): ErrorCodeDefinition;
    };
    FIELDS_HAS_ARGS: ErrorCodeCategory<string> & {
        createCode(element: string): ErrorCodeDefinition;
    };
    ROOT_TYPE_USED: ErrorCodeCategory<SchemaRootKind> & {
        createCode(element: SchemaRootKind): ErrorCodeDefinition;
    };
};
export declare const ERRORS: {
    INVALID_GRAPHQL: ErrorCodeDefinition;
    TAG_DEFINITION_INVALID: ErrorCodeDefinition;
    KEY_FIELDS_HAS_ARGS: ErrorCodeDefinition;
    PROVIDES_FIELDS_HAS_ARGS: ErrorCodeDefinition;
    REQUIRES_FIELDS_HAS_ARGS: ErrorCodeDefinition;
    PROVIDES_MISSING_EXTERNAL: ErrorCodeDefinition;
    REQUIRES_MISSING_EXTERNAL: ErrorCodeDefinition;
    KEY_UNSUPPORTED_ON_INTERFACE: ErrorCodeDefinition;
    PROVIDES_UNSUPPORTED_ON_INTERFACE: ErrorCodeDefinition;
    REQUIRES_UNSUPPORTED_ON_INTERFACE: ErrorCodeDefinition;
    EXTERNAL_UNUSED: ErrorCodeDefinition;
    PROVIDES_ON_NON_OBJECT_FIELD: ErrorCodeDefinition;
    KEY_INVALID_FIELDS_TYPE: ErrorCodeDefinition;
    PROVIDES_INVALID_FIELDS_TYPE: ErrorCodeDefinition;
    REQUIRES_INVALID_FIELDS_TYPE: ErrorCodeDefinition;
    KEY_INVALID_FIELDS: ErrorCodeDefinition;
    PROVIDES_INVALID_FIELDS: ErrorCodeDefinition;
    REQUIRES_INVALID_FIELDS: ErrorCodeDefinition;
    KEY_FIELDS_SELECT_INVALID_TYPE: ErrorCodeDefinition;
    ROOT_QUERY_USED: ErrorCodeDefinition;
    ROOT_MUTATION_USED: ErrorCodeDefinition;
    ROOT_SUBSCRIPTION_USED: ErrorCodeDefinition;
    INVALID_SUBGRAPH_NAME: ErrorCodeDefinition;
    NO_QUERIES: ErrorCodeDefinition;
    INTERFACE_FIELD_NO_IMPLEM: ErrorCodeDefinition;
    TYPE_KIND_MISMATCH: ErrorCodeDefinition;
    EXTERNAL_TYPE_MISMATCH: ErrorCodeDefinition;
    EXTERNAL_ARGUMENT_MISSING: ErrorCodeDefinition;
    EXTERNAL_ARGUMENT_TYPE_MISMATCH: ErrorCodeDefinition;
    EXTERNAL_ARGUMENT_DEFAULT_MISMATCH: ErrorCodeDefinition;
    FIELD_TYPE_MISMATCH: ErrorCodeDefinition;
    ARGUMENT_TYPE_MISMATCH: ErrorCodeDefinition;
    INPUT_FIELD_DEFAULT_MISMATCH: ErrorCodeDefinition;
    ARGUMENT_DEFAULT_MISMATCH: ErrorCodeDefinition;
    EXTENSION_WITH_NO_BASE: ErrorCodeDefinition;
    EXTERNAL_MISSING_ON_BASE: ErrorCodeDefinition;
    INTERFACE_FIELD_IMPLEM_TYPE_MISMATCH: ErrorCodeDefinition;
    SATISFIABILITY_ERROR: ErrorCodeDefinition;
};
export declare const REMOVED_ERRORS: string[][];
//# sourceMappingURL=error.d.ts.map