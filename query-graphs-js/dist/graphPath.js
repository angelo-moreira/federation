"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.advanceSimultaneousPathsWithOperation = exports.advanceOptionsToString = exports.simultaneousPathsToString = exports.SimultaneousPathsWithLazyIndirectPaths = exports.getLocallySatisfiableKey = exports.addConditionExclusion = exports.sameExcludedEdges = exports.advancePathWithTransition = exports.isUnadvanceable = exports.Unadvanceables = exports.UnadvanceableReason = exports.unsatisfiedConditionsResolution = exports.noConditionsResolution = exports.UnsatisfiedConditionReason = exports.traversePath = exports.terminateWithNonRequestedTypenameField = exports.isRootPath = exports.GraphPath = void 0;
const federation_internals_1 = require("@apollo/federation-internals");
const pathTree_1 = require("./pathTree");
const querygraph_1 = require("./querygraph");
const pathContext_1 = require("./pathContext");
const debug = (0, federation_internals_1.newDebugLogger)('path');
function updateRuntimeTypes(currentRuntimeTypes, edge) {
    var _a;
    if (!edge) {
        return currentRuntimeTypes;
    }
    switch (edge.transition.kind) {
        case 'FieldCollection':
            const field = edge.transition.definition;
            if (!(0, federation_internals_1.isCompositeType)((0, federation_internals_1.baseType)(field.type))) {
                return [];
            }
            const newRuntimeTypes = [];
            for (const parentType of currentRuntimeTypes) {
                const fieldType = (_a = parentType.field(field.name)) === null || _a === void 0 ? void 0 : _a.type;
                if (fieldType) {
                    for (const type of (0, federation_internals_1.possibleRuntimeTypes)((0, federation_internals_1.baseType)(fieldType))) {
                        if (!newRuntimeTypes.includes(type)) {
                            newRuntimeTypes.push(type);
                        }
                    }
                }
            }
            return newRuntimeTypes;
        case 'DownCast':
            const castedType = edge.transition.castedType;
            const castedRuntimeTypes = (0, federation_internals_1.possibleRuntimeTypes)(castedType);
            return currentRuntimeTypes.filter(t => castedRuntimeTypes.includes(t));
        case 'KeyResolution':
            const currentType = edge.tail.type;
            return (0, federation_internals_1.possibleRuntimeTypes)(currentType);
        case 'RootTypeResolution':
        case 'SubgraphEnteringTransition':
            (0, federation_internals_1.assert)((0, federation_internals_1.isObjectType)(edge.tail.type), () => `Query edge should be between object type but got ${edge}`);
            return [edge.tail.type];
    }
}
function withReplacedLastElement(arr, newLast) {
    (0, federation_internals_1.assert)(arr.length > 0, 'Should not have been called on empty array');
    const newArr = new Array(arr.length);
    for (let i = 0; i < arr.length - 1; i++) {
        newArr[i] = arr[i];
    }
    newArr[arr.length - 1] = newLast;
    return newArr;
}
class GraphPath {
    constructor(graph, root, tail, edgeTriggers, edgeIndexes, edgeConditions, subgraphEnteringEdgeIndex, subgraphEnteringEdge, subgraphEnteringEdgeCost, edgeToTail, runtimeTypesOfTail, runtimeTypesBeforeTailIfLastIsCast) {
        this.graph = graph;
        this.root = root;
        this.tail = tail;
        this.edgeTriggers = edgeTriggers;
        this.edgeIndexes = edgeIndexes;
        this.edgeConditions = edgeConditions;
        this.subgraphEnteringEdgeIndex = subgraphEnteringEdgeIndex;
        this.subgraphEnteringEdge = subgraphEnteringEdge;
        this.subgraphEnteringEdgeCost = subgraphEnteringEdgeCost;
        this.edgeToTail = edgeToTail;
        this.runtimeTypesOfTail = runtimeTypesOfTail;
        this.runtimeTypesBeforeTailIfLastIsCast = runtimeTypesBeforeTailIfLastIsCast;
    }
    static create(graph, root) {
        const runtimeTypes = (0, querygraph_1.isFederatedGraphRootType)(root.type) ? [] : (0, federation_internals_1.possibleRuntimeTypes)(root.type);
        return new GraphPath(graph, root, root, [], [], [], -1, undefined, -1, undefined, runtimeTypes);
    }
    static fromGraphRoot(graph, rootKind) {
        const root = graph.root(rootKind);
        return root ? this.create(graph, root) : undefined;
    }
    get size() {
        return this.edgeIndexes.length;
    }
    subgraphJumps() {
        let jumps = 0;
        let v = this.root;
        for (let i = 0; i < this.size; i++) {
            const edge = this.edgeAt(i, v);
            if (!edge) {
                continue;
            }
            if (edge.transition.kind === 'KeyResolution' || edge.transition.kind === 'RootTypeResolution') {
                ++jumps;
            }
            v = edge.tail;
        }
        return jumps;
    }
    [Symbol.iterator]() {
        const path = this;
        return {
            currentIndex: 0,
            currentVertex: this.root,
            next() {
                if (this.currentIndex >= path.size) {
                    return { done: true, value: undefined };
                }
                const idx = this.currentIndex++;
                const edge = path.edgeAt(idx, this.currentVertex);
                if (edge) {
                    this.currentVertex = edge.tail;
                }
                return { done: false, value: [edge, path.edgeTriggers[idx], path.edgeConditions[idx]] };
            }
        };
    }
    lastEdge() {
        return this.edgeToTail;
    }
    lastTrigger() {
        return this.edgeTriggers[this.size - 1];
    }
    tailPossibleRuntimeTypes() {
        return this.runtimeTypesOfTail;
    }
    add(trigger, edge, conditionsResolution) {
        var _a, _b, _c;
        (0, federation_internals_1.assert)(!edge || this.tail.index === edge.head.index, () => `Cannot add edge ${edge} to path ending at ${this.tail}`);
        (0, federation_internals_1.assert)(conditionsResolution.satisfied, 'Should add to a path if the conditions cannot be satisfied');
        (0, federation_internals_1.assert)(!edge || edge.conditions || !conditionsResolution.pathTree, () => `Shouldn't have conditions paths (got ${conditionsResolution.pathTree}) for edge without conditions (edge: ${edge})`);
        if (edge && edge.transition.kind === 'DownCast' && this.edgeToTail) {
            const previousOperation = this.lastTrigger();
            if (previousOperation instanceof federation_internals_1.FragmentElement && previousOperation.appliedDirectives.length === 0) {
                const runtimeTypesWithoutPreviousCast = updateRuntimeTypes(this.runtimeTypesBeforeTailIfLastIsCast, edge);
                if (runtimeTypesWithoutPreviousCast.length > 0
                    && runtimeTypesWithoutPreviousCast.every(t => this.runtimeTypesOfTail.includes(t))) {
                    const updatedEdge = this.graph.outEdges(this.edgeToTail.head).find(e => e.tail.type === edge.tail.type);
                    if (updatedEdge) {
                        debug.log(() => `Previous cast ${previousOperation} is made obsolete by new cast ${trigger}, removing from path.`);
                        return new GraphPath(this.graph, this.root, updatedEdge.tail, withReplacedLastElement(this.edgeTriggers, trigger), withReplacedLastElement(this.edgeIndexes, updatedEdge.index), withReplacedLastElement(this.edgeConditions, (_a = conditionsResolution.pathTree) !== null && _a !== void 0 ? _a : null), this.subgraphEnteringEdgeIndex, this.subgraphEnteringEdge, this.subgraphEnteringEdgeCost, updatedEdge, runtimeTypesWithoutPreviousCast, this.runtimeTypesBeforeTailIfLastIsCast);
                    }
                }
            }
        }
        let subgraphEnteringEdgeIndex = this.subgraphEnteringEdgeIndex;
        let subgraphEnteringEdge = this.subgraphEnteringEdge;
        let subgraphEnteringEdgeCost = this.subgraphEnteringEdgeCost;
        if (edge && edge.transition.kind === 'KeyResolution') {
            subgraphEnteringEdgeIndex = this.size;
            subgraphEnteringEdge = edge;
            subgraphEnteringEdgeCost = conditionsResolution.cost;
        }
        return new GraphPath(this.graph, this.root, edge ? edge.tail : this.tail, this.edgeTriggers.concat(trigger), this.edgeIndexes.concat((edge ? edge.index : null)), this.edgeConditions.concat((_b = conditionsResolution.pathTree) !== null && _b !== void 0 ? _b : null), subgraphEnteringEdgeIndex, subgraphEnteringEdge, subgraphEnteringEdgeCost, edge, updateRuntimeTypes(this.runtimeTypesOfTail, edge), ((_c = edge === null || edge === void 0 ? void 0 : edge.transition) === null || _c === void 0 ? void 0 : _c.kind) === 'DownCast' ? this.runtimeTypesOfTail : undefined);
    }
    concat(tailPath) {
        var _a, _b;
        (0, federation_internals_1.assert)(this.tail.index === tailPath.root.index, () => `Cannot concat ${tailPath} after ${this}`);
        if (tailPath.size === 0) {
            return this;
        }
        let prevRuntimeTypes = this.runtimeTypesBeforeTailIfLastIsCast;
        let runtimeTypes = this.runtimeTypesOfTail;
        for (const [edge] of tailPath) {
            prevRuntimeTypes = runtimeTypes;
            runtimeTypes = updateRuntimeTypes(runtimeTypes, edge);
        }
        return new GraphPath(this.graph, this.root, tailPath.tail, this.edgeTriggers.concat(tailPath.edgeTriggers), this.edgeIndexes.concat(tailPath.edgeIndexes), this.edgeConditions.concat(tailPath.edgeConditions), tailPath.subgraphEnteringEdge ? tailPath.subgraphEnteringEdgeIndex : this.subgraphEnteringEdgeIndex, tailPath.subgraphEnteringEdge ? tailPath.subgraphEnteringEdge : this.subgraphEnteringEdge, tailPath.subgraphEnteringEdge ? tailPath.subgraphEnteringEdgeCost : this.subgraphEnteringEdgeCost, tailPath.edgeToTail, runtimeTypes, ((_b = (_a = tailPath.edgeToTail) === null || _a === void 0 ? void 0 : _a.transition) === null || _b === void 0 ? void 0 : _b.kind) === 'DownCast' ? prevRuntimeTypes : undefined);
    }
    checkDirectPathFomPreviousSubgraphTo(typeName, triggerToEdge) {
        if (this.subgraphEnteringEdgeIndex < 0) {
            return undefined;
        }
        (0, federation_internals_1.assert)(this.subgraphEnteringEdge, 'Should have an entering edge since the index is >= 0');
        let prevSubgraphVertex = this.subgraphEnteringEdge.head;
        for (let i = this.subgraphEnteringEdgeIndex + 1; i < this.size; i++) {
            const triggerToMatch = this.edgeTriggers[i];
            const prevSubgraphMatchingEdge = triggerToEdge(this.graph, prevSubgraphVertex, triggerToMatch);
            if (prevSubgraphMatchingEdge === null) {
                continue;
            }
            if (!prevSubgraphMatchingEdge || prevSubgraphMatchingEdge.conditions) {
                return undefined;
            }
            prevSubgraphVertex = prevSubgraphMatchingEdge.tail;
        }
        return prevSubgraphVertex.type.name === typeName ? prevSubgraphVertex : undefined;
    }
    nextEdges() {
        return this.graph.outEdges(this.tail);
    }
    isTerminal() {
        return this.graph.isTerminal(this.tail);
    }
    isRootPath() {
        return (0, querygraph_1.isRootVertex)(this.root);
    }
    mapMainPath(mapper) {
        const result = new Array(this.size);
        let v = this.root;
        for (let i = 0; i < this.size; i++) {
            const edge = this.edgeAt(i, v);
            result[i] = mapper(edge, i);
            if (edge) {
                v = edge.tail;
            }
        }
        return result;
    }
    edgeAt(index, v) {
        const edgeIdx = this.edgeIndexes[index];
        return (edgeIdx !== null ? this.graph.outEdge(v, edgeIdx) : null);
    }
    reduceMainPath(reducer, initialValue) {
        let value = initialValue;
        let v = this.root;
        for (let i = 0; i < this.size; i++) {
            const edge = this.edgeAt(i, v);
            value = reducer(value, edge, i);
            if (edge) {
                v = edge.tail;
            }
        }
        return value;
    }
    hasJustCycled() {
        if (this.root.index == this.tail.index) {
            return true;
        }
        let v = this.root;
        for (let i = 0; i < this.size - 1; i++) {
            const edge = this.edgeAt(i, v);
            if (!edge) {
                continue;
            }
            v = edge.tail;
            if (v.index == this.tail.index) {
                return true;
            }
        }
        return false;
    }
    hasAnyEdgeConditions() {
        return this.edgeConditions.some(c => c !== null);
    }
    isOnTopLevelQueryRoot() {
        if (!(0, querygraph_1.isRootVertex)(this.root)) {
            return false;
        }
        let vertex = this.root;
        for (let i = 0; i < this.size; i++) {
            const edge = this.edgeAt(i, vertex);
            if (!edge) {
                continue;
            }
            if (edge.transition.kind === 'FieldCollection' || edge.tail.type.name !== "Query") {
                return false;
            }
            vertex = edge.tail;
        }
        return true;
    }
    truncateTrailingDowncasts() {
        let lastNonDowncastIdx = -1;
        let v = this.root;
        let lastNonDowncastVertex = v;
        let lastNonDowncastEdge;
        let runtimeTypes = (0, querygraph_1.isFederatedGraphRootType)(this.root.type) ? [] : (0, federation_internals_1.possibleRuntimeTypes)(this.root.type);
        let runtimeTypesAtLastNonDowncastEdge = runtimeTypes;
        for (let i = 0; i < this.size; i++) {
            const edge = this.edgeAt(i, v);
            runtimeTypes = updateRuntimeTypes(runtimeTypes, edge);
            if (edge) {
                v = edge.tail;
                if (edge.transition.kind !== 'DownCast') {
                    lastNonDowncastIdx = i;
                    lastNonDowncastVertex = v;
                    lastNonDowncastEdge = edge;
                    runtimeTypesAtLastNonDowncastEdge = runtimeTypes;
                }
            }
        }
        if (lastNonDowncastIdx < 0 || lastNonDowncastIdx === this.size - 1) {
            return this;
        }
        const newSize = lastNonDowncastIdx + 1;
        return new GraphPath(this.graph, this.root, lastNonDowncastVertex, this.edgeTriggers.slice(0, newSize), this.edgeIndexes.slice(0, newSize), this.edgeConditions.slice(0, newSize), this.subgraphEnteringEdgeIndex, this.subgraphEnteringEdge, this.subgraphEnteringEdgeCost, lastNonDowncastEdge, runtimeTypesAtLastNonDowncastEdge);
    }
    toString() {
        const isRoot = (0, querygraph_1.isRootVertex)(this.root);
        if (isRoot && this.size === 0) {
            return '_';
        }
        const pathStr = this.mapMainPath((edge, idx) => {
            if (edge) {
                if (isRoot && idx == 0) {
                    return edge.tail.toString();
                }
                const label = edge.label();
                return ` -${label === "" ? "" : '-[' + label + ']-'}-> ${edge.tail}`;
            }
            return ` (${this.edgeTriggers[idx]}) `;
        }).join('');
        return `${isRoot ? '' : this.root}${pathStr} (types: [${this.runtimeTypesOfTail.join(', ')}])`;
    }
}
exports.GraphPath = GraphPath;
function isRootPath(path) {
    return (0, querygraph_1.isRootVertex)(path.root);
}
exports.isRootPath = isRootPath;
function terminateWithNonRequestedTypenameField(path) {
    path = path.truncateTrailingDowncasts();
    if (!(0, federation_internals_1.isCompositeType)(path.tail.type)) {
        return path;
    }
    const typenameField = new federation_internals_1.Field(path.tail.type.typenameField());
    const edge = edgeForField(path.graph, path.tail, typenameField);
    (0, federation_internals_1.assert)(edge, () => `We should have an edge from ${path.tail} for ${typenameField}`);
    return path.add(typenameField, edge, exports.noConditionsResolution);
}
exports.terminateWithNonRequestedTypenameField = terminateWithNonRequestedTypenameField;
function traversePath(path, onEdges) {
    for (const [edge, _, conditions] of path) {
        if (conditions) {
            (0, pathTree_1.traversePathTree)(conditions, onEdges);
        }
        onEdges(edge);
    }
}
exports.traversePath = traversePath;
var UnsatisfiedConditionReason;
(function (UnsatisfiedConditionReason) {
    UnsatisfiedConditionReason[UnsatisfiedConditionReason["NO_POST_REQUIRE_KEY"] = 0] = "NO_POST_REQUIRE_KEY";
})(UnsatisfiedConditionReason = exports.UnsatisfiedConditionReason || (exports.UnsatisfiedConditionReason = {}));
exports.noConditionsResolution = { satisfied: true, cost: 0 };
exports.unsatisfiedConditionsResolution = { satisfied: false, cost: -1 };
var UnadvanceableReason;
(function (UnadvanceableReason) {
    UnadvanceableReason[UnadvanceableReason["UNSATISFIABLE_KEY_CONDITION"] = 0] = "UNSATISFIABLE_KEY_CONDITION";
    UnadvanceableReason[UnadvanceableReason["UNSATISFIABLE_REQUIRES_CONDITION"] = 1] = "UNSATISFIABLE_REQUIRES_CONDITION";
    UnadvanceableReason[UnadvanceableReason["NO_MATCHING_TRANSITION"] = 2] = "NO_MATCHING_TRANSITION";
    UnadvanceableReason[UnadvanceableReason["UNREACHABLE_TYPE"] = 3] = "UNREACHABLE_TYPE";
    UnadvanceableReason[UnadvanceableReason["IGNORED_INDIRECT_PATH"] = 4] = "IGNORED_INDIRECT_PATH";
})(UnadvanceableReason = exports.UnadvanceableReason || (exports.UnadvanceableReason = {}));
class Unadvanceables {
    constructor(reasons) {
        this.reasons = reasons;
    }
}
exports.Unadvanceables = Unadvanceables;
function isUnadvanceable(result) {
    return result instanceof Unadvanceables;
}
exports.isUnadvanceable = isUnadvanceable;
function createPathTransitionToEdgeFct(supergraph) {
    return (graph, vertex, transition) => {
        for (const edge of graph.outEdges(vertex)) {
            if (transition.collectOperationElements && edge.matchesSupergraphTransition(supergraph, transition)) {
                return edge;
            }
        }
        return undefined;
    };
}
function advancePathWithTransition(supergraph, subgraphPath, transition, targetType, conditionResolver) {
    if (transition.kind === 'DownCast') {
        const supergraphRuntimeTypes = (0, federation_internals_1.possibleRuntimeTypes)(targetType);
        const subgraphRuntimeTypes = subgraphPath.tailPossibleRuntimeTypes();
        const intersection = supergraphRuntimeTypes.filter(t1 => subgraphRuntimeTypes.some(t2 => t1.name === t2.name)).map(t => t.name);
        if (intersection.length === 0) {
            debug.log(() => `No intersection between casted type ${targetType} and the possible types in this subgraph`);
            return [];
        }
    }
    debug.group(() => `Trying to advance ${subgraphPath} for ${transition}`);
    debug.group('Direct options:');
    const directOptions = advancePathWithDirectTransition(supergraph, subgraphPath, transition, conditionResolver);
    let options;
    const deadEnds = [];
    if (isUnadvanceable(directOptions)) {
        options = [];
        debug.groupEnd(() => 'No direct options');
        deadEnds.push(...directOptions.reasons);
    }
    else {
        debug.groupEnd(() => advanceOptionsToString(directOptions));
        if (directOptions.length > 0 && (0, federation_internals_1.isLeafType)(targetType)) {
            debug.groupEnd(() => `reached leaf type ${targetType} so not trying indirect paths`);
            return directOptions;
        }
        options = directOptions;
    }
    debug.group(`Computing indirect paths:`);
    const pathTransitionToEdge = createPathTransitionToEdgeFct(supergraph);
    const pathsWithNonCollecting = advancePathWithNonCollectingAndTypePreservingTransitions(subgraphPath, pathContext_1.emptyContext, conditionResolver, [], [], t => t, pathTransitionToEdge);
    if (pathsWithNonCollecting.paths.length > 0) {
        debug.groupEnd(() => `${pathsWithNonCollecting.paths.length} indirect paths`);
        debug.group('Validating indirect options:');
        for (const nonCollectingPath of pathsWithNonCollecting.paths) {
            debug.group(() => `For indirect path ${nonCollectingPath}:`);
            const pathsWithTransition = advancePathWithDirectTransition(supergraph, nonCollectingPath, transition, conditionResolver);
            if (isUnadvanceable(pathsWithTransition)) {
                debug.groupEnd(() => `Cannot be advanced with ${transition}`);
                deadEnds.push(...pathsWithTransition.reasons);
            }
            else {
                debug.groupEnd(() => `Adding valid option: ${pathsWithTransition}`);
                options = options.concat(pathsWithTransition);
            }
        }
        debug.groupEnd();
    }
    else {
        debug.groupEnd('no indirect paths');
    }
    debug.groupEnd(() => options.length > 0 ? advanceOptionsToString(options) : `Cannot advance ${transition} for this path`);
    if (options.length > 0) {
        return options;
    }
    const allDeadEnds = deadEnds.concat(pathsWithNonCollecting.deadEnds.reasons);
    if (transition.kind === 'FieldCollection') {
        const typeName = transition.definition.parent.name;
        const fieldName = transition.definition.name;
        const subgraphsWithDeadEnd = new Set(allDeadEnds.map(e => e.destSubgraph));
        for (const [subgraph, schema] of subgraphPath.graph.sources.entries()) {
            if (subgraphsWithDeadEnd.has(subgraph)) {
                continue;
            }
            const type = schema.type(typeName);
            if (type && (0, federation_internals_1.isCompositeType)(type) && type.field(fieldName)) {
                (0, federation_internals_1.assert)(!type.hasAppliedDirective(federation_internals_1.keyDirectiveName), () => `Expected type ${type} in ${subgraph} to not have keys`);
                allDeadEnds.push({
                    sourceSubgraph: subgraphPath.tail.source,
                    destSubgraph: subgraph,
                    reason: UnadvanceableReason.UNREACHABLE_TYPE,
                    details: `cannot move to subgraph "${subgraph}", which has field "${transition.definition.coordinate}", because type "${typeName}" has no @key defined in subgraph "${subgraph}"`
                });
            }
        }
    }
    return new Unadvanceables(allDeadEnds);
}
exports.advancePathWithTransition = advancePathWithTransition;
function isEdgeExcluded(edge, excluded) {
    return excluded.some(([vIdx, eIdx]) => edge.head.index === vIdx && edge.index === eIdx);
}
function sameExcludedEdges(ex1, ex2) {
    if (ex1 === ex2) {
        return true;
    }
    if (ex1.length !== ex2.length) {
        return false;
    }
    for (let i = 0; i < ex1.length; ++i) {
        if (ex1[i][0] !== ex2[i][0] || ex1[i][1] !== ex2[i][1]) {
            return false;
        }
    }
    return true;
}
exports.sameExcludedEdges = sameExcludedEdges;
function addEdgeExclusion(excluded, newExclusion) {
    return excluded.concat([[newExclusion.head.index, newExclusion.index]]);
}
function isConditionExcluded(condition, excluded) {
    if (!condition) {
        return false;
    }
    return excluded.find(e => condition.equals(e)) !== undefined;
}
function addConditionExclusion(excluded, newExclusion) {
    return newExclusion ? excluded.concat(newExclusion) : excluded;
}
exports.addConditionExclusion = addConditionExclusion;
function popMin(paths) {
    let minIdx = 0;
    let minSize = paths[0].size;
    for (let i = 1; i < paths.length; i++) {
        if (paths[i].size < minSize) {
            minSize = paths[i].size;
            minIdx = i;
        }
    }
    const min = paths[minIdx];
    paths.splice(minIdx, 1);
    return min;
}
function advancePathWithNonCollectingAndTypePreservingTransitions(path, context, conditionResolver, excludedEdges, excludedConditions, convertTransitionWithCondition, triggerToEdge) {
    var _a, _b;
    const isTopLevelPath = path.isOnTopLevelQueryRoot();
    const typeName = (0, querygraph_1.isFederatedGraphRootType)(path.tail.type) ? undefined : path.tail.type.name;
    const originalSource = path.tail.source;
    const bestPathBySource = new Map();
    const deadEnds = [];
    const toTry = [path];
    while (toTry.length > 0) {
        const toAdvance = popMin(toTry);
        const nextEdges = toAdvance.nextEdges().filter(e => !e.transition.collectOperationElements);
        if (nextEdges.length === 0) {
            debug.log(`Nothing to try for ${toAdvance}: it has no non-collecting outbound edges`);
            continue;
        }
        debug.group(() => `From ${toAdvance}:`);
        for (const edge of nextEdges) {
            debug.group(() => `Testing edge ${edge}`);
            if (isEdgeExcluded(edge, excludedEdges)) {
                debug.groupEnd(`Ignored: edge is excluded`);
                continue;
            }
            excludedEdges = addEdgeExclusion(excludedEdges, edge);
            if (isConditionExcluded(edge.conditions, excludedConditions)) {
                debug.groupEnd(`Ignored: edge condition is excluded`);
                continue;
            }
            const target = edge.tail;
            if (target.source === originalSource) {
                debug.groupEnd('Ignored: edge get us back to our original source');
                continue;
            }
            if (typeName && typeName != target.type.name) {
                debug.groupEnd('Ignored: edge does not get to our target type');
                continue;
            }
            if (isTopLevelPath && edge.transition.kind === 'RootTypeResolution') {
                debug.groupEnd(`Ignored: edge is a top-level "RootTypeResolution"`);
                continue;
            }
            const prevForSource = bestPathBySource.get(target.source);
            if (prevForSource === null) {
                debug.groupEnd(() => `Ignored: we've shown before than going to ${target.source} is not productive`);
                continue;
            }
            if (prevForSource
                && (prevForSource[0].size < toAdvance.size + 1
                    || (prevForSource[0].size == toAdvance.size + 1 && prevForSource[1] <= 1))) {
                debug.groupEnd(`Ignored: a better path to the same subgraph already added`);
                continue;
            }
            debug.group(() => `Validating conditions ${edge.conditions}`);
            const conditionResolution = canSatisfyConditions(toAdvance, edge, conditionResolver, context, excludedEdges, excludedConditions);
            if (conditionResolution.satisfied) {
                debug.groupEnd('Condition satisfied');
                if (prevForSource && prevForSource[0].size === toAdvance.size + 1 && prevForSource[1] <= conditionResolution.cost) {
                    debug.groupEnd('Ignored: a better path to the same subgraph already added');
                    continue;
                }
                const subgraphEnteringEdge = toAdvance.subgraphEnteringEdge;
                if (subgraphEnteringEdge && edge.transition.kind === 'KeyResolution' && subgraphEnteringEdge.tail.type.name !== typeName) {
                    const prevSubgraphVertex = toAdvance.checkDirectPathFomPreviousSubgraphTo(edge.tail.type.name, triggerToEdge);
                    const backToPreviousSubgraph = subgraphEnteringEdge.head.source === edge.tail.source;
                    const maxCost = toAdvance.subgraphEnteringEdgeCost + (backToPreviousSubgraph ? 0 : conditionResolution.cost);
                    if (prevSubgraphVertex
                        && (backToPreviousSubgraph
                            || hasValidDirectKeyEdge(toAdvance.graph, prevSubgraphVertex, edge.tail.source, conditionResolver, maxCost) != undefined)) {
                        debug.groupEnd(() => `Ignored: edge correspond to a detour by subgraph ${edge.head.source} from subgraph ${subgraphEnteringEdge.head.source}: `
                            + `we have a direct path from ${subgraphEnteringEdge.head.type} to ${edge.tail.type} in ${subgraphEnteringEdge.head.source}`
                            + (backToPreviousSubgraph ? '.' : ` and can move to ${edge.tail.source} from there`));
                        bestPathBySource.set(edge.tail.source, null);
                        deadEnds.push({
                            sourceSubgraph: toAdvance.tail.source,
                            destSubgraph: edge.tail.source,
                            reason: UnadvanceableReason.IGNORED_INDIRECT_PATH,
                            details: `ignoring moving to subgraph "${edge.tail.source}" using @key(fields: "${(_a = edge.conditions) === null || _a === void 0 ? void 0 : _a.toString(true, false)}") of "${edge.head.type}" because there is a more direct path in ${edge.tail.source} that avoids ${toAdvance.tail.source} altogether."`
                        });
                        continue;
                    }
                }
                const updatedPath = toAdvance.add(convertTransitionWithCondition(edge.transition, context), edge, conditionResolution);
                debug.log(() => `Using edge, advance path: ${updatedPath}`);
                bestPathBySource.set(target.source, [updatedPath, conditionResolution.cost]);
                if (edge.transition.kind === 'KeyResolution') {
                    toTry.push(updatedPath);
                }
            }
            else {
                debug.groupEnd('Condition unsatisfiable');
                deadEnds.push({
                    sourceSubgraph: toAdvance.tail.source,
                    destSubgraph: edge.tail.source,
                    reason: UnadvanceableReason.UNSATISFIABLE_KEY_CONDITION,
                    details: `cannot move to subgraph "${edge.tail.source}" using @key(fields: "${(_b = edge.conditions) === null || _b === void 0 ? void 0 : _b.toString(true, false)}") of "${edge.head.type}", the key field(s) cannot be resolved from subgraph "${toAdvance.tail.source}"`
                });
            }
            debug.groupEnd();
        }
        debug.groupEnd();
    }
    return {
        paths: (0, federation_internals_1.mapValues)(bestPathBySource).filter(p => p !== null).map(b => b[0]),
        deadEnds: new Unadvanceables(deadEnds)
    };
}
function hasValidDirectKeyEdge(graph, from, to, conditionResolver, maxCost) {
    for (const edge of graph.outEdges(from)) {
        if (edge.transition.kind !== 'KeyResolution' || edge.tail.source !== to) {
            continue;
        }
        const resolution = conditionResolver(edge, pathContext_1.emptyContext, [], []);
        if (!resolution.satisfied) {
            continue;
        }
        if (resolution.cost <= maxCost) {
            return true;
        }
    }
    return false;
}
function advancePathWithDirectTransition(supergraph, path, transition, conditionResolver) {
    const options = [];
    const deadEnds = [];
    for (const edge of path.nextEdges()) {
        if (!transition.collectOperationElements || !edge.matchesSupergraphTransition(supergraph, transition)) {
            continue;
        }
        const conditionResolution = canSatisfyConditions(path, edge, conditionResolver, pathContext_1.emptyContext, [], []);
        if (conditionResolution.satisfied) {
            options.push(path.add(transition, edge, conditionResolution));
        }
        else {
            (0, federation_internals_1.assert)(transition.kind === 'FieldCollection', () => `Shouldn't have conditions on direct transition ${transition}`);
            const field = transition.definition;
            const parentTypeInSubgraph = path.graph.sources.get(edge.head.source).type(field.parent.name);
            const details = conditionResolution.unsatisfiedConditionReason === UnsatisfiedConditionReason.NO_POST_REQUIRE_KEY
                ? `@require condition on field "${field.coordinate}" can be satisfied but missing usable key on "${parentTypeInSubgraph}" in subgraph "${edge.head.source}" to resume query`
                : `cannot satisfy @require conditions on field "${field.coordinate}"${warnOnKeyFieldsMarkedExternal(parentTypeInSubgraph)}`;
            deadEnds.push({
                sourceSubgraph: edge.head.source,
                destSubgraph: edge.head.source,
                reason: UnadvanceableReason.UNSATISFIABLE_REQUIRES_CONDITION,
                details
            });
        }
    }
    if (options.length > 0) {
        return options;
    }
    else if (deadEnds.length > 0) {
        return new Unadvanceables(deadEnds);
    }
    else {
        let details;
        const subgraph = path.tail.source;
        if (transition.kind === 'FieldCollection') {
            const schema = path.graph.sources.get(subgraph);
            const typeInSubgraph = schema.type(path.tail.type.name);
            const fieldInSubgraph = typeInSubgraph && (0, federation_internals_1.isCompositeType)(typeInSubgraph)
                ? typeInSubgraph.field(transition.definition.name)
                : undefined;
            if (fieldInSubgraph) {
                (0, federation_internals_1.assert)(fieldInSubgraph.hasAppliedDirective('external'), () => `${fieldInSubgraph.coordinate} in ${subgraph} is not external but there is no corresponding edge (edges from ${path} = [${path.nextEdges().join(', ')}])`);
                details = `field "${transition.definition.coordinate}" is not resolvable because marked @external`;
            }
            else {
                details = `cannot find field "${transition.definition.coordinate}"`;
            }
        }
        else {
            (0, federation_internals_1.assert)(transition.kind === 'DownCast', () => `Unhandled direct transition ${transition} of kind ${transition.kind}`);
            details = `cannot find type "${transition.castedType}"`;
        }
        return new Unadvanceables([{
                sourceSubgraph: subgraph,
                destSubgraph: subgraph,
                reason: UnadvanceableReason.NO_MATCHING_TRANSITION,
                details
            }]);
    }
}
function warnOnKeyFieldsMarkedExternal(type) {
    const keyDirective = federation_internals_1.federationBuiltIns.keyDirective(type.schema());
    const keys = type.appliedDirectivesOf(keyDirective);
    if (keys.length === 0) {
        return "";
    }
    const keyFieldMarkedExternal = [];
    for (const key of keys) {
        const fieldSet = (0, federation_internals_1.parseFieldSetArgument)(type, key);
        for (const selection of fieldSet.selections()) {
            if (selection.kind === 'FieldSelection' && selection.field.definition.hasAppliedDirective(federation_internals_1.externalDirectiveName)) {
                const fieldName = selection.field.name;
                if (!keyFieldMarkedExternal.includes(fieldName)) {
                    keyFieldMarkedExternal.push(fieldName);
                }
            }
        }
    }
    if (keyFieldMarkedExternal.length === 0) {
        return "";
    }
    const printedFields = keyFieldMarkedExternal.map(f => `"${f}"`).join(', ');
    const fieldWithPlural = keyFieldMarkedExternal.length === 1 ? 'field' : 'fields';
    return ` (please ensure that this is not due to key ${fieldWithPlural} ${printedFields} being accidentally marked @external)`;
}
function getLocallySatisfiableKey(graph, typeVertex) {
    const type = typeVertex.type;
    const externalTester = graph.externalTester(typeVertex.source);
    const keyDirective = federation_internals_1.federationBuiltIns.keyDirective(type.schema());
    for (const key of type.appliedDirectivesOf(keyDirective)) {
        const selection = (0, federation_internals_1.parseFieldSetArgument)(type, key);
        if (!externalTester.selectsAnyExternalField(selection)) {
            return selection;
        }
    }
    return undefined;
}
exports.getLocallySatisfiableKey = getLocallySatisfiableKey;
function canSatisfyConditions(path, edge, conditionResolver, context, excludedEdges, excludedConditions) {
    const conditions = edge.conditions;
    if (!conditions) {
        return exports.noConditionsResolution;
    }
    const resolution = conditionResolver(edge, context, excludedEdges, excludedConditions);
    if (!resolution.satisfied) {
        return exports.unsatisfiedConditionsResolution;
    }
    const pathTree = resolution.pathTree;
    const lastEdge = path.lastEdge();
    if (edge.transition.kind === 'FieldCollection'
        && lastEdge !== null
        && (lastEdge === null || lastEdge === void 0 ? void 0 : lastEdge.transition.kind) !== 'KeyResolution'
        && (!pathTree || pathTree.isAllInSameSubgraph())) {
        const postRequireKeyCondition = getLocallySatisfiableKey(path.graph, edge.head);
        if (!postRequireKeyCondition) {
            return { ...exports.unsatisfiedConditionsResolution, unsatisfiedConditionReason: UnsatisfiedConditionReason.NO_POST_REQUIRE_KEY };
        }
    }
    return resolution;
}
function isTerminalOperation(operation) {
    return operation.kind === 'Field' && (0, federation_internals_1.isLeafType)((0, federation_internals_1.baseType)(operation.definition.type));
}
class SimultaneousPathsWithLazyIndirectPaths {
    constructor(paths, context, conditionResolver, excludedNonCollectingEdges = [], excludedConditionsOnNonCollectingEdges = []) {
        this.paths = paths;
        this.context = context;
        this.conditionResolver = conditionResolver;
        this.excludedNonCollectingEdges = excludedNonCollectingEdges;
        this.excludedConditionsOnNonCollectingEdges = excludedConditionsOnNonCollectingEdges;
        this.lazilyComputedIndirectPaths = new Array(paths.length);
    }
    indirectOptions(updatedContext, pathIdx) {
        if (updatedContext !== this.context) {
            return this.computeIndirectPaths(pathIdx);
        }
        if (!this.lazilyComputedIndirectPaths[pathIdx]) {
            this.lazilyComputedIndirectPaths[pathIdx] = this.computeIndirectPaths(pathIdx);
        }
        return this.lazilyComputedIndirectPaths[pathIdx];
    }
    computeIndirectPaths(idx) {
        return advancePathWithNonCollectingAndTypePreservingTransitions(this.paths[idx], this.context, this.conditionResolver, this.excludedNonCollectingEdges, this.excludedConditionsOnNonCollectingEdges, (_t, context) => context, opPathTriggerToEdge);
    }
    toString() {
        return simultaneousPathsToString(this.paths);
    }
}
exports.SimultaneousPathsWithLazyIndirectPaths = SimultaneousPathsWithLazyIndirectPaths;
function simultaneousPathsToString(simultaneousPaths, indentOnNewLine = "") {
    const paths = Array.isArray(simultaneousPaths) ? simultaneousPaths : simultaneousPaths.paths;
    if (paths.length === 0) {
        return '<no path>';
    }
    if (paths.length === 1) {
        return paths[0].toString();
    }
    return `{\n${indentOnNewLine}  ` + paths.join(`\n${indentOnNewLine}  `) + `\n${indentOnNewLine}}`;
}
exports.simultaneousPathsToString = simultaneousPathsToString;
function advanceOptionsToString(options) {
    if (!options) {
        return '<no options>';
    }
    if (options.length === 0) {
        return '<unsatisfiable branch>';
    }
    if (options.length === 1) {
        return '[' + options[0] + ']';
    }
    return '[\n  ' + options.map(opt => Array.isArray(opt) ? simultaneousPathsToString(opt, "  ") : opt.toString()).join('\n  ') + '\n]';
}
exports.advanceOptionsToString = advanceOptionsToString;
function advanceSimultaneousPathsWithOperation(supergraphSchema, subgraphSimultaneousPaths, operation) {
    debug.group(() => `Trying to advance ${simultaneousPathsToString(subgraphSimultaneousPaths)} for ${operation}`);
    const updatedContext = subgraphSimultaneousPaths.context.withContextOf(operation);
    const optionsForEachPath = [];
    for (const [i, path] of subgraphSimultaneousPaths.paths.entries()) {
        debug.group(() => `Computing options for ${path}`);
        debug.group(() => `Direct options`);
        let options = advanceWithOperation(supergraphSchema, path, operation, updatedContext, subgraphSimultaneousPaths.conditionResolver);
        debug.groupEnd(() => advanceOptionsToString(options));
        if (options && (options.length === 0 || isTerminalOperation(operation) || operation.kind === 'FragmentElement')) {
            debug.groupEnd(() => `Final options for ${path}: ${advanceOptionsToString(options)}`);
            if (options.length > 0) {
                optionsForEachPath.push(options);
            }
            continue;
        }
        options = options !== null && options !== void 0 ? options : [];
        debug.group(`Computing indirect paths:`);
        const pathsWithNonCollecting = subgraphSimultaneousPaths.indirectOptions(updatedContext, i);
        debug.groupEnd(() => pathsWithNonCollecting.paths.length == 0 ? `no indirect paths` : `${pathsWithNonCollecting.paths.length} indirect paths`);
        if (pathsWithNonCollecting.paths.length > 0) {
            debug.group('Validating indirect options:');
            for (const pathWithNonCollecting of pathsWithNonCollecting.paths) {
                debug.group(() => `For indirect path ${pathWithNonCollecting}:`);
                const pathWithOperation = advanceWithOperation(supergraphSchema, pathWithNonCollecting, operation, updatedContext, subgraphSimultaneousPaths.conditionResolver);
                if (!pathWithOperation) {
                    debug.groupEnd(() => `Ignoring: cannot be advanced with ${operation}`);
                    continue;
                }
                debug.groupEnd(() => `Adding valid option: ${pathWithOperation}`);
                (0, federation_internals_1.assert)(pathWithOperation.length > 0, () => `Unexpected empty options after non-collecting path ${pathWithNonCollecting} for ${operation}`);
                options = options.concat(pathWithOperation);
            }
            debug.groupEnd();
        }
        if (options.length === 0) {
            debug.groupEnd();
            debug.groupEnd(() => `No valid options for ${operation}, aborting operation ${operation}`);
            return undefined;
        }
        else {
            debug.groupEnd(() => advanceOptionsToString(options));
            optionsForEachPath.push(options);
        }
    }
    const allOptions = flatCartesianProduct(optionsForEachPath);
    debug.groupEnd(() => advanceOptionsToString(allOptions));
    return createLazyOptions(allOptions, subgraphSimultaneousPaths, updatedContext);
}
exports.advanceSimultaneousPathsWithOperation = advanceSimultaneousPathsWithOperation;
function createLazyOptions(options, origin, context) {
    return options.map(option => new SimultaneousPathsWithLazyIndirectPaths(option, context, origin.conditionResolver, origin.excludedNonCollectingEdges, origin.excludedConditionsOnNonCollectingEdges));
}
function opPathTriggerToEdge(graph, vertex, trigger) {
    if (trigger instanceof pathContext_1.PathContext) {
        return undefined;
    }
    if (trigger.kind === 'Field') {
        return edgeForField(graph, vertex, trigger);
    }
    else {
        return trigger.typeCondition ? edgeForTypeCast(graph, vertex, trigger.typeCondition.name) : null;
    }
}
function flatCartesianProduct(arr) {
    const size = arr.length;
    if (size === 0) {
        return [];
    }
    const eltIndexes = new Array(size);
    let totalCombinations = 1;
    for (let i = 0; i < size; ++i) {
        const eltSize = arr[i].length;
        if (!eltSize) {
            totalCombinations = 0;
            break;
        }
        eltIndexes[i] = 0;
        totalCombinations *= eltSize;
    }
    const product = new Array(totalCombinations);
    for (let i = 0; i < totalCombinations; ++i) {
        let itemSize = 0;
        for (let j = 0; j < size; ++j) {
            itemSize += arr[j][eltIndexes[j]].length;
        }
        const item = new Array(itemSize);
        let k = 0;
        for (let j = 0; j < size; ++j) {
            for (const v of arr[j][eltIndexes[j]]) {
                item[k++] = v;
            }
        }
        product[i] = item;
        for (let idx = 0; idx < size; ++idx) {
            if (eltIndexes[idx] == arr[idx].length - 1) {
                eltIndexes[idx] = 0;
            }
            else {
                eltIndexes[idx] += 1;
                break;
            }
        }
    }
    return product;
}
function anImplementationHasAProvides(fieldName, itf) {
    for (const implem of itf.possibleRuntimeTypes()) {
        const field = implem.field(fieldName);
        if (field && field.hasAppliedDirective(federation_internals_1.providesDirectiveName)) {
            return true;
        }
    }
    return false;
}
function isProvidedEdge(edge) {
    return edge.transition.kind === 'FieldCollection' && edge.transition.isPartOfProvide;
}
function advanceWithOperation(supergraphSchema, path, operation, context, conditionResolver) {
    debug.group(() => `Trying to advance ${path} directly with ${operation}`);
    const currentType = path.tail.type;
    if ((0, querygraph_1.isFederatedGraphRootType)(currentType)) {
        debug.groupEnd('Cannot advance federated graph root with direct operations');
        return undefined;
    }
    if (operation.kind === 'Field') {
        const field = operation.definition;
        switch (currentType.kind) {
            case 'ObjectType':
                const edge = nextEdgeForField(path, operation);
                if (!edge) {
                    debug.groupEnd(() => `No edge for field ${field} on object type ${currentType}`);
                    return undefined;
                }
                const fieldOptions = addFieldEdge(path, operation, edge, conditionResolver, context);
                debug.groupEnd(() => fieldOptions
                    ? `Collected field ${field} on object type ${currentType}`
                    : `Cannot satisfy @requires on field ${field} for object type ${currentType}`);
                return fieldOptions;
            case 'InterfaceType':
                const itfEdge = nextEdgeForField(path, operation);
                let itfOptions = undefined;
                if (itfEdge) {
                    itfOptions = addFieldEdge(path, operation, itfEdge, conditionResolver, context);
                    (0, federation_internals_1.assert)(itfOptions, () => `Interface edge ${itfEdge} shouldn't have conditions`);
                    if (field.name === federation_internals_1.typenameFieldName || (!isProvidedEdge(itfEdge) && !anImplementationHasAProvides(field.name, currentType))) {
                        debug.groupEnd(() => `Collecting field ${field} on interface ${currentType} without type-exploding`);
                        return itfOptions;
                    }
                    else {
                        debug.log(() => `Collecting field ${field} on interface ${currentType} as 1st option`);
                    }
                }
                const implementations = path.tailPossibleRuntimeTypes();
                debug.log(() => itfOptions
                    ? `No direct edge: type exploding interface ${currentType} into possible runtime types [${implementations.join(', ')}]`
                    : `Type exploding interface ${currentType} into possible runtime types [${implementations.join(', ')}] as 2nd option`);
                const optionsByImplems = [];
                for (const implemType of implementations) {
                    const castOp = new federation_internals_1.FragmentElement(currentType, implemType.name);
                    debug.group(() => `Handling implementation ${implemType}`);
                    const implemOptions = advanceSimultaneousPathsWithOperation(supergraphSchema, new SimultaneousPathsWithLazyIndirectPaths([path], context, conditionResolver), castOp);
                    if (!implemOptions) {
                        debug.groupEnd();
                        debug.groupEnd(() => `Cannot collect field ${field} from ${implemType}: stopping with options ${advanceOptionsToString(itfOptions)}`);
                        return itfOptions;
                    }
                    if (implemOptions.length === 0) {
                        debug.groupEnd(() => `Cannot ever get ${implemType} from this branch, ignoring it`);
                        continue;
                    }
                    let withField = [];
                    debug.log(() => `Trying to collect ${field} from options ${advanceOptionsToString(implemOptions)}`);
                    for (const optPaths of implemOptions) {
                        debug.group(() => `For ${simultaneousPathsToString(optPaths)}`);
                        const withFieldOptions = advanceSimultaneousPathsWithOperation(supergraphSchema, optPaths, operation);
                        if (!withFieldOptions) {
                            debug.groupEnd(() => `Cannot collect ${field}`);
                            continue;
                        }
                        (0, federation_internals_1.assert)(withFieldOptions.length > 0, () => `Unexpected unsatisfiable path after ${optPaths} for ${operation}`);
                        debug.groupEnd(() => `Collected field ${field}: adding ${advanceOptionsToString(withFieldOptions)}`);
                        withField = withField.concat(withFieldOptions.map(opt => opt.paths));
                    }
                    if (withField.length === 0) {
                        debug.groupEnd();
                        debug.groupEnd(() => `Cannot collect field ${field} from ${implemType}: stopping with options ${advanceOptionsToString(itfOptions)}`);
                        return itfOptions;
                    }
                    debug.groupEnd(() => `Collected field ${field} from ${implemType}`);
                    optionsByImplems.push(withField);
                }
                const implemOptions = flatCartesianProduct(optionsByImplems);
                const allOptions = itfOptions ? itfOptions.concat(implemOptions) : implemOptions;
                debug.groupEnd(() => `With type-exploded options: ${advanceOptionsToString(allOptions)}`);
                return allOptions;
            case 'UnionType':
                (0, federation_internals_1.assert)(field.name === federation_internals_1.typenameFieldName, () => `Invalid field selection ${operation} for union type ${currentType}`);
                const typenameEdge = nextEdgeForField(path, operation);
                (0, federation_internals_1.assert)(typenameEdge, `Should always have an edge for __typename edge on an union`);
                debug.groupEnd(() => `Trivial collection of __typename for union ${currentType}`);
                return addFieldEdge(path, operation, typenameEdge, conditionResolver, context);
            default:
                (0, federation_internals_1.assert)(false, `Unexpected ${currentType.kind} type ${currentType} from ${path.tail} given operation ${operation}`);
        }
    }
    else {
        (0, federation_internals_1.assert)(operation.kind === 'FragmentElement', () => "Unhandled operation kind: " + operation.kind);
        if (!operation.typeCondition || currentType.name === operation.typeCondition.name) {
            debug.groupEnd(() => `No edge to take for condition ${operation} from current type ${currentType}`);
            const updatedPath = operation.appliedDirectives.length > 0
                ? path.add(operation, null, exports.noConditionsResolution)
                : path;
            return [[updatedPath]];
        }
        const typeName = operation.typeCondition.name;
        switch (currentType.kind) {
            case 'InterfaceType':
            case 'UnionType':
                const edge = nextEdgeForTypeCast(path, typeName);
                if (edge) {
                    (0, federation_internals_1.assert)(!edge.conditions, "TypeCast collecting edges shouldn't have conditions");
                    debug.groupEnd(() => `Using type-casting edge for ${typeName} from current type ${currentType}`);
                    return [[path.add(operation, edge, exports.noConditionsResolution)]];
                }
                const parentTypes = path.tailPossibleRuntimeTypes();
                const castedTypes = (0, federation_internals_1.possibleRuntimeTypes)(supergraphSchema.type(typeName));
                const intersection = parentTypes.filter(t1 => castedTypes.some(t2 => t1.name === t2.name)).map(t => t.name);
                debug.log(() => `Trying to type-explode into intersection between ${currentType} and ${typeName} = [${intersection}]`);
                const optionsByImplems = [];
                for (const tName of intersection) {
                    debug.group(() => `Trying ${tName}`);
                    const castOp = new federation_internals_1.FragmentElement(currentType, tName);
                    const implemOptions = advanceSimultaneousPathsWithOperation(supergraphSchema, new SimultaneousPathsWithLazyIndirectPaths([path], context, conditionResolver), castOp);
                    if (!implemOptions) {
                        debug.groupEnd();
                        debug.groupEnd(() => `Cannot advance into ${tName} from ${currentType}: no options for ${operation}.`);
                        return undefined;
                    }
                    if (implemOptions.length === 0) {
                        debug.groupEnd(() => `Cannot ever get ${tName} from this branch, ignoring it`);
                        continue;
                    }
                    debug.groupEnd(() => `Advanced into ${tName} from ${currentType}: ${advanceOptionsToString(implemOptions)}`);
                    optionsByImplems.push(implemOptions.map(opt => opt.paths));
                }
                const allCastOptions = flatCartesianProduct(optionsByImplems);
                debug.groupEnd(() => `Type-exploded options: ${advanceOptionsToString(allCastOptions)}`);
                return allCastOptions;
            case 'ObjectType':
                const conditionType = supergraphSchema.type(typeName);
                if ((0, federation_internals_1.isAbstractType)(conditionType) && (0, federation_internals_1.possibleRuntimeTypes)(conditionType).some(t => t.name == currentType.name)) {
                    debug.groupEnd(() => `${typeName} is a super-type of current type ${currentType}: no edge to take`);
                    const updatedPath = operation.appliedDirectives.length > 0
                        ? path.add(operation, null, exports.noConditionsResolution)
                        : path;
                    return [[updatedPath]];
                }
                debug.groupEnd(() => `Cannot ever get ${typeName} from current type ${currentType}: returning empty branch`);
                return [];
            default:
                (0, federation_internals_1.assert)(false, `Unexpected ${currentType.kind} type ${currentType} from ${path.tail} given operation ${operation}`);
        }
    }
}
function addFieldEdge(path, fieldOperation, edge, conditionResolver, context) {
    const conditionResolution = canSatisfyConditions(path, edge, conditionResolver, context, [], []);
    return conditionResolution.satisfied ? [[path.add(fieldOperation, edge, conditionResolution)]] : undefined;
}
function nextEdgeForField(path, field) {
    return edgeForField(path.graph, path.tail, field);
}
function edgeForField(graph, vertex, field) {
    const candidates = graph.outEdges(vertex).filter(e => e.transition.kind === 'FieldCollection' && field.selects(e.transition.definition, true));
    (0, federation_internals_1.assert)(candidates.length <= 1, () => `Vertex ${vertex} has multiple edges matching ${field} (${candidates})`);
    return candidates.length === 0 ? undefined : candidates[0];
}
function nextEdgeForTypeCast(path, typeName) {
    return edgeForTypeCast(path.graph, path.tail, typeName);
}
function edgeForTypeCast(graph, vertex, typeName) {
    const candidates = graph.outEdges(vertex).filter(e => e.transition.kind === 'DownCast' && typeName === e.transition.castedType.name);
    (0, federation_internals_1.assert)(candidates.length <= 1, () => `Vertex ${vertex} has multiple edges matching ${typeName} (${candidates})`);
    return candidates.length === 0 ? undefined : candidates[0];
}
//# sourceMappingURL=graphPath.js.map