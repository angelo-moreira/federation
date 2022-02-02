"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationState = exports.computeSubgraphPaths = exports.validateGraphComposition = exports.ValidationError = void 0;
const federation_internals_1 = require("@apollo/federation-internals");
const query_graphs_1 = require("@apollo/query-graphs");
const graphql_1 = require("graphql");
const debug = (0, federation_internals_1.newDebugLogger)('validation');
class ValidationError extends Error {
    constructor(message, supergraphUnsatisfiablePath, subgraphsPaths, witness) {
        super(message);
        this.supergraphUnsatisfiablePath = supergraphUnsatisfiablePath;
        this.subgraphsPaths = subgraphsPaths;
        this.witness = witness;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
function validationError(unsatisfiablePath, subgraphsPaths, subgraphsPathsUnadvanceables) {
    const witness = buildWitnessOperation(unsatisfiablePath);
    const operation = (0, graphql_1.print)((0, federation_internals_1.operationToDocument)(witness));
    const message = `The following supergraph API query:\n${operation}\n`
        + 'cannot be satisfied by the subgraphs because:\n'
        + displayReasons(subgraphsPathsUnadvanceables);
    return new ValidationError(message, unsatisfiablePath, subgraphsPaths, witness);
}
function isValidationError(e) {
    return e instanceof ValidationError;
}
function displayReasons(reasons) {
    const bySubgraph = new federation_internals_1.MultiMap();
    for (const reason of reasons) {
        for (const unadvanceable of reason.reasons) {
            bySubgraph.add(unadvanceable.sourceSubgraph, unadvanceable);
        }
    }
    return [...bySubgraph.entries()].map(([subgraph, reasons]) => {
        let msg = `- from subgraph "${subgraph}":`;
        if (reasons.length === 1) {
            msg += ' ' + reasons[0].details + '.';
        }
        else {
            for (const reason of reasons) {
                msg += '\n  - ' + reason.details + '.';
            }
        }
        return msg;
    }).join('\n');
}
function buildWitnessOperation(witness) {
    (0, federation_internals_1.assert)(witness.size > 0, "unsatisfiablePath should contain at least one edge/transition");
    const root = witness.root;
    return new federation_internals_1.Operation(root.rootKind, buildWitnessNextStep([...witness].map(e => e[0]), 0), new federation_internals_1.VariableDefinitions());
}
function buildWitnessNextStep(edges, index) {
    if (index >= edges.length) {
        const lastType = edges[edges.length - 1].tail.type;
        return (0, federation_internals_1.isLeafType)(lastType) ? undefined : new federation_internals_1.SelectionSet(lastType);
    }
    const edge = edges[index];
    let selection;
    const subSelection = buildWitnessNextStep(edges, index + 1);
    switch (edge.transition.kind) {
        case 'DownCast':
            const type = edge.transition.castedType;
            selection = (0, federation_internals_1.selectionOfElement)(new federation_internals_1.FragmentElement(edge.transition.sourceType, type.name), subSelection);
            break;
        case 'FieldCollection':
            const field = edge.transition.definition;
            selection = new federation_internals_1.FieldSelection(buildWitnessField(field), subSelection);
            break;
        case 'SubgraphEnteringTransition':
        case 'KeyResolution':
        case 'RootTypeResolution':
            return subSelection;
    }
    const selectionSet = new federation_internals_1.SelectionSet(edge.head.type);
    selectionSet.add(selection);
    return selectionSet;
}
function buildWitnessField(definition) {
    const args = Object.create(null);
    for (const argDef of definition.arguments()) {
        args[argDef.name] = generateWitnessValue(argDef.type);
    }
    return new federation_internals_1.Field(definition, args, new federation_internals_1.VariableDefinitions());
}
function generateWitnessValue(type) {
    switch (type.kind) {
        case 'ScalarType':
            switch (type.name) {
                case 'Int':
                    return 0;
                case 'Float':
                    return 3.14;
                case 'Boolean':
                    return true;
                case 'String':
                    return 'A string value';
                case 'ID':
                    return '<any id>';
                default:
                    return '<some value>';
            }
        case 'EnumType':
            return type.values[0].name;
        case 'InputObjectType':
            const obj = Object.create(null);
            for (const field of type.fields()) {
                if (field.defaultValue || (0, federation_internals_1.isNullableType)(field.type)) {
                    continue;
                }
                obj[field.name] = generateWitnessValue(field.type);
            }
            return obj;
        case 'ListType':
            return [];
        case 'NonNullType':
            return generateWitnessValue(type.ofType);
        default:
            (0, federation_internals_1.assert)(false, `Unhandled input type ${type}`);
    }
}
function validateGraphComposition(supergraph, subgraphs) {
    const errors = new ValidationTraversal(supergraph, subgraphs).validate();
    return errors.length > 0 ? { errors } : {};
}
exports.validateGraphComposition = validateGraphComposition;
function computeSubgraphPaths(supergraphPath, subgraphs) {
    try {
        (0, federation_internals_1.assert)(!supergraphPath.hasAnyEdgeConditions(), () => `A supergraph path should not have edge condition paths (as supergraph edges should not have conditions): ${supergraphPath}`);
        const supergraphSchema = (0, federation_internals_1.firstOf)(supergraphPath.graph.sources.values());
        const initialState = ValidationState.initial(supergraphPath.graph, supergraphPath.root.rootKind, subgraphs);
        const conditionResolver = new ConditionValidationResolver(supergraphSchema, subgraphs);
        let state = initialState;
        let isIncomplete = false;
        for (const [edge] of supergraphPath) {
            const updated = state.validateTransition(supergraphSchema, edge, conditionResolver);
            if (!updated) {
                isIncomplete = true;
                break;
            }
            if (isValidationError(updated)) {
                throw updated;
            }
            state = updated;
        }
        return { traversal: state, isComplete: !isIncomplete };
    }
    catch (error) {
        if (error instanceof ValidationError) {
            return { error };
        }
        throw error;
    }
}
exports.computeSubgraphPaths = computeSubgraphPaths;
function initialSubgraphPaths(kind, subgraphs) {
    const root = subgraphs.root(kind);
    (0, federation_internals_1.assert)(root, () => `The supergraph shouldn't have a ${kind} root if no subgraphs have one`);
    (0, federation_internals_1.assert)(root.type.name == (0, query_graphs_1.federatedGraphRootTypeName)(kind), () => `Unexpected type ${root.type} for subgraphs root type (expected ${(0, query_graphs_1.federatedGraphRootTypeName)(kind)}`);
    const initialState = query_graphs_1.GraphPath.fromGraphRoot(subgraphs, kind);
    return subgraphs.outEdges(root).map(e => initialState.add(query_graphs_1.subgraphEnteringTransition, e, query_graphs_1.noConditionsResolution));
}
class ValidationState {
    constructor(supergraphPath, subgraphPaths) {
        this.supergraphPath = supergraphPath;
        this.subgraphPaths = subgraphPaths;
    }
    static initial(supergraph, kind, subgraphs) {
        return new ValidationState(query_graphs_1.GraphPath.fromGraphRoot(supergraph, kind), initialSubgraphPaths(kind, subgraphs));
    }
    validateTransition(supergraphSchema, supergraphEdge, conditionResolver) {
        (0, federation_internals_1.assert)(!supergraphEdge.conditions, () => `Supergraph edges should not have conditions (${supergraphEdge})`);
        const transition = supergraphEdge.transition;
        const targetType = supergraphEdge.tail.type;
        const newSubgraphPaths = [];
        const deadEnds = [];
        for (const path of this.subgraphPaths) {
            const options = (0, query_graphs_1.advancePathWithTransition)(supergraphSchema, path, transition, targetType, conditionResolver.resolver);
            if ((0, query_graphs_1.isUnadvanceable)(options)) {
                deadEnds.push(options);
                continue;
            }
            if (options.length === 0) {
                return undefined;
            }
            newSubgraphPaths.push(...options);
        }
        const newPath = this.supergraphPath.add(transition, supergraphEdge, query_graphs_1.noConditionsResolution);
        if (newSubgraphPaths.length === 0) {
            return validationError(newPath, this.subgraphPaths, deadEnds);
        }
        return new ValidationState(newPath, newSubgraphPaths);
    }
    currentSubgraphs() {
        const subgraphs = [];
        for (const path of this.subgraphPaths) {
            const source = path.tail.source;
            if (!subgraphs.includes(source)) {
                subgraphs.push(source);
            }
        }
        return subgraphs;
    }
    toString() {
        return `${this.supergraphPath} <=> [${this.subgraphPaths.map(s => s.toString()).join(', ')}]`;
    }
}
exports.ValidationState = ValidationState;
function isSupersetOrEqual(maybeSuperset, other) {
    return other.every(v => maybeSuperset.includes(v));
}
class ValidationTraversal {
    constructor(supergraph, subgraphs) {
        this.stack = [];
        this.validationErrors = [];
        this.supergraphSchema = (0, federation_internals_1.firstOf)(supergraph.sources.values());
        this.conditionResolver = new ConditionValidationResolver(this.supergraphSchema, subgraphs);
        supergraph.rootKinds().forEach(k => this.stack.push(ValidationState.initial(supergraph, k, subgraphs)));
        this.previousVisits = new query_graphs_1.QueryGraphState(supergraph);
    }
    validate() {
        while (this.stack.length > 0) {
            this.handleState(this.stack.pop());
        }
        return this.validationErrors;
    }
    handleState(state) {
        debug.group(() => `Validation: ${this.stack.length + 1} open states. Validating ${state}`);
        const vertex = state.supergraphPath.tail;
        const currentSources = state.currentSubgraphs();
        const previousSeenSources = this.previousVisits.getVertexState(vertex);
        if (previousSeenSources) {
            for (const previousSources of previousSeenSources) {
                if (isSupersetOrEqual(currentSources, previousSources)) {
                    debug.groupEnd(`Has already validated this vertex.`);
                    return;
                }
            }
            previousSeenSources.push(currentSources);
        }
        else {
            this.previousVisits.setVertexState(vertex, [currentSources]);
        }
        for (const edge of state.supergraphPath.nextEdges()) {
            if (edge.isEdgeForField(federation_internals_1.typenameFieldName)) {
                continue;
            }
            debug.group(() => `Validating supergraph edge ${edge}`);
            const newState = state.validateTransition(this.supergraphSchema, edge, this.conditionResolver);
            if (isValidationError(newState)) {
                debug.groupEnd(`Validation error!`);
                this.validationErrors.push(newState);
                continue;
            }
            if (newState && !newState.supergraphPath.isTerminal()) {
                this.stack.push(newState);
                debug.groupEnd(() => `Reached new state ${newState}`);
            }
            else {
                debug.groupEnd(`Reached terminal vertex/cycle`);
            }
        }
        debug.groupEnd();
    }
}
class ConditionValidationState {
    constructor(selection, subgraphOptions) {
        this.selection = selection;
        this.subgraphOptions = subgraphOptions;
    }
    toString() {
        return `${this.selection} <=> ${(0, query_graphs_1.advanceOptionsToString)(this.subgraphOptions)}`;
    }
}
class ConditionValidationResolver {
    constructor(supergraphSchema, federatedQueryGraph) {
        this.supergraphSchema = supergraphSchema;
        this.federatedQueryGraph = federatedQueryGraph;
        this.resolver = (0, query_graphs_1.cachingConditionResolver)(federatedQueryGraph, (edge, context, excludedEdges, excludedConditions) => this.validateConditions(edge, context, excludedEdges, excludedConditions));
    }
    validateConditions(edge, context, excludedEdges, excludedConditions) {
        const conditions = edge.conditions;
        excludedConditions = (0, query_graphs_1.addConditionExclusion)(excludedConditions, conditions);
        const initialPath = query_graphs_1.GraphPath.create(this.federatedQueryGraph, edge.head);
        const initialOptions = [new query_graphs_1.SimultaneousPathsWithLazyIndirectPaths([initialPath], context, this.resolver, excludedEdges, excludedConditions)];
        const stack = [];
        for (const selection of conditions.selections()) {
            stack.push(new ConditionValidationState(selection, initialOptions));
        }
        while (stack.length > 0) {
            const state = stack.pop();
            const newStates = this.advanceState(state);
            if (newStates === null) {
                return query_graphs_1.unsatisfiedConditionsResolution;
            }
            newStates.forEach(s => stack.push(s));
        }
        return { satisfied: true, cost: 1 };
    }
    advanceState(state) {
        let newOptions = [];
        for (const paths of state.subgraphOptions) {
            const pathsOptions = (0, query_graphs_1.advanceSimultaneousPathsWithOperation)(this.supergraphSchema, paths, state.selection.element());
            if (!pathsOptions) {
                continue;
            }
            newOptions = newOptions.concat(pathsOptions);
        }
        if (newOptions.length === 0) {
            return null;
        }
        return state.selection.selectionSet ? state.selection.selectionSet.selections().map(s => new ConditionValidationState(s, newOptions)) : [];
    }
}
//# sourceMappingURL=validate.js.map