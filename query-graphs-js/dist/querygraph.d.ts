import { MultiMap, NamedType, Schema, SchemaRootKind, SelectionSet, MapWithCachedArrays, ExternalTester } from '@apollo/federation-internals';
import { Transition } from './transition';
export declare function federatedGraphRootTypeName(rootKind: SchemaRootKind): string;
export declare function isFederatedGraphRootType(type: NamedType): boolean;
export declare class Vertex {
    readonly index: number;
    readonly type: NamedType;
    readonly source: string;
    constructor(index: number, type: NamedType, source: string);
    toString(): string;
}
export declare class RootVertex extends Vertex {
    readonly rootKind: SchemaRootKind;
    constructor(rootKind: SchemaRootKind, index: number, type: NamedType, source: string);
    toString(): string;
}
export declare function isRootVertex(vertex: Vertex): vertex is RootVertex;
export declare class Edge {
    readonly index: number;
    readonly head: Vertex;
    readonly tail: Vertex;
    readonly transition: Transition;
    private _conditions?;
    constructor(index: number, head: Vertex, tail: Vertex, transition: Transition, conditions?: SelectionSet);
    get conditions(): SelectionSet | undefined;
    isEdgeForField(name: string): boolean;
    matchesSupergraphTransition(supergraph: Schema, otherTransition: Transition): boolean;
    label(): string;
    withNewHead(newHead: Vertex): Edge;
    addToConditions(newConditions: SelectionSet): void;
    toString(): string;
}
export declare class QueryGraph {
    readonly name: string;
    private readonly vertices;
    private readonly adjacencies;
    private readonly typesToVertices;
    private readonly rootVertices;
    readonly sources: ReadonlyMap<string, Schema>;
    private readonly externalTesters;
    constructor(name: string, vertices: Vertex[], adjacencies: Edge[][], typesToVertices: MultiMap<string, number>, rootVertices: MapWithCachedArrays<SchemaRootKind, RootVertex>, sources: ReadonlyMap<string, Schema>);
    verticesCount(): number;
    edgesCount(): number;
    rootKinds(): readonly SchemaRootKind[];
    roots(): readonly RootVertex[];
    root(kind: SchemaRootKind): RootVertex | undefined;
    outEdges(vertex: Vertex): readonly Edge[];
    outEdge(vertex: Vertex, edgeIndex: number): Edge | undefined;
    isTerminal(vertex: Vertex): boolean;
    verticesForType(typeName: string): Vertex[];
    externalTester(source: string): ExternalTester;
}
export declare class QueryGraphState<VertexState, EdgeState = undefined> {
    readonly graph: QueryGraph;
    private readonly verticesStates;
    private readonly adjacenciesStates;
    constructor(graph: QueryGraph);
    setVertexState(vertex: Vertex, state: VertexState): void;
    removeVertexState(vertex: Vertex): void;
    getVertexState(vertex: Vertex): VertexState | undefined;
    setEdgeState(edge: Edge, state: EdgeState): void;
    removeEdgeState(edge: Edge): void;
    getEdgeState(edge: Edge): EdgeState | undefined;
    toDebugString(vertexMapper: (s: VertexState) => string, edgeMapper: (e: EdgeState) => string): string;
}
export declare function buildQueryGraph(name: string, schema: Schema): QueryGraph;
export declare function buildSupergraphAPIQueryGraph(supergraph: Schema): QueryGraph;
export declare function buildFederatedQueryGraph(supergraph: Schema, forQueryPlanning: boolean): QueryGraph;
export declare function simpleTraversal(graph: QueryGraph, onVertex: (v: Vertex) => void, onEdges: (e: Edge) => boolean): void;
//# sourceMappingURL=querygraph.d.ts.map