"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.operationToDocument = exports.parseSelectionSet = exports.parseOperation = exports.operationFromDocument = exports.FragmentSelection = exports.FieldSelection = exports.selectionSetOfPath = exports.selectionOfElement = exports.selectionSetOfElement = exports.SelectionSet = exports.NamedFragments = exports.NamedFragmentDefinition = exports.selectionSetOf = exports.Operation = exports.sameOperationPaths = exports.FragmentElement = exports.Field = void 0;
const graphql_1 = require("graphql");
const definitions_1 = require("./definitions");
const utils_1 = require("./utils");
const values_1 = require("./values");
function validate(condition, message, sourceAST) {
    if (!condition) {
        throw new graphql_1.GraphQLError(message(), sourceAST);
    }
}
function haveSameDirectives(op1, op2) {
    if (op1.appliedDirectives.length != op2.appliedDirectives.length) {
        return false;
    }
    for (const thisDirective of op1.appliedDirectives) {
        if (!op2.appliedDirectives.some(thatDirective => thisDirective.name === thatDirective.name && (0, values_1.argumentsEquals)(thisDirective.arguments(), thatDirective.arguments()))) {
            return false;
        }
    }
    return true;
}
class AbstractOperationElement extends definitions_1.DirectiveTargetElement {
    constructor(schema, variablesInElement) {
        super(schema);
        this.variablesInElement = variablesInElement;
    }
    variables() {
        return (0, definitions_1.mergeVariables)(this.variablesInElement, this.variablesInAppliedDirectives());
    }
}
class Field extends AbstractOperationElement {
    constructor(definition, args = Object.create(null), variableDefinitions = new definitions_1.VariableDefinitions(), alias) {
        super(definition.schema(), (0, definitions_1.variablesInArguments)(args));
        this.definition = definition;
        this.args = args;
        this.variableDefinitions = variableDefinitions;
        this.alias = alias;
        this.kind = 'Field';
        this.validate();
    }
    get name() {
        return this.definition.name;
    }
    responseName() {
        return this.alias ? this.alias : this.name;
    }
    get parentType() {
        return this.definition.parent;
    }
    withUpdatedDefinition(newDefinition) {
        const newField = new Field(newDefinition, this.args, this.variableDefinitions, this.alias);
        for (const directive of this.appliedDirectives) {
            newField.applyDirective(directive.definition, directive.arguments());
        }
        return newField;
    }
    appliesTo(type) {
        const definition = type.field(this.name);
        return !!definition && this.selects(definition);
    }
    selects(definition, assumeValid = false) {
        if (definition == this.definition) {
            return true;
        }
        if (this.name !== definition.name) {
            return false;
        }
        for (const argDef of definition.arguments()) {
            const appliedValue = this.args[argDef.name];
            if (appliedValue === undefined) {
                if (argDef.defaultValue === undefined && !(0, definitions_1.isNullableType)(argDef.type)) {
                    return false;
                }
            }
            else {
                if (!assumeValid && !(0, values_1.isValidValue)(appliedValue, argDef, this.variableDefinitions)) {
                    return false;
                }
            }
        }
        if (!assumeValid) {
            for (const [name, value] of Object.entries(this.args)) {
                if (value !== null && definition.argument(name) === undefined) {
                    return false;
                }
            }
        }
        return true;
    }
    validate() {
        validate(this.name === this.definition.name, () => `Field name "${this.name}" cannot select field "${this.definition.coordinate}: name mismatch"`);
        for (const argDef of this.definition.arguments()) {
            const appliedValue = this.args[argDef.name];
            if (appliedValue === undefined) {
                validate(argDef.defaultValue !== undefined || (0, definitions_1.isNullableType)(argDef.type), () => `Missing mandatory value "${argDef.name}" in field selection "${this}"`);
            }
            else {
                validate((0, values_1.isValidValue)(appliedValue, argDef, this.variableDefinitions), () => `Invalid value ${(0, values_1.valueToString)(appliedValue)} for argument "${argDef.coordinate}" of type ${argDef.type}`);
            }
        }
        for (const [name, value] of Object.entries(this.args)) {
            validate(value === null || this.definition.argument(name) !== undefined, () => `Unknown argument "${name}" in field application of "${this.name}"`);
        }
    }
    updateForAddingTo(selectionSet) {
        const selectionParent = selectionSet.parentType;
        const fieldParent = this.definition.parent;
        if (selectionParent.name !== fieldParent.name) {
            if (this.name === definitions_1.typenameFieldName) {
                return this.withUpdatedDefinition(selectionParent.typenameField());
            }
            validate(!(0, definitions_1.isUnionType)(selectionParent)
                && (((0, definitions_1.isInterfaceType)(fieldParent) && fieldParent.allImplementations().some(i => i.name == selectionParent.name))
                    || ((0, definitions_1.isObjectType)(fieldParent) && fieldParent.name == selectionParent.name)), () => `Cannot add selection of field "${this.definition.coordinate}" to selection set of parent type "${selectionSet.parentType}"`);
            const fieldDef = selectionParent.field(this.name);
            validate(fieldDef, () => `Cannot add selection of field "${this.definition.coordinate}" to selection set of parent type "${selectionParent} (that does not declare that type)"`);
            return this.withUpdatedDefinition(fieldDef);
        }
        return this;
    }
    equals(that) {
        if (this === that) {
            return true;
        }
        return that.kind === 'Field'
            && this.name === that.name
            && this.alias === that.alias
            && (0, values_1.argumentsEquals)(this.args, that.args)
            && haveSameDirectives(this, that);
    }
    toString() {
        const alias = this.alias ? this.alias + ': ' : '';
        const entries = Object.entries(this.args);
        const args = entries.length == 0
            ? ''
            : '(' + entries.map(([n, v]) => { var _a; return `${n}: ${(0, values_1.valueToString)(v, (_a = this.definition.argument(n)) === null || _a === void 0 ? void 0 : _a.type)}`; }).join(', ') + ')';
        return alias + this.name + args + this.appliedDirectivesToString();
    }
}
exports.Field = Field;
class FragmentElement extends AbstractOperationElement {
    constructor(sourceType, typeCondition) {
        super(sourceType.schema(), []);
        this.sourceType = sourceType;
        this.kind = 'FragmentElement';
        this.typeCondition = typeCondition !== undefined && typeof typeCondition === 'string'
            ? this.schema().type(typeCondition)
            : typeCondition;
    }
    get parentType() {
        return this.sourceType;
    }
    withUpdatedSourceType(newSourceType) {
        const newFragment = new FragmentElement(newSourceType, this.typeCondition);
        for (const directive of this.appliedDirectives) {
            newFragment.applyDirective(directive.definition, directive.arguments());
        }
        return newFragment;
    }
    updateForAddingTo(selectionSet) {
        const selectionParent = selectionSet.parentType;
        const fragmentParent = this.parentType;
        const typeCondition = this.typeCondition;
        if (selectionParent != fragmentParent) {
            validate(!typeCondition || (0, definitions_1.runtimeTypesIntersects)(selectionParent, typeCondition), () => `Cannot add fragment of parent type "${this.parentType}" to selection set of parent type "${selectionSet.parentType}"`);
            return this.withUpdatedSourceType(selectionParent);
        }
        return this;
    }
    equals(that) {
        var _a, _b;
        if (this === that) {
            return true;
        }
        return that.kind === 'FragmentElement'
            && ((_a = this.typeCondition) === null || _a === void 0 ? void 0 : _a.name) === ((_b = that.typeCondition) === null || _b === void 0 ? void 0 : _b.name)
            && haveSameDirectives(this, that);
    }
    toString() {
        return '...' + (this.typeCondition ? ' on ' + this.typeCondition : '') + this.appliedDirectivesToString();
    }
}
exports.FragmentElement = FragmentElement;
function sameOperationPaths(p1, p2) {
    if (p1 === p2) {
        return true;
    }
    if (p1.length !== p2.length) {
        return false;
    }
    for (let i = 0; i < p1.length; i++) {
        if (!p1[i].equals(p2[i])) {
            return false;
        }
    }
    return true;
}
exports.sameOperationPaths = sameOperationPaths;
class Operation {
    constructor(rootKind, selectionSet, variableDefinitions, name) {
        this.rootKind = rootKind;
        this.selectionSet = selectionSet;
        this.variableDefinitions = variableDefinitions;
        this.name = name;
    }
    optimize(fragments, minUsagesToOptimize = 2) {
        if (!fragments) {
            return this;
        }
        let optimizedSelection = this.selectionSet.optimize(fragments);
        if (optimizedSelection === this.selectionSet) {
            return this;
        }
        if (minUsagesToOptimize > 1) {
            const usages = new Map();
            optimizedSelection.collectUsedFragmentNames(usages);
            for (const fragment of fragments.names()) {
                if (!usages.has(fragment)) {
                    usages.set(fragment, 0);
                }
            }
            const toDeoptimize = (0, utils_1.mapEntries)(usages).filter(([_, count]) => count < minUsagesToOptimize).map(([name]) => name);
            optimizedSelection = optimizedSelection.expandFragments(toDeoptimize);
        }
        return new Operation(this.rootKind, optimizedSelection, this.variableDefinitions, this.name);
    }
    expandAllFragments() {
        const expandedSelections = this.selectionSet.expandFragments();
        if (expandedSelections === this.selectionSet) {
            return this;
        }
        return new Operation(this.rootKind, expandedSelections, this.variableDefinitions, this.name);
    }
    toString(expandFragments = false, prettyPrint = true) {
        return this.selectionSet.toOperationString(this.rootKind, this.variableDefinitions, this.name, expandFragments, prettyPrint);
    }
}
exports.Operation = Operation;
function addDirectiveNodesToElement(directiveNodes, element) {
    if (!directiveNodes) {
        return;
    }
    const schema = element.schema();
    for (const node of directiveNodes) {
        const directiveDef = schema.directive(node.name.value);
        validate(directiveDef, () => `Unknown directive "@${node.name.value}" in selection`);
        element.applyDirective(directiveDef, (0, values_1.argumentsFromAST)(directiveDef.coordinate, node.arguments, directiveDef));
    }
}
function selectionSetOf(parentType, selection) {
    const selectionSet = new SelectionSet(parentType);
    selectionSet.add(selection);
    return selectionSet;
}
exports.selectionSetOf = selectionSetOf;
class NamedFragmentDefinition extends definitions_1.DirectiveTargetElement {
    constructor(schema, name, typeCondition, selectionSet) {
        super(schema);
        this.name = name;
        this.typeCondition = typeCondition;
        this.selectionSet = selectionSet;
    }
    variables() {
        return (0, definitions_1.mergeVariables)(this.variablesInAppliedDirectives(), this.selectionSet.usedVariables());
    }
    collectUsedFragmentNames(collector) {
        this.selectionSet.collectUsedFragmentNames(collector);
    }
    toFragmentDefinitionNode() {
        return {
            kind: graphql_1.Kind.FRAGMENT_DEFINITION,
            name: {
                kind: graphql_1.Kind.NAME,
                value: this.name
            },
            typeCondition: {
                kind: graphql_1.Kind.NAMED_TYPE,
                name: {
                    kind: graphql_1.Kind.NAME,
                    value: this.typeCondition.name
                }
            },
            selectionSet: this.selectionSet.toSelectionSetNode()
        };
    }
    toString(indent) {
        return (indent !== null && indent !== void 0 ? indent : '') + `fragment ${this.name} on ${this.typeCondition}${this.appliedDirectivesToString()} ${this.selectionSet.toString(false, true, indent)}`;
    }
}
exports.NamedFragmentDefinition = NamedFragmentDefinition;
class NamedFragments {
    constructor() {
        this.fragments = new utils_1.MapWithCachedArrays();
    }
    isEmpty() {
        return this.fragments.size === 0;
    }
    variables() {
        let variables = [];
        for (const fragment of this.fragments.values()) {
            variables = (0, definitions_1.mergeVariables)(variables, fragment.variables());
        }
        return variables;
    }
    names() {
        return this.fragments.keys();
    }
    add(fragment) {
        if (this.fragments.has(fragment.name)) {
            throw new graphql_1.GraphQLError(`Duplicate fragment name '${fragment}'`);
        }
        this.fragments.set(fragment.name, fragment);
    }
    addIfNotExist(fragment) {
        if (!this.fragments.has(fragment.name)) {
            this.fragments.set(fragment.name, fragment);
        }
    }
    onType(type) {
        return this.fragments.values().filter(f => f.typeCondition.name === type.name);
    }
    without(names) {
        if (!names.some(n => this.fragments.has(n))) {
            return this;
        }
        const newFragments = new NamedFragments();
        for (const fragment of this.fragments.values()) {
            if (!names.includes(fragment.name)) {
                const updatedSelection = fragment.selectionSet.expandFragments(names, false);
                const newFragment = updatedSelection === fragment.selectionSet
                    ? fragment
                    : new NamedFragmentDefinition(fragment.schema(), fragment.name, fragment.typeCondition, updatedSelection);
                newFragments.add(newFragment);
            }
        }
        return newFragments;
    }
    get(name) {
        return this.fragments.get(name);
    }
    definitions() {
        return this.fragments.values();
    }
    validate() {
        for (const fragment of this.fragments.values()) {
            fragment.selectionSet.validate();
        }
    }
    toFragmentDefinitionNodes() {
        return this.definitions().map(f => f.toFragmentDefinitionNode());
    }
    toString(indent) {
        return this.definitions().map(f => f.toString(indent)).join('\n\n');
    }
}
exports.NamedFragments = NamedFragments;
class SelectionSet {
    constructor(parentType, fragments) {
        this.parentType = parentType;
        this.fragments = fragments;
        this._selections = new utils_1.MultiMap();
        this._selectionCount = 0;
        validate(!(0, definitions_1.isLeafType)(parentType), () => `Cannot have selection on non-leaf type ${parentType}`);
    }
    selections(reversedOrder = false) {
        if (!this._cachedSelections) {
            const selections = new Array(this._selectionCount);
            let idx = 0;
            for (const byResponseName of this._selections.values()) {
                for (const selection of byResponseName) {
                    selections[idx++] = selection;
                }
            }
            this._cachedSelections = selections;
        }
        (0, utils_1.assert)(this._cachedSelections, 'Cache should have been populated');
        if (reversedOrder) {
            const reversed = new Array(this._selectionCount);
            for (let i = 0; i < this._selectionCount; i++) {
                reversed[i] = this._cachedSelections[this._selectionCount - i - 1];
            }
            return reversed;
        }
        return this._cachedSelections;
    }
    usedVariables() {
        let variables = [];
        for (const byResponseName of this._selections.values()) {
            for (const selection of byResponseName) {
                variables = (0, definitions_1.mergeVariables)(variables, selection.usedVariables());
            }
        }
        if (this.fragments) {
            variables = (0, definitions_1.mergeVariables)(variables, this.fragments.variables());
        }
        return variables;
    }
    collectUsedFragmentNames(collector) {
        if (!this.fragments) {
            return;
        }
        for (const byResponseName of this._selections.values()) {
            for (const selection of byResponseName) {
                selection.collectUsedFragmentNames(collector);
            }
        }
    }
    optimize(fragments) {
        if (!fragments || fragments.isEmpty()) {
            return this;
        }
        if (this.fragments && this.fragments.definitions().some(def => fragments.get(def.name))) {
            return this;
        }
        const optimized = new SelectionSet(this.parentType, fragments);
        for (const selection of this.selections()) {
            optimized.add(selection.optimize(fragments));
        }
        return optimized;
    }
    expandFragments(names, updateSelectionSetFragments = true) {
        var _a;
        if (!this.fragments) {
            return this;
        }
        if (names && names.length === 0) {
            return this;
        }
        const newFragments = updateSelectionSetFragments
            ? (names ? (_a = this.fragments) === null || _a === void 0 ? void 0 : _a.without(names) : undefined)
            : this.fragments;
        const withExpanded = new SelectionSet(this.parentType, newFragments);
        for (const selection of this.selections()) {
            withExpanded.add(selection.expandFragments(names, updateSelectionSetFragments));
        }
        return withExpanded;
    }
    mergeIn(selectionSet) {
        for (const selection of selectionSet.selections()) {
            this.add(selection);
        }
    }
    addAll(selections) {
        selections.forEach(s => this.add(s));
        return this;
    }
    add(selection) {
        const toAdd = selection.updateForAddingTo(this);
        const key = toAdd.key();
        const existing = this._selections.get(key);
        if (existing) {
            for (const existingSelection of existing) {
                if (existingSelection.kind === toAdd.kind && haveSameDirectives(existingSelection.element(), toAdd.element())) {
                    if (toAdd.selectionSet) {
                        existingSelection.selectionSet.mergeIn(toAdd.selectionSet);
                    }
                    return existingSelection;
                }
            }
        }
        this._selections.add(key, toAdd);
        ++this._selectionCount;
        this._cachedSelections = undefined;
        return selection;
    }
    addPath(path) {
        let previousSelections = this;
        let currentSelections = this;
        for (const element of path) {
            validate(currentSelections, () => `Cannot apply selection ${element} to non-selectable parent type "${previousSelections.parentType}"`);
            const mergedSelection = currentSelections.add(selectionOfElement(element));
            previousSelections = currentSelections;
            currentSelections = mergedSelection.selectionSet;
        }
    }
    addSelectionSetNode(node, variableDefinitions, fieldAccessor = (type, name) => type.field(name)) {
        if (!node) {
            return;
        }
        for (const selectionNode of node.selections) {
            this.addSelectionNode(selectionNode, variableDefinitions, fieldAccessor);
        }
    }
    addSelectionNode(node, variableDefinitions, fieldAccessor = (type, name) => type.field(name)) {
        this.add(this.nodeToSelection(node, variableDefinitions, fieldAccessor));
    }
    nodeToSelection(node, variableDefinitions, fieldAccessor) {
        var _a, _b;
        let selection;
        switch (node.kind) {
            case graphql_1.Kind.FIELD:
                const definition = fieldAccessor(this.parentType, node.name.value);
                validate(definition, () => `Cannot query field "${node.name.value}" on type "${this.parentType}".`, this.parentType.sourceAST);
                const type = (0, definitions_1.baseType)(definition.type);
                selection = new FieldSelection(new Field(definition, (0, values_1.argumentsFromAST)(definition.coordinate, node.arguments, definition), variableDefinitions, (_a = node.alias) === null || _a === void 0 ? void 0 : _a.value), (0, definitions_1.isLeafType)(type) ? undefined : new SelectionSet(type, this.fragments));
                if (node.selectionSet) {
                    validate(selection.selectionSet, () => `Unexpected selection set on leaf field "${selection.element()}"`, selection.element().definition.sourceAST);
                    selection.selectionSet.addSelectionSetNode(node.selectionSet, variableDefinitions, fieldAccessor);
                }
                break;
            case graphql_1.Kind.INLINE_FRAGMENT:
                const element = new FragmentElement(this.parentType, (_b = node.typeCondition) === null || _b === void 0 ? void 0 : _b.name.value);
                selection = new InlineFragmentSelection(element, new SelectionSet(element.typeCondition ? element.typeCondition : element.parentType, this.fragments));
                selection.selectionSet.addSelectionSetNode(node.selectionSet, variableDefinitions, fieldAccessor);
                break;
            case graphql_1.Kind.FRAGMENT_SPREAD:
                const fragmentName = node.name.value;
                validate(this.fragments, () => `Cannot find fragment name "${fragmentName}" (no fragments were provided)`);
                selection = new FragmentSpreadSelection(this.parentType, this.fragments, fragmentName);
                break;
        }
        addDirectiveNodesToElement(node.directives, selection.element());
        return selection;
    }
    equals(that) {
        if (this === that) {
            return true;
        }
        if (this._selections.size !== that._selections.size) {
            return false;
        }
        for (const [key, thisSelections] of this._selections) {
            const thatSelections = that._selections.get(key);
            if (!thatSelections
                || thisSelections.length !== thatSelections.length
                || !thisSelections.every(thisSelection => thatSelections.some(thatSelection => thisSelection.equals(thatSelection)))) {
                return false;
            }
        }
        return true;
    }
    contains(that) {
        if (this._selections.size < that._selections.size) {
            return false;
        }
        for (const [key, thatSelections] of that._selections) {
            const thisSelections = this._selections.get(key);
            if (!thisSelections
                || (thisSelections.length < thatSelections.length
                    || !thatSelections.every(thatSelection => thisSelections.some(thisSelection => thisSelection.contains(thatSelection))))) {
                return false;
            }
        }
        return true;
    }
    validate() {
        validate(!this.isEmpty(), () => `Invalid empty selection set`);
        for (const selection of this.selections()) {
            selection.validate();
            const selectionFragments = selection.namedFragments();
            (0, utils_1.assert)(!selectionFragments || selectionFragments === this.fragments, () => `Selection fragments (${selectionFragments}) for ${selection} does not match selection set one (${this.fragments})`);
        }
    }
    isEmpty() {
        return this._selections.size === 0;
    }
    toSelectionSetNode() {
        if (this.isEmpty()) {
            return {
                kind: graphql_1.Kind.SELECTION_SET,
                selections: [{
                        kind: graphql_1.Kind.FIELD,
                        name: {
                            kind: graphql_1.Kind.NAME,
                            value: '...',
                        },
                    }]
            };
        }
        return {
            kind: graphql_1.Kind.SELECTION_SET,
            selections: Array.from(this.selectionsInPrintOrder(), s => s.toSelectionNode())
        };
    }
    selectionsInPrintOrder() {
        const typenameSelection = this._selections.get(definitions_1.typenameFieldName);
        if (typenameSelection) {
            return typenameSelection.concat(this.selections().filter(s => s.kind != 'FieldSelection' || s.field.name !== definitions_1.typenameFieldName));
        }
        else {
            return this.selections();
        }
    }
    toOperationPaths() {
        return this.toOperationPathsInternal([]);
    }
    toOperationPathsInternal(parentPaths) {
        return this.selections().flatMap((selection) => {
            const updatedPaths = parentPaths.map(path => path.concat(selection.element()));
            return selection.selectionSet
                ? selection.selectionSet.toOperationPathsInternal(updatedPaths)
                : updatedPaths;
        });
    }
    clone() {
        const cloned = new SelectionSet(this.parentType);
        for (const selection of this.selections()) {
            cloned.add(selection.clone());
        }
        return cloned;
    }
    toOperationString(rootKind, variableDefinitions, operationName, expandFragments = false, prettyPrint = true) {
        const indent = prettyPrint ? '' : undefined;
        const fragmentsDefinitions = !expandFragments && this.fragments && !this.fragments.isEmpty()
            ? this.fragments.toString(indent) + "\n\n"
            : "";
        if (rootKind == "query" && !operationName && variableDefinitions.isEmpty()) {
            return fragmentsDefinitions + this.toString(expandFragments, true, indent);
        }
        const nameAndVariables = operationName
            ? " " + (operationName + (variableDefinitions.isEmpty() ? "" : variableDefinitions.toString()))
            : (variableDefinitions.isEmpty() ? "" : " " + variableDefinitions.toString());
        return fragmentsDefinitions + rootKind + nameAndVariables + " " + this.toString(expandFragments, true, indent);
    }
    toString(expandFragments = true, includeExternalBrackets = true, indent) {
        if (indent === undefined) {
            const selectionsToString = this.selections().map(s => s.toString(expandFragments)).join(' ');
            return includeExternalBrackets ? '{ ' + selectionsToString + ' }' : selectionsToString;
        }
        else {
            const selectionIndent = includeExternalBrackets ? indent + "  " : indent;
            const selectionsToString = this.selections().map(s => s.toString(expandFragments, selectionIndent)).join('\n');
            return includeExternalBrackets
                ? '{\n' + selectionsToString + '\n' + indent + '}'
                : selectionsToString;
        }
    }
}
exports.SelectionSet = SelectionSet;
function selectionSetOfElement(element, subSelection) {
    const selectionSet = new SelectionSet(element.parentType);
    selectionSet.add(selectionOfElement(element, subSelection));
    return selectionSet;
}
exports.selectionSetOfElement = selectionSetOfElement;
function selectionOfElement(element, subSelection) {
    return element.kind === 'Field' ? new FieldSelection(element, subSelection) : new InlineFragmentSelection(element, subSelection);
}
exports.selectionOfElement = selectionOfElement;
function selectionSetOfPath(path, onPathEnd) {
    validate(path.length > 0, () => `Cannot create a selection set from an empty path`);
    const last = selectionSetOfElement(path[path.length - 1]);
    let current = last;
    for (let i = path.length - 2; i >= 0; i--) {
        current = selectionSetOfElement(path[i], current);
    }
    if (onPathEnd) {
        onPathEnd(last.selections()[0].selectionSet);
    }
    return current;
}
exports.selectionSetOfPath = selectionSetOfPath;
class FieldSelection {
    constructor(field, initialSelectionSet) {
        this.field = field;
        this.kind = 'FieldSelection';
        const type = (0, definitions_1.baseType)(field.definition.type);
        this.selectionSet = (0, definitions_1.isLeafType)(type) ? undefined : (initialSelectionSet ? initialSelectionSet : new SelectionSet(type));
    }
    key() {
        return this.element().responseName();
    }
    element() {
        return this.field;
    }
    usedVariables() {
        var _a, _b;
        return (0, definitions_1.mergeVariables)(this.element().variables(), (_b = (_a = this.selectionSet) === null || _a === void 0 ? void 0 : _a.usedVariables()) !== null && _b !== void 0 ? _b : []);
    }
    collectUsedFragmentNames(collector) {
        if (this.selectionSet) {
            this.selectionSet.collectUsedFragmentNames(collector);
        }
    }
    optimize(fragments) {
        const optimizedSelection = this.selectionSet ? this.selectionSet.optimize(fragments) : undefined;
        return this.selectionSet === optimizedSelection
            ? this
            : new FieldSelection(this.field, optimizedSelection);
    }
    expandFragments(names, updateSelectionSetFragments = true) {
        const expandedSelection = this.selectionSet ? this.selectionSet.expandFragments(names, updateSelectionSetFragments) : undefined;
        return this.selectionSet === expandedSelection
            ? this
            : new FieldSelection(this.field, expandedSelection);
    }
    fieldArgumentsToAST() {
        const entries = Object.entries(this.field.args);
        if (entries.length === 0) {
            return undefined;
        }
        return entries.map(([n, v]) => {
            return {
                kind: graphql_1.Kind.ARGUMENT,
                name: { kind: graphql_1.Kind.NAME, value: n },
                value: (0, values_1.valueToAST)(v, this.field.definition.argument(n).type),
            };
        });
    }
    validate() {
        var _a;
        validate(!(this.selectionSet && this.selectionSet.isEmpty()), () => `Invalid empty selection set for field "${this.field.definition.coordinate}" of non-leaf type ${this.field.definition.type}`, this.field.definition.sourceAST);
        (_a = this.selectionSet) === null || _a === void 0 ? void 0 : _a.validate();
    }
    updateForAddingTo(selectionSet) {
        const updatedField = this.field.updateForAddingTo(selectionSet);
        return this.field === updatedField ? this : new FieldSelection(updatedField, this.selectionSet);
    }
    toSelectionNode() {
        var _a;
        const alias = this.field.alias ? { kind: graphql_1.Kind.NAME, value: this.field.alias, } : undefined;
        return {
            kind: graphql_1.Kind.FIELD,
            name: {
                kind: graphql_1.Kind.NAME,
                value: this.field.name,
            },
            alias,
            arguments: this.fieldArgumentsToAST(),
            directives: this.element().appliedDirectivesToDirectiveNodes(),
            selectionSet: (_a = this.selectionSet) === null || _a === void 0 ? void 0 : _a.toSelectionSetNode()
        };
    }
    equals(that) {
        if (this === that) {
            return true;
        }
        if (!(that instanceof FieldSelection) || !this.field.equals(that.field)) {
            return false;
        }
        if (!this.selectionSet) {
            return !that.selectionSet;
        }
        return !!that.selectionSet && this.selectionSet.equals(that.selectionSet);
    }
    contains(that) {
        if (!(that instanceof FieldSelection) || !this.field.equals(that.field)) {
            return false;
        }
        if (!that.selectionSet) {
            return true;
        }
        return !!this.selectionSet && this.selectionSet.contains(that.selectionSet);
    }
    namedFragments() {
        var _a;
        return (_a = this.selectionSet) === null || _a === void 0 ? void 0 : _a.fragments;
    }
    clone() {
        if (!this.selectionSet) {
            return this;
        }
        return new FieldSelection(this.field, this.selectionSet.clone());
    }
    toString(expandFragments = true, indent) {
        return (indent !== null && indent !== void 0 ? indent : '') + this.field + (this.selectionSet ? ' ' + this.selectionSet.toString(expandFragments, true, indent) : '');
    }
}
exports.FieldSelection = FieldSelection;
class FragmentSelection {
    constructor() {
        this.kind = 'FragmentSelection';
    }
    usedVariables() {
        return (0, definitions_1.mergeVariables)(this.element().variables(), this.selectionSet.usedVariables());
    }
    updateForAddingTo(selectionSet) {
        const updatedFragment = this.element().updateForAddingTo(selectionSet);
        return this.element() === updatedFragment ? this : new InlineFragmentSelection(updatedFragment, this.selectionSet);
    }
    equals(that) {
        if (this === that) {
            return true;
        }
        return (that instanceof FragmentSelection)
            && this.element().equals(that.element())
            && this.selectionSet.equals(that.selectionSet);
    }
    contains(that) {
        return (that instanceof FragmentSelection)
            && this.element().equals(that.element())
            && this.selectionSet.contains(that.selectionSet);
    }
    clone() {
        return new InlineFragmentSelection(this.element(), this.selectionSet.clone());
    }
}
exports.FragmentSelection = FragmentSelection;
class InlineFragmentSelection extends FragmentSelection {
    constructor(fragmentElement, initialSelectionSet) {
        super();
        this.fragmentElement = fragmentElement;
        this._selectionSet = initialSelectionSet
            ? initialSelectionSet
            : new SelectionSet(fragmentElement.typeCondition ? fragmentElement.typeCondition : fragmentElement.parentType);
    }
    key() {
        var _a, _b;
        return (_b = (_a = this.element().typeCondition) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : '';
    }
    validate() {
        validate(!this.selectionSet.isEmpty(), () => `Invalid empty selection set for fragment "${this.element()}"`);
        this.selectionSet.validate();
    }
    get selectionSet() {
        return this._selectionSet;
    }
    namedFragments() {
        return this.selectionSet.fragments;
    }
    element() {
        return this.fragmentElement;
    }
    toSelectionNode() {
        const typeCondition = this.element().typeCondition;
        return {
            kind: graphql_1.Kind.INLINE_FRAGMENT,
            typeCondition: typeCondition
                ? {
                    kind: graphql_1.Kind.NAMED_TYPE,
                    name: {
                        kind: graphql_1.Kind.NAME,
                        value: typeCondition.name,
                    },
                }
                : undefined,
            directives: this.element().appliedDirectivesToDirectiveNodes(),
            selectionSet: this.selectionSet.toSelectionSetNode()
        };
    }
    optimize(fragments) {
        const optimizedSelection = this.selectionSet.optimize(fragments);
        const typeCondition = this.element().typeCondition;
        if (typeCondition) {
            for (const candidate of fragments.onType(typeCondition)) {
                if (candidate.selectionSet.equals(optimizedSelection)) {
                    fragments.addIfNotExist(candidate);
                    return new FragmentSpreadSelection(this.element().parentType, fragments, candidate.name);
                }
            }
        }
        return this.selectionSet === optimizedSelection
            ? this
            : new InlineFragmentSelection(this.fragmentElement, optimizedSelection);
    }
    expandFragments(names, updateSelectionSetFragments = true) {
        const expandedSelection = this.selectionSet.expandFragments(names, updateSelectionSetFragments);
        return this.selectionSet === expandedSelection
            ? this
            : new InlineFragmentSelection(this.element(), expandedSelection);
    }
    collectUsedFragmentNames(collector) {
        this.selectionSet.collectUsedFragmentNames(collector);
    }
    toString(expandFragments = true, indent) {
        return (indent !== null && indent !== void 0 ? indent : '') + this.fragmentElement + ' ' + this.selectionSet.toString(expandFragments, true, indent);
    }
}
class FragmentSpreadSelection extends FragmentSelection {
    constructor(sourceType, fragments, fragmentName) {
        super();
        this.fragments = fragments;
        const fragmentDefinition = fragments.get(fragmentName);
        validate(fragmentDefinition, () => `Unknown fragment "...${fragmentName}"`);
        this.namedFragment = fragmentDefinition;
        this._element = new FragmentElement(sourceType, fragmentDefinition.typeCondition);
        for (const directive of fragmentDefinition.appliedDirectives) {
            this._element.applyDirective(directive.definition, directive.arguments());
        }
    }
    key() {
        return '...' + this.namedFragment.name;
    }
    element() {
        return this._element;
    }
    namedFragments() {
        return this.fragments;
    }
    get selectionSet() {
        return this.namedFragment.selectionSet;
    }
    validate() {
    }
    toSelectionNode() {
        const spreadDirectives = this.spreadDirectives();
        const directiveNodes = spreadDirectives.length === 0
            ? undefined
            : spreadDirectives.map(directive => {
                return {
                    kind: graphql_1.Kind.DIRECTIVE,
                    name: {
                        kind: graphql_1.Kind.NAME,
                        value: directive.name,
                    },
                    arguments: directive.argumentsToAST()
                };
            });
        return {
            kind: graphql_1.Kind.FRAGMENT_SPREAD,
            name: { kind: graphql_1.Kind.NAME, value: this.namedFragment.name },
            directives: directiveNodes,
        };
    }
    optimize(_) {
        return this;
    }
    expandFragments(names, updateSelectionSetFragments = true) {
        if (names && !names.includes(this.namedFragment.name)) {
            return this;
        }
        return new InlineFragmentSelection(this._element, this.selectionSet.expandFragments(names, updateSelectionSetFragments));
    }
    collectUsedFragmentNames(collector) {
        this.selectionSet.collectUsedFragmentNames(collector);
        const usageCount = collector.get(this.namedFragment.name);
        collector.set(this.namedFragment.name, usageCount === undefined ? 1 : usageCount + 1);
    }
    spreadDirectives() {
        return this._element.appliedDirectives.slice(this.namedFragment.appliedDirectives.length);
    }
    toString(expandFragments = true, indent) {
        if (expandFragments) {
            return (indent !== null && indent !== void 0 ? indent : '') + this._element + ' ' + this.selectionSet.toString(true, true, indent);
        }
        else {
            const directives = this.spreadDirectives();
            const directiveString = directives.length == 0 ? '' : ' ' + directives.join(' ');
            return (indent !== null && indent !== void 0 ? indent : '') + '...' + this.namedFragment.name + directiveString;
        }
    }
}
function operationFromDocument(schema, document, operationName) {
    let operation;
    const fragments = new NamedFragments();
    document.definitions.forEach(definition => {
        switch (definition.kind) {
            case graphql_1.Kind.OPERATION_DEFINITION:
                validate(!operation || operationName, () => 'Must provide operation name if query contains multiple operations.');
                if (!operationName || (definition.name && definition.name.value === operationName)) {
                    operation = definition;
                }
                break;
            case graphql_1.Kind.FRAGMENT_DEFINITION:
                const name = definition.name.value;
                const typeName = definition.typeCondition.name.value;
                const typeCondition = schema.type(typeName);
                if (!typeCondition) {
                    throw new graphql_1.GraphQLError(`Unknown type "${typeName}" for fragment "${name}"`, definition);
                }
                if (!(0, definitions_1.isCompositeType)(typeCondition)) {
                    throw new graphql_1.GraphQLError(`Invalid fragment "${name}" on non-composite type "${typeName}"`, definition);
                }
                const fragment = new NamedFragmentDefinition(schema, name, typeCondition, new SelectionSet(typeCondition, fragments));
                addDirectiveNodesToElement(definition.directives, fragment);
                fragments.add(fragment);
                break;
        }
    });
    validate(operation, () => operationName ? `Unknown operation named "${operationName}"` : 'No operation found in provided document.');
    const variableDefinitions = operation.variableDefinitions
        ? (0, definitions_1.variableDefinitionsFromAST)(schema, operation.variableDefinitions)
        : new definitions_1.VariableDefinitions();
    document.definitions.forEach(definition => {
        switch (definition.kind) {
            case graphql_1.Kind.FRAGMENT_DEFINITION:
                const fragment = fragments.get(definition.name.value);
                fragment.selectionSet.addSelectionSetNode(definition.selectionSet, variableDefinitions);
                break;
        }
    });
    fragments.validate();
    return operationFromAST(schema, operation, fragments);
}
exports.operationFromDocument = operationFromDocument;
function operationFromAST(schema, operation, fragments) {
    var _a;
    const rootType = schema.schemaDefinition.root(operation.operation);
    validate(rootType, () => `The schema has no "${operation.operation}" root type defined`);
    const variableDefinitions = operation.variableDefinitions ? (0, definitions_1.variableDefinitionsFromAST)(schema, operation.variableDefinitions) : new definitions_1.VariableDefinitions();
    return new Operation(operation.operation, parseSelectionSet(rootType.type, operation.selectionSet, variableDefinitions, fragments), variableDefinitions, (_a = operation.name) === null || _a === void 0 ? void 0 : _a.value);
}
function parseOperation(schema, operation, operationName) {
    return operationFromDocument(schema, (0, graphql_1.parse)(operation), operationName);
}
exports.parseOperation = parseOperation;
function parseSelectionSet(parentType, source, variableDefinitions = new definitions_1.VariableDefinitions(), fragments, fieldAccessor = (type, name) => type.field(name)) {
    const node = typeof source === 'string'
        ? parseOperationAST(source.trim().startsWith('{') ? source : `{${source}}`).selectionSet
        : source;
    const selectionSet = new SelectionSet(parentType, fragments);
    selectionSet.addSelectionSetNode(node, variableDefinitions, fieldAccessor);
    selectionSet.validate();
    return selectionSet;
}
exports.parseSelectionSet = parseSelectionSet;
function parseOperationAST(source) {
    const parsed = (0, graphql_1.parse)(source);
    validate(parsed.definitions.length === 1, () => 'Selections should contain a single definitions, found ' + parsed.definitions.length);
    const def = parsed.definitions[0];
    validate(def.kind === graphql_1.Kind.OPERATION_DEFINITION, () => 'Expected an operation definition but got a ' + def.kind);
    return def;
}
function operationToDocument(operation) {
    var _a;
    const operationAST = {
        kind: graphql_1.Kind.OPERATION_DEFINITION,
        operation: operation.rootKind,
        selectionSet: operation.selectionSet.toSelectionSetNode(),
        variableDefinitions: operation.variableDefinitions.toVariableDefinitionNodes(),
    };
    const fragmentASTs = operation.selectionSet.fragments
        ? (_a = operation.selectionSet.fragments) === null || _a === void 0 ? void 0 : _a.toFragmentDefinitionNodes()
        : [];
    return {
        kind: graphql_1.Kind.DOCUMENT,
        definitions: [operationAST].concat(fragmentASTs),
    };
}
exports.operationToDocument = operationToDocument;
//# sourceMappingURL=operations.js.map