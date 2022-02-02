import { NamedType, OperationElement, Schema, SchemaRootKind, SelectionSet, ObjectType } from "@apollo/federation-internals";
import { OpPathTree } from "./pathTree";
import { Vertex, QueryGraph, Edge, RootVertex } from "./querygraph";
import { Transition } from "./transition";
import { PathContext } from "./pathContext";
export declare class GraphPath<TTrigger, RV extends Vertex = Vertex, TNullEdge extends null | never = never> implements Iterable<[Edge | TNullEdge, TTrigger, OpPathTree | null]> {
    readonly graph: QueryGraph;
    readonly root: RV;
    readonly tail: Vertex;
    private readonly edgeTriggers;
    private readonly edgeIndexes;
    private readonly edgeConditions;
    private readonly subgraphEnteringEdgeIndex;
    readonly subgraphEnteringEdge: Edge | undefined;
    readonly subgraphEnteringEdgeCost: number;
    private readonly edgeToTail;
    private readonly runtimeTypesOfTail;
    private readonly runtimeTypesBeforeTailIfLastIsCast?;
    private constructor();
    static create<TTrigger, RV extends Vertex = Vertex, TNullEdge extends null | never = never>(graph: QueryGraph, root: RV): GraphPath<TTrigger, RV, TNullEdge>;
    static fromGraphRoot<TTrigger, TNullEdge extends null | never = never>(graph: QueryGraph, rootKind: SchemaRootKind): RootPath<TTrigger, TNullEdge> | undefined;
    get size(): number;
    subgraphJumps(): number;
    [Symbol.iterator](): PathIterator<TTrigger, TNullEdge>;
    lastEdge(): Edge | TNullEdge | undefined;
    lastTrigger(): TTrigger | undefined;
    tailPossibleRuntimeTypes(): readonly ObjectType[];
    add(trigger: TTrigger, edge: Edge | TNullEdge, conditionsResolution: ConditionResolution): GraphPath<TTrigger, RV, TNullEdge>;
    concat(tailPath: GraphPath<TTrigger, Vertex, TNullEdge>): GraphPath<TTrigger, RV, TNullEdge>;
    checkDirectPathFomPreviousSubgraphTo(typeName: string, triggerToEdge: (graph: QueryGraph, vertex: Vertex, t: TTrigger) => Edge | null | undefined): Vertex | undefined;
    nextEdges(): readonly Edge[];
    isTerminal(): boolean;
    isRootPath(): this is RootPath<TTrigger, TNullEdge>;
    mapMainPath<T>(mapper: (e: Edge | TNullEdge, pathIdx: number) => T): T[];
    private edgeAt;
    reduceMainPath<T>(reducer: (accumulator: T, edge: Edge | TNullEdge, pathIdx: number) => T, initialValue: T): T;
    hasJustCycled(): boolean;
    hasAnyEdgeConditions(): boolean;
    isOnTopLevelQueryRoot(): boolean;
    truncateTrailingDowncasts(): GraphPath<TTrigger, RV, TNullEdge>;
    toString(): string;
}
export interface PathIterator<TTrigger, TNullEdge extends null | never = never> extends Iterator<[Edge | TNullEdge, TTrigger, OpPathTree | null]> {
    currentIndex: number;
    currentVertex: Vertex;
}
export declare type RootPath<TTrigger, TNullEdge extends null | never = never> = GraphPath<TTrigger, RootVertex, TNullEdge>;
export declare type OpTrigger = OperationElement | PathContext;
export declare type OpGraphPath<RV extends Vertex = Vertex> = GraphPath<OpTrigger, RV, null>;
export declare type OpRootPath = OpGraphPath<RootVertex>;
export declare function isRootPath(path: OpGraphPath<any>): path is OpRootPath;
export declare function terminateWithNonRequestedTypenameField<V extends Vertex>(path: OpGraphPath<V>): OpGraphPath<V>;
export declare function traversePath(path: GraphPath<any>, onEdges: (edge: Edge) => void): void;
export declare type ConditionResolver = (edge: Edge, context: PathContext, excludedEdges: ExcludedEdges, excludedConditions: ExcludedConditions) => ConditionResolution;
export declare type ConditionResolution = {
    satisfied: boolean;
    cost: number;
    pathTree?: OpPathTree;
    unsatisfiedConditionReason?: UnsatisfiedConditionReason;
};
export declare enum UnsatisfiedConditionReason {
    NO_POST_REQUIRE_KEY = 0
}
export declare const noConditionsResolution: ConditionResolution;
export declare const unsatisfiedConditionsResolution: ConditionResolution;
export declare enum UnadvanceableReason {
    UNSATISFIABLE_KEY_CONDITION = 0,
    UNSATISFIABLE_REQUIRES_CONDITION = 1,
    NO_MATCHING_TRANSITION = 2,
    UNREACHABLE_TYPE = 3,
    IGNORED_INDIRECT_PATH = 4
}
export declare type Unadvanceable = {
    sourceSubgraph: string;
    destSubgraph: string;
    reason: UnadvanceableReason;
    details: string;
};
export declare class Unadvanceables {
    readonly reasons: Unadvanceable[];
    constructor(reasons: Unadvanceable[]);
}
export declare function isUnadvanceable<V extends Vertex>(result: GraphPath<Transition, V>[] | Unadvanceables): result is Unadvanceables;
export declare function advancePathWithTransition<V extends Vertex>(supergraph: Schema, subgraphPath: GraphPath<Transition, V>, transition: Transition, targetType: NamedType, conditionResolver: ConditionResolver): GraphPath<Transition, V>[] | Unadvanceables;
export declare type ExcludedEdges = readonly [number, number][];
export declare function sameExcludedEdges(ex1: ExcludedEdges, ex2: ExcludedEdges): boolean;
export declare type ExcludedConditions = readonly SelectionSet[];
export declare function addConditionExclusion(excluded: ExcludedConditions, newExclusion: SelectionSet | undefined): ExcludedConditions;
export declare type IndirectPaths<TTrigger, V extends Vertex = Vertex, TNullEdge extends null | never = never, TDeadEnds extends Unadvanceables | never = Unadvanceables> = {
    paths: GraphPath<TTrigger, V, TNullEdge>[];
    deadEnds: TDeadEnds;
};
export declare function getLocallySatisfiableKey(graph: QueryGraph, typeVertex: Vertex): SelectionSet | undefined;
export declare type SimultaneousPaths<V extends Vertex = Vertex> = OpGraphPath<V>[];
declare type OpIndirectPaths<V extends Vertex> = IndirectPaths<OpTrigger, V, null, never>;
export declare class SimultaneousPathsWithLazyIndirectPaths<V extends Vertex = Vertex> {
    readonly paths: SimultaneousPaths<V>;
    readonly context: PathContext;
    readonly conditionResolver: ConditionResolver;
    readonly excludedNonCollectingEdges: ExcludedEdges;
    readonly excludedConditionsOnNonCollectingEdges: ExcludedConditions;
    private lazilyComputedIndirectPaths;
    constructor(paths: SimultaneousPaths<V>, context: PathContext, conditionResolver: ConditionResolver, excludedNonCollectingEdges?: ExcludedEdges, excludedConditionsOnNonCollectingEdges?: ExcludedConditions);
    indirectOptions(updatedContext: PathContext, pathIdx: number): OpIndirectPaths<V>;
    private computeIndirectPaths;
    toString(): string;
}
export declare function simultaneousPathsToString(simultaneousPaths: SimultaneousPaths<any> | SimultaneousPathsWithLazyIndirectPaths<any>, indentOnNewLine?: string): string;
export declare function advanceOptionsToString(options: (SimultaneousPaths<any> | SimultaneousPathsWithLazyIndirectPaths<any> | GraphPath<any>)[] | undefined): string;
export declare function advanceSimultaneousPathsWithOperation<V extends Vertex>(supergraphSchema: Schema, subgraphSimultaneousPaths: SimultaneousPathsWithLazyIndirectPaths<V>, operation: OperationElement): SimultaneousPathsWithLazyIndirectPaths<V>[] | undefined;
export {};
//# sourceMappingURL=graphPath.d.ts.map