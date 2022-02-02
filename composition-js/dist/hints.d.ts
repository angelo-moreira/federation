import { SubgraphASTNode } from "@apollo/federation-internals";
export declare class HintID {
    readonly code: string;
    readonly description: string;
    readonly mainElementDescription: string;
    constructor(code: string, description: string, mainElementDescription: string);
    toString(): string;
}
export declare const hintInconsistentFieldType: HintID;
export declare const hintInconsistentArgumentType: HintID;
export declare const hintInconsistentDefaultValue: HintID;
export declare const hintInconsistentEntity: HintID;
export declare const hintInconsistentObjectValueTypeField: HintID;
export declare const hintInconsistentInterfaceValueTypeField: HintID;
export declare const hintInconsistentInputObjectField: HintID;
export declare const hintInconsistentUnionMember: HintID;
export declare const hintInconsistentEnumValue: HintID;
export declare const hintInconsistentTypeSystemDirectiveRepeatable: HintID;
export declare const hintInconsistentTypeSystemDirectiveLocations: HintID;
export declare const hintInconsistentExecutionDirectivePresence: HintID;
export declare const hintNoExecutionDirectiveLocationsIntersection: HintID;
export declare const hintInconsistentExecutionDirectiveRepeatable: HintID;
export declare const hintInconsistentExecutionDirectiveLocations: HintID;
export declare const hintInconsistentDescription: HintID;
export declare const hintInconsistentArgumentPresence: HintID;
export declare class CompositionHint {
    readonly id: HintID;
    readonly message: string;
    readonly elementCoordinate: string;
    readonly nodes?: readonly SubgraphASTNode[];
    constructor(id: HintID, message: string, elementCoordinate: string, nodes?: readonly SubgraphASTNode[] | SubgraphASTNode);
    toString(): string;
}
export declare function printHint(hint: CompositionHint): string;
//# sourceMappingURL=hints.d.ts.map