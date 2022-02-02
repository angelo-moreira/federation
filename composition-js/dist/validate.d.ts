import { Operation, Schema, SchemaRootKind } from "@apollo/federation-internals";
import { Edge, QueryGraph, RootPath, Transition, ConditionResolver } from "@apollo/query-graphs";
export declare class ValidationError extends Error {
    readonly supergraphUnsatisfiablePath: RootPath<Transition>;
    readonly subgraphsPaths: RootPath<Transition>[];
    readonly witness: Operation;
    constructor(message: string, supergraphUnsatisfiablePath: RootPath<Transition>, subgraphsPaths: RootPath<Transition>[], witness: Operation);
}
export declare function validateGraphComposition(supergraph: QueryGraph, subgraphs: QueryGraph): {
    errors?: ValidationError[];
};
export declare function computeSubgraphPaths(supergraphPath: RootPath<Transition>, subgraphs: QueryGraph): {
    traversal?: ValidationState;
    isComplete?: boolean;
    error?: ValidationError;
};
export declare class ValidationState {
    readonly supergraphPath: RootPath<Transition>;
    readonly subgraphPaths: RootPath<Transition>[];
    constructor(supergraphPath: RootPath<Transition>, subgraphPaths: RootPath<Transition>[]);
    static initial(supergraph: QueryGraph, kind: SchemaRootKind, subgraphs: QueryGraph): ValidationState;
    validateTransition(supergraphSchema: Schema, supergraphEdge: Edge, conditionResolver: ConditionValidationResolver): ValidationState | undefined | ValidationError;
    currentSubgraphs(): string[];
    toString(): string;
}
declare class ConditionValidationResolver {
    private readonly supergraphSchema;
    private readonly federatedQueryGraph;
    readonly resolver: ConditionResolver;
    constructor(supergraphSchema: Schema, federatedQueryGraph: QueryGraph);
    private validateConditions;
    private advanceState;
}
export {};
//# sourceMappingURL=validate.d.ts.map