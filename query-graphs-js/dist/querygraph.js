"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleTraversal = exports.buildFederatedQueryGraph = exports.buildSupergraphAPIQueryGraph = exports.buildQueryGraph = exports.QueryGraphState = exports.QueryGraph = exports.Edge = exports.isRootVertex = exports.RootVertex = exports.Vertex = exports.isFederatedGraphRootType = exports.federatedGraphRootTypeName = void 0;
const federation_internals_1 = require("@apollo/federation-internals");
const util_1 = require("util");
const transition_1 = require("./transition");
const structuralSubtyping_1 = require("./structuralSubtyping");
const FEDERATED_GRAPH_ROOT_SOURCE = federation_internals_1.FEDERATION_RESERVED_SUBGRAPH_NAME;
const FEDERATED_GRAPH_ROOT_SCHEMA = new federation_internals_1.Schema();
function federatedGraphRootTypeName(rootKind) {
    return `[${rootKind}]`;
}
exports.federatedGraphRootTypeName = federatedGraphRootTypeName;
function isFederatedGraphRootType(type) {
    return type.name.startsWith('[') && type.name.endsWith(']');
}
exports.isFederatedGraphRootType = isFederatedGraphRootType;
class Vertex {
    constructor(index, type, source) {
        this.index = index;
        this.type = type;
        this.source = source;
    }
    toString() {
        return `${this.type}(${this.source})`;
    }
}
exports.Vertex = Vertex;
class RootVertex extends Vertex {
    constructor(rootKind, index, type, source) {
        super(index, type, source);
        this.rootKind = rootKind;
    }
    toString() {
        return super.toString() + '*';
    }
}
exports.RootVertex = RootVertex;
function toRootVertex(vertex, rootKind) {
    return new RootVertex(rootKind, vertex.index, vertex.type, vertex.source);
}
function isRootVertex(vertex) {
    return vertex instanceof RootVertex;
}
exports.isRootVertex = isRootVertex;
class Edge {
    constructor(index, head, tail, transition, conditions) {
        this.index = index;
        this.head = head;
        this.tail = tail;
        this.transition = transition;
        this._conditions = conditions;
    }
    get conditions() {
        return this._conditions;
    }
    isEdgeForField(name) {
        return this.transition.kind === 'FieldCollection' && this.transition.definition.name === name;
    }
    matchesSupergraphTransition(supergraph, otherTransition) {
        const transition = this.transition;
        switch (transition.kind) {
            case 'FieldCollection':
                if (otherTransition.kind === 'FieldCollection') {
                    return (0, structuralSubtyping_1.isStructuralFieldSubtype)(transition.definition, otherTransition.definition, federation_internals_1.ALL_SUBTYPING_RULES, (union, maybeMember) => supergraph.type(union.name).hasTypeMember(maybeMember.name), (maybeImplementer, itf) => supergraph.type(maybeImplementer.name).implementsInterface(itf));
                }
                else {
                    return false;
                }
            case 'DownCast':
                return otherTransition.kind === 'DownCast' && transition.castedType.name === otherTransition.castedType.name;
            default:
                return transition.kind === otherTransition.kind;
        }
    }
    label() {
        if (this.transition instanceof transition_1.SubgraphEnteringTransition && !this._conditions) {
            return "";
        }
        return this._conditions ? `${this._conditions} ⊢ ${this.transition}` : this.transition.toString();
    }
    withNewHead(newHead) {
        return new Edge(this.index, newHead, this.tail, this.transition, this._conditions);
    }
    addToConditions(newConditions) {
        if (!this._conditions) {
            this._conditions = new federation_internals_1.SelectionSet(this.head.type);
        }
        this._conditions.mergeIn(newConditions);
    }
    toString() {
        return `${this.head} -> ${this.tail} (${this.label()})`;
    }
}
exports.Edge = Edge;
class QueryGraph {
    constructor(name, vertices, adjacencies, typesToVertices, rootVertices, sources) {
        this.name = name;
        this.vertices = vertices;
        this.adjacencies = adjacencies;
        this.typesToVertices = typesToVertices;
        this.rootVertices = rootVertices;
        this.sources = sources;
        this.externalTesters = new Map();
    }
    verticesCount() {
        return this.vertices.length;
    }
    edgesCount() {
        return this.adjacencies.reduce((acc, v) => acc + v.length, 0);
    }
    rootKinds() {
        return this.rootVertices.keys();
    }
    roots() {
        return this.rootVertices.values();
    }
    root(kind) {
        return this.rootVertices.get(kind);
    }
    outEdges(vertex) {
        return this.adjacencies[vertex.index];
    }
    outEdge(vertex, edgeIndex) {
        return this.adjacencies[vertex.index][edgeIndex];
    }
    isTerminal(vertex) {
        return this.outEdges(vertex).length == 0;
    }
    verticesForType(typeName) {
        const indexes = this.typesToVertices.get(typeName);
        return indexes == undefined ? [] : indexes.map(i => this.vertices[i]);
    }
    externalTester(source) {
        let tester = this.externalTesters.get(source);
        if (!tester) {
            const schema = this.sources.get(source);
            (0, federation_internals_1.assert)(schema, () => `Unknown source: ${source}`);
            tester = new federation_internals_1.ExternalTester(schema);
        }
        return tester;
    }
}
exports.QueryGraph = QueryGraph;
class QueryGraphState {
    constructor(graph) {
        this.graph = graph;
        this.verticesStates = new Array(graph.verticesCount());
        this.adjacenciesStates = new Array(graph.verticesCount());
    }
    setVertexState(vertex, state) {
        this.verticesStates[vertex.index] = state;
    }
    removeVertexState(vertex) {
        this.verticesStates[vertex.index] = undefined;
    }
    getVertexState(vertex) {
        return this.verticesStates[vertex.index];
    }
    setEdgeState(edge, state) {
        if (!this.adjacenciesStates[edge.head.index]) {
            this.adjacenciesStates[edge.head.index] = new Array(this.graph.outEdges(edge.head).length);
        }
        this.adjacenciesStates[edge.head.index][edge.index] = state;
    }
    removeEdgeState(edge) {
        this.adjacenciesStates[edge.head.index][edge.index] = undefined;
    }
    getEdgeState(edge) {
        const forEdge = this.adjacenciesStates[edge.head.index];
        return forEdge ? forEdge[edge.index] : undefined;
    }
    toDebugString(vertexMapper, edgeMapper) {
        const vs = this.verticesStates.map((state, idx) => ` ${idx}: ${!state ? "<null>" : vertexMapper(state)}`).join("\n");
        const es = this.adjacenciesStates.map((adj, vIdx) => adj.map((state, eIdx) => ` ${vIdx}[${eIdx}]: ${!state ? "<null>" : edgeMapper(state)}`).join("\n")).join("\n");
        return `vertices = {${vs}\n}, edges = {${es}\n}`;
    }
}
exports.QueryGraphState = QueryGraphState;
function buildQueryGraph(name, schema) {
    return buildGraphInternal(name, schema, false);
}
exports.buildQueryGraph = buildQueryGraph;
function buildGraphInternal(name, schema, addAdditionalAbstractTypeEdges, supergraphSchema) {
    const builder = new GraphBuilderFromSchema(name, schema, supergraphSchema);
    for (const rootType of schema.schemaDefinition.roots()) {
        builder.addRecursivelyFromRoot(rootType.rootKind, rootType.type);
    }
    if (addAdditionalAbstractTypeEdges) {
        builder.addAdditionalAbstractTypeEdges();
    }
    return builder.build();
}
function buildSupergraphAPIQueryGraph(supergraph) {
    return buildQueryGraph("supergraph", supergraph);
}
exports.buildSupergraphAPIQueryGraph = buildSupergraphAPIQueryGraph;
function buildFederatedQueryGraph(supergraph, forQueryPlanning) {
    const subgraphs = (0, federation_internals_1.extractSubgraphsFromSupergraph)(supergraph);
    const graphs = [];
    for (const subgraph of subgraphs) {
        graphs.push(buildGraphInternal(subgraph.name, subgraph.schema, forQueryPlanning, supergraph));
    }
    return federateSubgraphs(graphs);
}
exports.buildFederatedQueryGraph = buildFederatedQueryGraph;
function federatedProperties(subgraphs) {
    let vertices = 0;
    const rootKinds = new Set();
    const schemas = [];
    for (const subgraph of subgraphs) {
        vertices += subgraph.verticesCount();
        subgraph.rootKinds().forEach(k => rootKinds.add(k));
        (0, federation_internals_1.assert)(subgraph.sources.size === 1, () => `Subgraphs should only have one sources, got ${subgraph.sources.size} ([${(0, federation_internals_1.mapKeys)(subgraph.sources).join(', ')}])`);
        schemas.push((0, federation_internals_1.firstOf)(subgraph.sources.values()));
    }
    return [vertices + rootKinds.size, rootKinds, schemas];
}
function federateSubgraphs(subgraphs) {
    const [verticesCount, rootKinds, schemas] = federatedProperties(subgraphs);
    const builder = new GraphBuilder(verticesCount);
    rootKinds.forEach(k => builder.createRootVertex(k, new federation_internals_1.ObjectType(federatedGraphRootTypeName(k)), FEDERATED_GRAPH_ROOT_SOURCE, FEDERATED_GRAPH_ROOT_SCHEMA));
    const copyPointers = new Array(subgraphs.length);
    for (const [i, subgraph] of subgraphs.entries()) {
        copyPointers[i] = builder.copyGraph(subgraph);
    }
    for (const [i, subgraph] of subgraphs.entries()) {
        const copyPointer = copyPointers[i];
        for (const rootKind of subgraph.rootKinds()) {
            const rootVertex = copyPointer.copiedVertex(subgraph.root(rootKind));
            builder.addEdge(builder.root(rootKind), rootVertex, transition_1.subgraphEnteringTransition);
            for (const [j, otherSubgraph] of subgraphs.entries()) {
                if (i === j) {
                    continue;
                }
                const otherRootVertex = otherSubgraph.root(rootKind);
                if (otherRootVertex) {
                    const otherCopyPointer = copyPointers[j];
                    builder.addEdge(rootVertex, otherCopyPointer.copiedVertex(otherRootVertex), new transition_1.RootTypeResolution(rootKind));
                }
            }
        }
    }
    for (const [i, subgraph] of subgraphs.entries()) {
        const subgraphSchema = schemas[i];
        const keyDirective = federation_internals_1.federationBuiltIns.keyDirective(subgraphSchema);
        const requireDirective = federation_internals_1.federationBuiltIns.requiresDirective(subgraphSchema);
        simpleTraversal(subgraph, v => {
            const type = v.type;
            for (const keyApplication of type.appliedDirectivesOf(keyDirective)) {
                (0, federation_internals_1.assert)((0, federation_internals_1.isInterfaceType)(type) || (0, federation_internals_1.isObjectType)(type), () => `Invalid "@key" application on non Object || Interface type "${type}"`);
                const conditions = (0, federation_internals_1.parseFieldSetArgument)(type, keyApplication);
                for (const [j, otherSubgraph] of subgraphs.entries()) {
                    if (i == j) {
                        continue;
                    }
                    const otherVertices = otherSubgraph.verticesForType(type.name);
                    if (otherVertices.length == 0) {
                        continue;
                    }
                    (0, federation_internals_1.assert)(otherVertices.length == 1, () => `Subgraph ${j} should have a single vertex for type ${type.name} but got ${otherVertices.length}: ${(0, util_1.inspect)(otherVertices)}`);
                    const head = copyPointers[j].copiedVertex(otherVertices[0]);
                    const tail = copyPointers[i].copiedVertex(v);
                    builder.addEdge(head, tail, new transition_1.KeyResolution(), conditions);
                }
            }
        }, e => {
            if (e.transition.kind === 'FieldCollection') {
                const type = e.head.type;
                const field = e.transition.definition;
                (0, federation_internals_1.assert)((0, federation_internals_1.isCompositeType)(type), () => `Non composite type "${type}" should not have field collection edge ${e}`);
                for (const requiresApplication of field.appliedDirectivesOf(requireDirective)) {
                    const conditions = (0, federation_internals_1.parseFieldSetArgument)(type, requiresApplication);
                    const head = copyPointers[i].copiedVertex(e.head);
                    const copiedEdge = builder.edge(head, e.index);
                    copiedEdge.addToConditions(conditions);
                }
            }
            return true;
        });
    }
    for (const [i, subgraph] of subgraphs.entries()) {
        const subgraphSchema = schemas[i];
        const providesDirective = federation_internals_1.federationBuiltIns.providesDirective(subgraphSchema);
        simpleTraversal(subgraph, _ => undefined, e => {
            if (e.transition.kind === 'FieldCollection') {
                const type = e.head.type;
                const field = e.transition.definition;
                (0, federation_internals_1.assert)((0, federation_internals_1.isCompositeType)(type), () => `Non composite type "${type}" should not have field collection edge ${e}`);
                for (const providesApplication of field.appliedDirectivesOf(providesDirective)) {
                    const fieldType = (0, federation_internals_1.baseType)(field.type);
                    (0, federation_internals_1.assert)((0, federation_internals_1.isCompositeType)(fieldType), () => `Invalid @provide on field "${field}" whose type "${fieldType}" is not a composite type`);
                    const provided = (0, federation_internals_1.parseFieldSetArgument)(fieldType, providesApplication);
                    const head = copyPointers[i].copiedVertex(e.head);
                    const tail = copyPointers[i].copiedVertex(e.tail);
                    const copiedEdge = builder.edge(head, e.index);
                    const copiedTail = builder.makeCopy(tail);
                    builder.updateEdgeTail(copiedEdge, copiedTail);
                    addProvidesEdges(subgraphSchema, builder, copiedTail, provided);
                }
            }
            return true;
        });
    }
    return builder.build(FEDERATED_GRAPH_ROOT_SOURCE);
}
function addProvidesEdges(schema, builder, from, provided) {
    const stack = [[from, provided]];
    const source = from.source;
    while (stack.length > 0) {
        const [v, selectionSet] = stack.pop();
        for (const selection of selectionSet.selections(true)) {
            const element = selection.element();
            if (element.kind == 'Field') {
                const fieldDef = element.definition;
                const existingEdge = builder.edges(v).find(e => e.transition.kind === 'FieldCollection' && e.transition.definition.name === fieldDef.name);
                if (existingEdge) {
                    if (selection.selectionSet) {
                        const copiedTail = builder.makeCopy(existingEdge.tail);
                        builder.updateEdgeTail(existingEdge, copiedTail);
                        stack.push([copiedTail, selection.selectionSet]);
                    }
                }
                else {
                    const fieldType = (0, federation_internals_1.baseType)(fieldDef.type);
                    const existingTail = builder.verticesForType(fieldType.name).find(v => v.source === source);
                    const newTail = existingTail ? existingTail : builder.createNewVertex(fieldType, v.source, schema);
                    if (selection.selectionSet) {
                        const copiedTail = existingTail ? builder.makeCopy(existingTail) : newTail;
                        builder.addEdge(v, copiedTail, new transition_1.FieldCollection(fieldDef, true));
                        stack.push([copiedTail, selection.selectionSet]);
                    }
                    else {
                        builder.addEdge(v, newTail, new transition_1.FieldCollection(fieldDef, true));
                    }
                }
            }
            else {
                const typeCondition = element.typeCondition;
                if (typeCondition) {
                    const existingEdge = builder.edges(v).find(e => e.transition.kind === 'DownCast' && e.transition.castedType.name === typeCondition.name);
                    (0, federation_internals_1.assert)(existingEdge, () => `Shouldn't have ${selection} with no corresponding edge on ${v}`);
                    const copiedTail = builder.makeCopy(existingEdge.tail);
                    builder.updateEdgeTail(existingEdge, copiedTail);
                    stack.push([copiedTail, selection.selectionSet]);
                }
                else {
                    stack.push([v, selection.selectionSet]);
                }
            }
        }
    }
}
class GraphBuilder {
    constructor(verticesCount) {
        this.nextIndex = 0;
        this.typesToVertices = new federation_internals_1.MultiMap();
        this.rootVertices = new federation_internals_1.MapWithCachedArrays();
        this.sources = new Map();
        this.vertices = verticesCount ? new Array(verticesCount) : [];
        this.adjacencies = verticesCount ? new Array(verticesCount) : [];
    }
    verticesForType(typeName) {
        const indexes = this.typesToVertices.get(typeName);
        return indexes == undefined ? [] : indexes.map(i => this.vertices[i]);
    }
    root(kind) {
        return this.rootVertices.get(kind);
    }
    addEdge(head, tail, transition, conditions) {
        const edges = this.adjacencies[head.index];
        const edge = new Edge(edges.length, head, tail, transition, conditions);
        edges.push(edge);
    }
    createNewVertex(type, source, schema, index) {
        if (!index) {
            index = this.nextIndex++;
        }
        const vertex = new Vertex(index, type, source);
        const previous = this.vertices[index];
        (0, federation_internals_1.assert)(!previous, () => `Overriding existing vertex ${previous} with ${vertex}`);
        this.vertices[index] = vertex;
        this.typesToVertices.add(type.name, index);
        this.adjacencies[index] = [];
        if (!this.sources.has(source)) {
            this.sources.set(source, schema);
        }
        return vertex;
    }
    createRootVertex(kind, type, source, schema) {
        const vertex = this.createNewVertex(type, source, schema);
        (0, federation_internals_1.assert)(!this.rootVertices.has(kind), () => `Root vertex for ${kind} (${this.rootVertices.get(kind)}) already exists: cannot replace by ${vertex}`);
        this.setAsRoot(kind, vertex.index);
    }
    setAsRoot(kind, index) {
        const vertex = this.vertices[index];
        (0, federation_internals_1.assert)(vertex, () => `Cannot set non-existing vertex at index ${index} as root ${kind}`);
        const rootVertex = toRootVertex(vertex, kind);
        this.vertices[vertex.index] = rootVertex;
        this.rootVertices.set(kind, rootVertex);
        const rootEdges = this.adjacencies[vertex.index];
        for (let i = 0; i < rootEdges.length; i++) {
            rootEdges[i] = rootEdges[i].withNewHead(rootVertex);
        }
    }
    copyGraph(graph) {
        const offset = this.nextIndex;
        simpleTraversal(graph, v => {
            this.getOrCopyVertex(v, offset, graph);
        }, e => {
            const newHead = this.getOrCopyVertex(e.head, offset, graph);
            const newTail = this.getOrCopyVertex(e.tail, offset, graph);
            this.addEdge(newHead, newTail, e.transition, e.conditions);
            return true;
        });
        this.nextIndex += graph.verticesCount();
        const that = this;
        return {
            copiedVertex(original) {
                const vertex = that.vertices[original.index + offset];
                (0, federation_internals_1.assert)(vertex, () => `Vertex ${original} has no copy for offset ${offset}`);
                return vertex;
            }
        };
    }
    vertex(index) {
        return this.vertices[index];
    }
    edge(head, index) {
        return this.adjacencies[head.index][index];
    }
    edges(head) {
        return this.adjacencies[head.index];
    }
    makeCopy(vertex) {
        const newVertex = this.createNewVertex(vertex.type, vertex.source, this.sources.get(vertex.source));
        for (const edge of this.adjacencies[vertex.index]) {
            this.addEdge(newVertex, edge.tail, edge.transition, edge.conditions);
        }
        return newVertex;
    }
    updateEdgeTail(edge, newTail) {
        const newEdge = new Edge(edge.index, edge.head, newTail, edge.transition, edge.conditions);
        this.adjacencies[edge.head.index][edge.index] = newEdge;
        return newEdge;
    }
    getOrCopyVertex(toCopy, indexOffset, graph) {
        const index = toCopy.index + indexOffset;
        let v = this.vertices[index];
        if (!v) {
            v = this.createNewVertex(toCopy.type, toCopy.source, graph.sources.get(toCopy.source), index);
        }
        return v;
    }
    build(name) {
        return new QueryGraph(name, this.vertices, this.adjacencies, this.typesToVertices, this.rootVertices, this.sources);
    }
}
class GraphBuilderFromSchema extends GraphBuilder {
    constructor(name, schema, supergraphSchema) {
        super();
        this.name = name;
        this.schema = schema;
        this.supergraphSchema = supergraphSchema;
        this.isFederatedSubgraph = (0, federation_internals_1.isFederationSubgraphSchema)(schema);
        (0, federation_internals_1.assert)(!this.isFederatedSubgraph || supergraphSchema, `Missing supergraph schema for building the federated subgraph graph`);
        this.forceTypeExplosion = supergraphSchema !== undefined && (0, federation_internals_1.isFed1Supergraph)(supergraphSchema);
    }
    addRecursivelyFromRoot(kind, root) {
        this.setAsRoot(kind, this.addTypeRecursively(root).index);
    }
    addTypeRecursively(type) {
        const namedType = (0, federation_internals_1.baseType)(type);
        const existing = this.verticesForType(namedType.name);
        if (existing.length > 0) {
            (0, federation_internals_1.assert)(existing.length == 1, () => `Only one vertex should have been created for type ${namedType.name}, got ${existing.length}: ${(0, util_1.inspect)(this)}`);
            return existing[0];
        }
        const vertex = this.createNewVertex(namedType, this.name, this.schema);
        if ((0, federation_internals_1.isObjectType)(namedType)) {
            this.addObjectTypeEdges(namedType, vertex);
        }
        else if ((0, federation_internals_1.isInterfaceType)(namedType)) {
            if (this.isFederatedSubgraph && !this.forceTypeExplosion) {
                this.maybeAddInterfaceFieldsEdges(namedType, vertex);
            }
            this.addAbstractTypeEdges(namedType, vertex);
        }
        else if ((0, federation_internals_1.isUnionType)(namedType)) {
            this.addEdgeForField(namedType.typenameField(), vertex);
            this.addAbstractTypeEdges(namedType, vertex);
        }
        return vertex;
    }
    addObjectTypeEdges(type, head) {
        for (const field of type.allFields()) {
            if (field.isSchemaIntrospectionField() || field.hasAppliedDirective(federation_internals_1.externalDirectiveName)) {
                continue;
            }
            this.addEdgeForField(field, head);
        }
    }
    addEdgeForField(field, head) {
        const tail = this.addTypeRecursively(field.type);
        this.addEdge(head, tail, new transition_1.FieldCollection(field));
    }
    isDirectlyProvidedByType(type, fieldName) {
        const field = type.field(fieldName);
        return field && !field.hasAppliedDirective(federation_internals_1.externalDirectiveName) && !field.hasAppliedDirective(federation_internals_1.requiresDirectiveName);
    }
    maybeAddInterfaceFieldsEdges(type, head) {
        (0, federation_internals_1.assert)(this.supergraphSchema, 'Missing supergraph schema when building a subgraph');
        const supergraphType = this.supergraphSchema.type(type.name);
        if (!supergraphType) {
            return;
        }
        const supergraphRuntimeTypes = supergraphType.possibleRuntimeTypes().map(t => t.name);
        const localRuntimeTypes = supergraphRuntimeTypes.map(t => this.schema.type(t)).filter(t => t !== undefined);
        for (const field of type.allFields()) {
            if (field.hasAppliedDirective(federation_internals_1.externalDirectiveName) || localRuntimeTypes.some(t => !this.isDirectlyProvidedByType(t, field.name))) {
                continue;
            }
            this.addEdgeForField(field, head);
        }
    }
    addAbstractTypeEdges(type, head) {
        const implementations = (0, federation_internals_1.isInterfaceType)(type) ? type.possibleRuntimeTypes() : type.types();
        for (const implementationType of implementations) {
            const tail = this.addTypeRecursively(implementationType);
            this.addEdge(head, tail, new transition_1.DownCast(type, implementationType));
        }
    }
    addAdditionalAbstractTypeEdges() {
        const abstractTypesWithTheirRuntimeTypes = [];
        for (const type of this.schema.types()) {
            if ((0, federation_internals_1.isAbstractType)(type)) {
                abstractTypesWithTheirRuntimeTypes.push([type, (0, federation_internals_1.possibleRuntimeTypes)(type)]);
            }
        }
        for (let i = 0; i < abstractTypesWithTheirRuntimeTypes.length - 1; i++) {
            const [t1, t1Runtimes] = abstractTypesWithTheirRuntimeTypes[i];
            const t1Vertex = this.addTypeRecursively(t1);
            for (let j = i; j < abstractTypesWithTheirRuntimeTypes.length; j++) {
                const [t2, t2Runtimes] = abstractTypesWithTheirRuntimeTypes[j];
                if ((0, federation_internals_1.isInterfaceType)(t1) && (0, federation_internals_1.isInterfaceType)(t2) && (t1.implementsInterface(t2) || t2.implementsInterface(t1))) {
                    continue;
                }
                const intersecting = t1Runtimes.filter(o1 => t2Runtimes.includes(o1));
                if (intersecting.length >= 2) {
                    const t2Vertex = this.addTypeRecursively(t2);
                    this.addEdge(t1Vertex, t2Vertex, new transition_1.DownCast(t1, t2));
                    this.addEdge(t2Vertex, t1Vertex, new transition_1.DownCast(t2, t1));
                }
            }
        }
    }
    build() {
        return super.build(this.name);
    }
}
function simpleTraversal(graph, onVertex, onEdges) {
    const marked = new Array(graph.verticesCount());
    const stack = [];
    const maybeAdd = function (vertex) {
        if (!marked[vertex.index]) {
            stack.push(vertex);
            marked[vertex.index] = true;
        }
    };
    graph.roots().forEach(maybeAdd);
    while (stack.length > 0) {
        const vertex = stack.pop();
        onVertex(vertex);
        for (const edge of graph.outEdges(vertex)) {
            const shouldTraverse = onEdges(edge);
            if (shouldTraverse) {
                maybeAdd(edge.tail);
            }
        }
    }
}
exports.simpleTraversal = simpleTraversal;
//# sourceMappingURL=querygraph.js.map