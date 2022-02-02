"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeSubgraphs = exports.isMergeFailure = exports.isMergeSuccessful = void 0;
const federation_internals_1 = require("@apollo/federation-internals");
const hints_1 = require("../hints");
const coreSpec = federation_internals_1.CORE_VERSIONS.latest();
const joinSpec = federation_internals_1.JOIN_VERSIONS.latest();
const tagSpec = federation_internals_1.TAG_VERSIONS.latest();
const MAX_HUMAN_READABLE_LIST_LENGTH = 100;
const MERGED_TYPE_SYSTEM_DIRECTIVES = ['inaccessible', 'deprecated', 'specifiedBy', 'tag'];
const defaultCompositionOptions = {
    allowedFieldTypeMergingSubtypingRules: federation_internals_1.DEFAULT_SUBTYPING_RULES
};
function isMergeSuccessful(mergeResult) {
    return !isMergeFailure(mergeResult);
}
exports.isMergeSuccessful = isMergeSuccessful;
function isMergeFailure(mergeResult) {
    return !!mergeResult.errors;
}
exports.isMergeFailure = isMergeFailure;
function mergeSubgraphs(subgraphs, options = {}) {
    return new Merger(subgraphs, { ...defaultCompositionOptions, ...options }).merge();
}
exports.mergeSubgraphs = mergeSubgraphs;
function printHumanReadableList(names, prefixSingle, prefixPlural) {
    (0, federation_internals_1.assert)(names.length > 0, 'Should not have been called with no names');
    if (names.length == 1) {
        return prefixSingle ? prefixSingle + ' ' + names[0] : names[0];
    }
    let toDisplay = names;
    let totalLength = toDisplay.reduce((count, name) => count + name.length, 0);
    while (totalLength > MAX_HUMAN_READABLE_LIST_LENGTH && toDisplay.length > 1) {
        toDisplay = toDisplay.slice(0, toDisplay.length - 1);
        totalLength = toDisplay.reduce((count, name) => count + name.length, 0);
    }
    const prefix = prefixPlural
        ? prefixPlural + ' '
        : (prefixSingle ? prefixSingle + ' ' : '');
    if (toDisplay.length === names.length) {
        return prefix + (0, federation_internals_1.joinStrings)(toDisplay);
    }
    else {
        return prefix + toDisplay.join(', ') + ', ...';
    }
}
function printSubgraphNames(names) {
    return printHumanReadableList(names.map(n => `"${n}"`), 'subgraph', 'subgraphs');
}
function copyTypeReference(source, dest) {
    switch (source.kind) {
        case 'ListType':
            return new federation_internals_1.ListType(copyTypeReference(source.ofType, dest));
        case 'NonNullType':
            return new federation_internals_1.NonNullType(copyTypeReference(source.ofType, dest));
        default:
            const type = dest.type(source.name);
            (0, federation_internals_1.assert)(type, () => `Cannot find type ${source} in destination schema (with types: ${dest.types().join(', ')})`);
            return type;
    }
}
function isMergedType(type) {
    return !(0, federation_internals_1.isFederationType)(type) && !type.isIntrospectionType();
}
function isMergedField(field) {
    return field.kind !== 'FieldDefinition' || !(0, federation_internals_1.isFederationField)(field);
}
function isMergedDirective(definition) {
    if (MERGED_TYPE_SYSTEM_DIRECTIVES.includes(definition.name)) {
        return true;
    }
    if (definition instanceof federation_internals_1.Directive) {
        return false;
    }
    return definition.locations.some(loc => federation_internals_1.executableDirectiveLocations.includes(loc));
}
function filteredRoot(def, rootKind) {
    var _a;
    const type = (_a = def.root(rootKind)) === null || _a === void 0 ? void 0 : _a.type;
    return type && hasMergedFields(type) ? type : undefined;
}
function hasMergedFields(type) {
    for (const field of type.fields()) {
        if (isMergedField(field)) {
            return true;
        }
    }
    return false;
}
function indexOfMax(arr) {
    if (arr.length === 0) {
        return -1;
    }
    let indexOfMax = 0;
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] > arr[indexOfMax]) {
            indexOfMax = i;
        }
    }
    return indexOfMax;
}
function descriptionString(toIndent, indentation) {
    return indentation + '"""\n' + indentation + toIndent.replace('\n', '\n' + indentation) + '\n' + indentation + '"""';
}
function typeKindToString(t) {
    return t.kind.replace("Type", " Type");
}
function hasTagUsage(subgraph) {
    const directive = subgraph.directive(federation_internals_1.tagDirectiveName);
    return !!directive && directive.applications().length > 0;
}
function locationString(locations) {
    if (locations.length === 0) {
        return "";
    }
    return (locations.length === 1 ? 'location ' : 'locations ') + '"' + locations.join(', ') + '"';
}
class Merger {
    constructor(subgraphs, options) {
        this.subgraphs = subgraphs;
        this.options = options;
        this.errors = [];
        this.hints = [];
        this.merged = new federation_internals_1.Schema();
        this.names = subgraphs.names();
        this.subgraphsSchema = subgraphs.values().map(subgraph => subgraph.schema);
        this.subgraphNamesToJoinSpecName = this.prepareSupergraph();
        this.externalTesters = this.subgraphsSchema.map(schema => new federation_internals_1.ExternalTester(schema));
    }
    prepareSupergraph() {
        coreSpec.addToSchema(this.merged);
        coreSpec.applyFeatureToSchema(this.merged, joinSpec, undefined, 'EXECUTION');
        if (this.subgraphsSchema.some(hasTagUsage)) {
            coreSpec.applyFeatureToSchema(this.merged, tagSpec);
        }
        return joinSpec.populateGraphEnum(this.merged, this.subgraphs);
    }
    joinSpecName(subgraphIndex) {
        return this.subgraphNamesToJoinSpecName.get(this.names[subgraphIndex]);
    }
    merge() {
        this.addTypesShallow();
        this.addDirectivesShallow();
        for (const objectType of this.merged.types('ObjectType')) {
            this.mergeImplements(this.subgraphsTypes(objectType), objectType);
        }
        for (const interfaceType of this.merged.types('InterfaceType')) {
            this.mergeImplements(this.subgraphsTypes(interfaceType), interfaceType);
        }
        for (const unionType of this.merged.types('UnionType')) {
            this.mergeType(this.subgraphsTypes(unionType), unionType);
        }
        this.mergeSchemaDefinition(this.subgraphsSchema.map(s => s.schemaDefinition), this.merged.schemaDefinition);
        for (const type of this.merged.types()) {
            if (type.kind === 'UnionType' || joinSpec.isSpecType(type)) {
                continue;
            }
            this.mergeType(this.subgraphsTypes(type), type);
        }
        for (const definition of this.merged.directives()) {
            if (coreSpec.isSpecDirective(definition) || joinSpec.isSpecDirective(definition)) {
                continue;
            }
            this.mergeDirectiveDefinition(this.subgraphsSchema.map(s => s.directive(definition.name)), definition);
        }
        for (const federationDirective of MERGED_TYPE_SYSTEM_DIRECTIVES) {
            const directive = this.merged.directive(federationDirective);
            if (directive && !directive.isBuiltIn && directive.applications().length === 0) {
                directive.remove();
            }
        }
        if (!this.merged.schemaDefinition.rootType('query')) {
            this.errors.push(federation_internals_1.ERRORS.NO_QUERIES.err({ message: "No queries found in any subgraph: a supergraph must have a query root type." }));
        }
        if (this.errors.length === 0) {
            this.postMergeValidations();
            if (this.errors.length === 0) {
                try {
                    this.merged.validate();
                }
                catch (e) {
                    const causes = (0, federation_internals_1.errorCauses)(e);
                    if (causes) {
                        this.errors.push(...causes);
                    }
                    else {
                        throw e;
                    }
                }
            }
        }
        if (this.errors.length > 0) {
            return { errors: this.errors };
        }
        else {
            return {
                supergraph: this.merged,
                hints: this.hints
            };
        }
    }
    addTypesShallow() {
        const mismatchedTypes = new Set();
        for (const subgraph of this.subgraphsSchema) {
            for (const type of subgraph.allTypes()) {
                if (!isMergedType(type)) {
                    continue;
                }
                const previous = this.merged.type(type.name);
                if (!previous) {
                    this.merged.addType((0, federation_internals_1.newNamedType)(type.kind, type.name));
                }
                else if (previous.kind !== type.kind) {
                    mismatchedTypes.add(type.name);
                }
            }
        }
        mismatchedTypes.forEach(t => this.reportMismatchedTypeDefinitions(t));
    }
    addDirectivesShallow() {
        for (const subgraph of this.subgraphsSchema) {
            for (const directive of subgraph.allDirectives()) {
                if (!isMergedDirective(directive)) {
                    continue;
                }
                if (!this.merged.directive(directive.name)) {
                    this.merged.addDirectiveDefinition(new federation_internals_1.DirectiveDefinition(directive.name));
                }
            }
        }
    }
    reportMismatchedTypeDefinitions(mismatchedType) {
        const supergraphType = this.merged.type(mismatchedType);
        this.reportMismatchError(federation_internals_1.ERRORS.TYPE_KIND_MISMATCH, `Type "${mismatchedType}" has mismatched kind: it is defined as `, supergraphType, this.subgraphsSchema.map(s => s.type(mismatchedType)), typeKindToString);
    }
    reportMismatchError(code, message, mismatchedElement, subgraphElements, mismatchAccessor) {
        this.reportMismatch(mismatchedElement, subgraphElements, mismatchAccessor, (elt, names) => `${elt} in ${names}`, (elt, names) => `${elt} in ${names}`, (distribution, nodes) => {
            this.errors.push(code.err({
                message: message + (0, federation_internals_1.joinStrings)(distribution, ' and ', ' but '),
                nodes
            }));
        }, elt => !elt);
    }
    reportMismatchErrorWithSpecifics(code, message, mismatchedElement, subgraphElements, mismatchAccessor, supergraphElementPrinter, otherElementsPrinter, ignorePredicate, includeMissingSources = false) {
        this.reportMismatch(mismatchedElement, subgraphElements, mismatchAccessor, supergraphElementPrinter, otherElementsPrinter, (distribution, nodes) => {
            this.errors.push(code.err({
                message: message + distribution[0] + (0, federation_internals_1.joinStrings)(distribution.slice(1), ' and '),
                nodes
            }));
        }, ignorePredicate, includeMissingSources);
    }
    reportMismatchHint(hintId, message, supergraphElement, subgraphElements, mismatchAccessor, supergraphElementPrinter, otherElementsPrinter, ignorePredicate, includeMissingSources = false, noEndOfMessageDot = false) {
        this.reportMismatch(supergraphElement, subgraphElements, mismatchAccessor, supergraphElementPrinter, otherElementsPrinter, (distribution, astNodes) => {
            this.hints.push(new hints_1.CompositionHint(hintId, message + distribution[0] + (0, federation_internals_1.joinStrings)(distribution.slice(1), ' and ') + (noEndOfMessageDot ? '' : '.'), supergraphElement instanceof federation_internals_1.NamedSchemaElement ? supergraphElement.coordinate : '<schema>', astNodes));
        }, ignorePredicate, includeMissingSources);
    }
    reportMismatch(supergraphElement, subgraphElements, mismatchAccessor, supergraphElementPrinter, otherElementsPrinter, reporter, ignorePredicate, includeMissingSources = false) {
        var _a;
        const distributionMap = new federation_internals_1.MultiMap();
        const astNodes = [];
        for (const [i, subgraphElt] of subgraphElements.entries()) {
            if (!subgraphElt) {
                if (includeMissingSources) {
                    distributionMap.add('', this.names[i]);
                }
                continue;
            }
            if (ignorePredicate && ignorePredicate(subgraphElt)) {
                continue;
            }
            const elt = mismatchAccessor(subgraphElt, false);
            distributionMap.add(elt !== null && elt !== void 0 ? elt : '', this.names[i]);
            if (subgraphElt.sourceAST) {
                astNodes.push((0, federation_internals_1.addSubgraphToASTNode)(subgraphElt.sourceAST, this.names[i]));
            }
        }
        const supergraphMismatch = (_a = mismatchAccessor(supergraphElement, true)) !== null && _a !== void 0 ? _a : '';
        (0, federation_internals_1.assert)(distributionMap.size > 1, () => `Should not have been called for ${supergraphElement}`);
        const distribution = [];
        const subgraphsLikeSupergraph = distributionMap.get(supergraphMismatch);
        distribution.push(supergraphElementPrinter(supergraphMismatch, subgraphsLikeSupergraph ? printSubgraphNames(subgraphsLikeSupergraph) : undefined));
        for (const [v, names] of distributionMap.entries()) {
            if (v === supergraphMismatch) {
                continue;
            }
            distribution.push(otherElementsPrinter(v === '' ? undefined : v, printSubgraphNames(names)));
        }
        reporter(distribution, astNodes);
    }
    subgraphsTypes(supergraphType) {
        return this.subgraphsSchema.map((subgraph) => {
            const type = subgraph.type(supergraphType.name);
            if (!type || type.kind !== supergraphType.kind) {
                return undefined;
            }
            return type;
        });
    }
    mergeImplements(sources, dest) {
        const implemented = new Set();
        const joinImplementsDirective = joinSpec.implementsDirective(this.merged);
        for (const [idx, source] of sources.entries()) {
            if (source) {
                const name = this.joinSpecName(idx);
                for (const itf of source.interfaces()) {
                    implemented.add(itf.name);
                    dest.applyDirective(joinImplementsDirective, { graph: name, interface: itf.name });
                }
            }
        }
        implemented.forEach(itf => dest.addImplementedInterface(itf));
    }
    mergeDescription(sources, dest) {
        const descriptions = [];
        const counts = [];
        for (const source of sources) {
            if (!source || source.description === undefined) {
                continue;
            }
            const idx = descriptions.indexOf(source.description);
            if (idx < 0) {
                descriptions.push(source.description);
                counts.push(source.description === '' ? Number.MIN_SAFE_INTEGER : 1);
            }
            else {
                counts[idx]++;
            }
        }
        if (descriptions.length > 0) {
            if (descriptions.length === 1) {
                dest.description = descriptions[0];
            }
            else {
                const idx = indexOfMax(counts);
                dest.description = descriptions[idx];
                const name = dest instanceof federation_internals_1.NamedSchemaElement ? `Element "${dest.coordinate}"` : 'The schema definition';
                this.reportMismatchHint(hints_1.hintInconsistentDescription, `${name} has inconsistent descriptions across subgraphs. `, dest, sources, elt => elt.description, (desc, subgraphs) => `The supergraph will use description (from ${subgraphs}):\n${descriptionString(desc, '  ')}`, (desc, subgraphs) => `\nIn ${subgraphs}, the description is:\n${descriptionString(desc, '  ')}`, elt => (elt === null || elt === void 0 ? void 0 : elt.description) === undefined, false, true);
            }
        }
    }
    mergeType(sources, dest) {
        this.checkForExtensionWithNoBase(sources, dest);
        this.mergeDescription(sources, dest);
        this.addJoinType(sources, dest);
        this.mergeAppliedDirectives(sources, dest);
        switch (dest.kind) {
            case 'ScalarType':
                break;
            case 'ObjectType':
                this.mergeObject(sources, dest);
                break;
            case 'InterfaceType':
                this.mergeInterface(sources, dest);
                break;
            case 'UnionType':
                this.mergeUnion(sources, dest);
                break;
            case 'EnumType':
                this.mergeEnum(sources, dest);
                break;
            case 'InputObjectType':
                this.mergeInput(sources, dest);
                break;
        }
    }
    checkForExtensionWithNoBase(sources, dest) {
        if ((0, federation_internals_1.isObjectType)(dest) && dest.isRootType()) {
            return;
        }
        const defSubgraphs = [];
        const extensionSubgraphs = [];
        const extensionASTs = [];
        for (const [i, source] of sources.entries()) {
            if (!source) {
                continue;
            }
            if (source.hasNonExtensionElements()) {
                defSubgraphs.push(this.names[i]);
            }
            if (source.hasExtensionElements()) {
                extensionSubgraphs.push(this.names[i]);
                extensionASTs.push((0, federation_internals_1.firstOf)(source.extensions().values()).sourceAST);
            }
        }
        if (extensionSubgraphs.length > 0 && defSubgraphs.length === 0) {
            for (const [i, subgraph] of extensionSubgraphs.entries()) {
                this.errors.push(federation_internals_1.ERRORS.EXTENSION_WITH_NO_BASE.err({
                    message: `[${subgraph}] Type "${dest}" is an extension type, but there is no type definition for "${dest}" in any subgraph.`,
                    nodes: extensionASTs[i],
                }));
            }
        }
    }
    addJoinType(sources, dest) {
        const joinTypeDirective = joinSpec.typeDirective(this.merged);
        for (const [idx, source] of sources.entries()) {
            if (!source) {
                continue;
            }
            const sourceSchema = this.subgraphsSchema[idx];
            const keys = source.appliedDirectivesOf(federation_internals_1.federationBuiltIns.keyDirective(sourceSchema));
            const name = this.joinSpecName(idx);
            if (!keys.length) {
                dest.applyDirective(joinTypeDirective, { graph: name });
            }
            else {
                for (const key of keys) {
                    const extension = key.ofExtension() || source.hasAppliedDirective(federation_internals_1.federationBuiltIns.extendsDirective(sourceSchema)) ? true : undefined;
                    dest.applyDirective(joinTypeDirective, { graph: name, key: key.arguments().fields, extension });
                }
            }
        }
    }
    mergeObject(sources, dest) {
        const isEntity = this.hintOnInconsistentEntity(sources, dest);
        const isValueType = !isEntity && !dest.isRootType();
        this.addFieldsShallow(sources, dest);
        if (!dest.hasFields()) {
            dest.remove();
        }
        else {
            for (const destField of dest.fields()) {
                if (isValueType) {
                    this.hintOnInconsistentValueTypeField(sources, dest, destField);
                }
                const subgraphFields = sources.map(t => t === null || t === void 0 ? void 0 : t.field(destField.name));
                this.mergeField(subgraphFields, destField);
            }
        }
    }
    hintOnInconsistentEntity(sources, dest) {
        const sourceAsEntity = [];
        const sourceAsNonEntity = [];
        for (const source of sources) {
            if (!source) {
                continue;
            }
            if (source.hasAppliedDirective('key')) {
                sourceAsEntity.push(source);
            }
            else {
                sourceAsNonEntity.push(source);
            }
        }
        if (sourceAsEntity.length > 0 && sourceAsNonEntity.length > 0) {
            this.reportMismatchHint(hints_1.hintInconsistentEntity, `Type "${dest}" is declared as an entity (has a @key applied) in only some subgraphs: `, dest, sources, type => type.hasAppliedDirective('key') ? 'yes' : 'no', (_, subgraphs) => `it has no key in ${subgraphs}`, (_, subgraphs) => ` but has one in ${subgraphs}`);
        }
        return sourceAsEntity.length > 0;
    }
    hintOnInconsistentValueTypeField(sources, dest, field) {
        let hintId;
        let typeDescription;
        switch (dest.kind) {
            case 'ObjectType':
                hintId = hints_1.hintInconsistentObjectValueTypeField;
                typeDescription = 'non-entity object';
                break;
            case 'InterfaceType':
                hintId = hints_1.hintInconsistentInterfaceValueTypeField;
                typeDescription = 'interface';
                break;
            case 'InputObjectType':
                hintId = hints_1.hintInconsistentInputObjectField;
                typeDescription = 'input object';
                break;
        }
        for (const source of sources) {
            if (source && !source.field(field.name)) {
                this.reportMismatchHint(hintId, `Field "${field.coordinate}" of ${typeDescription} type "${dest}" is not defined in all the subgraphs defining "${dest}" (but can always be resolved from these subgraphs): `, dest, sources, type => type.field(field.name) ? 'yes' : 'no', (_, subgraphs) => `"${field.coordinate}" is defined in ${subgraphs}`, (_, subgraphs) => ` but not in ${subgraphs}`);
            }
        }
    }
    addFieldsShallow(sources, dest) {
        for (const source of sources) {
            if (!source) {
                continue;
            }
            for (const field of source.fields()) {
                if (!isMergedField(field)) {
                    continue;
                }
                if (!dest.field(field.name)) {
                    dest.addField(field.name);
                }
            }
        }
    }
    isExternal(sourceIdx, field) {
        return this.externalTesters[sourceIdx].isExternal(field);
    }
    withoutExternal(sources) {
        return sources.map((s, i) => s !== undefined && this.isExternal(i, s) ? undefined : s);
    }
    hasExternal(sources) {
        return sources.some((s, i) => s !== undefined && this.isExternal(i, s));
    }
    mergeField(sources, dest) {
        if (sources.every((s, i) => s === undefined || this.isExternal(i, s))) {
            const definingSubgraphs = sources.map((source, i) => source ? this.names[i] : undefined).filter(s => s !== undefined);
            const nodes = sources.map(source => source === null || source === void 0 ? void 0 : source.sourceAST).filter(s => s !== undefined);
            this.errors.push(federation_internals_1.ERRORS.EXTERNAL_MISSING_ON_BASE.err({
                message: `Field "${dest.coordinate}" is marked @external on all the subgraphs in which it is listed (${printSubgraphNames(definingSubgraphs)}).`,
                nodes
            }));
            return;
        }
        const withoutExternal = this.withoutExternal(sources);
        this.mergeDescription(withoutExternal, dest);
        this.mergeAppliedDirectives(withoutExternal, dest);
        this.addArgumentsShallow(withoutExternal, dest);
        for (const destArg of dest.arguments()) {
            const subgraphArgs = withoutExternal.map(f => f === null || f === void 0 ? void 0 : f.argument(destArg.name));
            this.mergeArgument(subgraphArgs, destArg);
        }
        const allTypesEqual = this.mergeTypeReference(withoutExternal, dest);
        if (this.hasExternal(sources)) {
            this.validateExternalFields(sources, dest, allTypesEqual);
        }
        this.addJoinField(sources, dest, allTypesEqual);
    }
    validateExternalFields(sources, dest, allTypesEqual) {
        let hasInvalidTypes = false;
        const invalidArgsPresence = new Set();
        const invalidArgsTypes = new Set();
        const invalidArgsDefaults = new Set();
        for (const [i, source] of sources.entries()) {
            if (!source || !this.isExternal(i, source)) {
                continue;
            }
            if (!((0, federation_internals_1.sameType)(dest.type, source.type) || (!allTypesEqual && this.isStrictSubtype(dest.type, source.type)))) {
                hasInvalidTypes = true;
            }
            for (const destArg of dest.arguments()) {
                const name = destArg.name;
                const arg = source.argument(name);
                if (!arg) {
                    invalidArgsPresence.add(name);
                    continue;
                }
                if (!(0, federation_internals_1.sameType)(destArg.type, arg.type) && !this.isStrictSubtype(arg.type, destArg.type)) {
                    invalidArgsTypes.add(name);
                }
                if (destArg.defaultValue !== arg.defaultValue) {
                    invalidArgsDefaults.add(name);
                }
            }
        }
        if (hasInvalidTypes) {
            this.reportMismatchError(federation_internals_1.ERRORS.EXTERNAL_TYPE_MISMATCH, `Field "${dest.coordinate}" has incompatible types across subgraphs (where marked @external): it has `, dest, sources, field => `type "${field.type}"`);
        }
        for (const arg of invalidArgsPresence) {
            const destArg = dest.argument(arg);
            this.reportMismatchErrorWithSpecifics(federation_internals_1.ERRORS.EXTERNAL_ARGUMENT_MISSING, `Field "${dest.coordinate}" is missing argument "${destArg.coordinate}" in some subgraphs where it is marked @external: `, destArg, sources.map(s => s === null || s === void 0 ? void 0 : s.argument(destArg.name)), arg => arg ? `argument "${arg.coordinate}"` : undefined, (elt, subgraphs) => `${elt} is declared in ${subgraphs}`, (_, subgraphs) => ` but not in ${subgraphs} (where "${dest.coordinate}" is @external).`, undefined, true);
        }
        for (const arg of invalidArgsTypes) {
            const destArg = dest.argument(arg);
            this.reportMismatchError(federation_internals_1.ERRORS.EXTERNAL_ARGUMENT_TYPE_MISMATCH, `Argument "${destArg.coordinate}" has incompatible types across subgraphs (where "${dest.coordinate}" is marked @external): it has `, destArg, sources.map(s => s === null || s === void 0 ? void 0 : s.argument(destArg.name)), arg => `type "${arg.type}"`);
        }
        for (const arg of invalidArgsDefaults) {
            const destArg = dest.argument(arg);
            this.reportMismatchError(federation_internals_1.ERRORS.EXTERNAL_ARGUMENT_DEFAULT_MISMATCH, `Argument "${destArg.coordinate}" has incompatible defaults across subgraphs (where "${dest.coordinate}" is marked @external): it has `, destArg, sources.map(s => s === null || s === void 0 ? void 0 : s.argument(destArg.name)), arg => arg.defaultValue !== undefined ? `default value ${(0, federation_internals_1.valueToString)(arg.defaultValue, arg.type)}` : 'no default value');
        }
    }
    needsJoinField(sources, parentName, allTypesEqual) {
        if (!allTypesEqual) {
            return true;
        }
        for (const [idx, source] of sources.entries()) {
            if (source) {
                if (this.isExternal(idx, source)
                    || source.hasAppliedDirective(federation_internals_1.providesDirectiveName)
                    || source.hasAppliedDirective(federation_internals_1.requiresDirectiveName)) {
                    return true;
                }
            }
            else {
                if (this.subgraphsSchema[idx].type(parentName)) {
                    return true;
                }
            }
        }
        return false;
    }
    addJoinField(sources, dest, allTypesEqual) {
        var _a;
        if (!this.needsJoinField(sources, dest.parent.name, allTypesEqual)) {
            return;
        }
        const joinFieldDirective = joinSpec.fieldDirective(this.merged);
        for (const [idx, source] of sources.entries()) {
            if (!source) {
                continue;
            }
            const external = this.isExternal(idx, source);
            const name = this.joinSpecName(idx);
            dest.applyDirective(joinFieldDirective, {
                graph: name,
                requires: this.getFieldSet(source, federation_internals_1.federationBuiltIns.requiresDirective(this.subgraphsSchema[idx])),
                provides: this.getFieldSet(source, federation_internals_1.federationBuiltIns.providesDirective(this.subgraphsSchema[idx])),
                type: allTypesEqual ? undefined : (_a = source.type) === null || _a === void 0 ? void 0 : _a.toString(),
                external: external ? true : undefined,
            });
        }
    }
    getFieldSet(element, directive) {
        const applications = element.appliedDirectivesOf(directive);
        (0, federation_internals_1.assert)(applications.length <= 1, () => `Found more than one application of ${directive} on ${element}`);
        return applications.length === 0 ? undefined : applications[0].arguments().fields;
    }
    mergeTypeReference(sources, dest, isContravariant = false) {
        let destType;
        let hasSubtypes = false;
        let hasIncompatible = false;
        for (const source of sources) {
            if (!source) {
                continue;
            }
            const sourceType = source.type;
            if (!destType || (0, federation_internals_1.sameType)(destType, sourceType)) {
                destType = sourceType;
            }
            else if (this.isStrictSubtype(destType, sourceType)) {
                hasSubtypes = true;
                if (isContravariant) {
                    destType = sourceType;
                }
            }
            else if (this.isStrictSubtype(sourceType, destType)) {
                hasSubtypes = true;
                if (!isContravariant) {
                    destType = sourceType;
                }
            }
            else {
                hasIncompatible = true;
            }
        }
        (0, federation_internals_1.assert)(destType, () => `We should have found at least one subgraph with a type for ${dest.coordinate}`);
        dest.type = copyTypeReference(destType, this.merged);
        const isArgument = dest instanceof federation_internals_1.ArgumentDefinition;
        const elementKind = isArgument ? 'Argument' : 'Field';
        if (hasIncompatible) {
            this.reportMismatchError(isArgument ? federation_internals_1.ERRORS.ARGUMENT_TYPE_MISMATCH : federation_internals_1.ERRORS.FIELD_TYPE_MISMATCH, `${elementKind} "${dest.coordinate}" has incompatible types across subgraphs: it has `, dest, sources, field => `type "${field.type}"`);
            return false;
        }
        else if (hasSubtypes) {
            this.reportMismatchHint(isArgument ? hints_1.hintInconsistentArgumentType : hints_1.hintInconsistentFieldType, `${elementKind} "${dest.coordinate}" has mismatched, but compatible, types across subgraphs: `, dest, sources, field => field.type.toString(), (elt, subgraphs) => `will use type "${elt}" (from ${subgraphs}) in supergraph but "${dest.coordinate}" has `, (elt, subgraphs) => `${isContravariant ? 'supertype' : 'subtype'} "${elt}" in ${subgraphs}`);
            return false;
        }
        return true;
    }
    isStrictSubtype(type, maybeSubType) {
        return (0, federation_internals_1.isStrictSubtype)(type, maybeSubType, this.options.allowedFieldTypeMergingSubtypingRules, (union, maybeMember) => this.merged.type(union.name).hasTypeMember(maybeMember.name), (maybeImplementer, itf) => this.merged.type(maybeImplementer.name).implementsInterface(itf));
    }
    addArgumentsShallow(sources, dest) {
        for (const source of sources) {
            if (!source) {
                continue;
            }
            for (const argument of source.arguments()) {
                if (!dest.argument(argument.name)) {
                    dest.addArgument(argument.name);
                }
            }
        }
    }
    mergeArgument(sources, dest, useIntersection = false) {
        if (useIntersection) {
            for (const source of sources) {
                if (!source) {
                    this.reportMismatchHint(hints_1.hintInconsistentArgumentPresence, `Argument "${dest.coordinate}" will not be added to "${dest.parent}" in the supergraph as it does not appear in all subgraphs: `, dest, sources, _ => 'yes', (_, subgraphs) => `it is defined in ${subgraphs}`, (_, subgraphs) => ` but not in ${subgraphs}`, undefined, true);
                    dest.remove();
                    return;
                }
            }
        }
        this.mergeDescription(sources, dest);
        this.mergeAppliedDirectives(sources, dest);
        this.mergeTypeReference(sources, dest, true);
        this.mergeDefaultValue(sources, dest, 'Argument');
    }
    mergeDefaultValue(sources, dest, kind) {
        let destDefault;
        let hasSeenSource = false;
        let isInconsistent = false;
        let isIncompatible = false;
        for (const source of sources) {
            if (!source) {
                continue;
            }
            const sourceDefault = source.defaultValue;
            if (destDefault === undefined) {
                destDefault = sourceDefault;
                if (hasSeenSource && sourceDefault !== undefined) {
                    isInconsistent = true;
                }
            }
            else if (!(0, federation_internals_1.valueEquals)(destDefault, sourceDefault)) {
                isInconsistent = true;
                if (sourceDefault !== undefined) {
                    isIncompatible = true;
                }
            }
            hasSeenSource = true;
        }
        if (!isInconsistent || isIncompatible) {
            dest.defaultValue = destDefault;
        }
        if (isIncompatible) {
            this.reportMismatchError(kind === 'Argument' ? federation_internals_1.ERRORS.ARGUMENT_DEFAULT_MISMATCH : federation_internals_1.ERRORS.INPUT_FIELD_DEFAULT_MISMATCH, `${kind} "${dest.coordinate}" has incompatible default values across subgraphs: it has `, dest, sources, arg => arg.defaultValue !== undefined ? `default value ${(0, federation_internals_1.valueToString)(arg.defaultValue, arg.type)}` : 'no default value');
        }
        else if (isInconsistent) {
            this.reportMismatchHint(hints_1.hintInconsistentDefaultValue, `${kind} "${dest.coordinate}" has a default value in only some subgraphs: `, dest, sources, arg => arg.defaultValue !== undefined ? (0, federation_internals_1.valueToString)(arg.defaultValue, arg.type) : undefined, (_, subgraphs) => `will not use a default in the supergraph (there is no default in ${subgraphs}) but `, (elt, subgraphs) => `"${dest.coordinate}" has default value ${elt} in ${subgraphs}`);
        }
    }
    mergeInterface(sources, dest) {
        this.addFieldsShallow(sources, dest);
        for (const destField of dest.fields()) {
            this.hintOnInconsistentValueTypeField(sources, dest, destField);
            const subgraphFields = sources.map(t => t === null || t === void 0 ? void 0 : t.field(destField.name));
            this.mergeField(subgraphFields, destField);
        }
    }
    mergeUnion(sources, dest) {
        this.mergeDescription(sources, dest);
        for (const source of sources) {
            if (!source) {
                continue;
            }
            for (const type of source.types()) {
                if (!dest.hasTypeMember(type.name)) {
                    dest.addType(type.name);
                }
            }
        }
        for (const type of dest.types()) {
            this.hintOnInconsistentUnionMember(sources, dest, type.name);
        }
    }
    hintOnInconsistentUnionMember(sources, dest, memberName) {
        for (const source of sources) {
            if (source && !source.hasTypeMember(memberName)) {
                this.reportMismatchHint(hints_1.hintInconsistentUnionMember, `Member type "${memberName}" in union type "${dest}" is only defined in a subset of subgraphs defining "${dest}" (but can always be resolved from these subgraphs): `, dest, sources, type => type.hasTypeMember(memberName) ? 'yes' : 'no', (_, subgraphs) => `"${memberName}" is defined in ${subgraphs}`, (_, subgraphs) => ` but not in ${subgraphs}`);
            }
        }
    }
    mergeEnum(sources, dest) {
        for (const source of sources) {
            if (!source) {
                continue;
            }
            for (const value of source.values) {
                if (!dest.value(value.name)) {
                    dest.addValue(value.name);
                }
            }
        }
        for (const value of dest.values) {
            const valueSources = sources.map(s => s === null || s === void 0 ? void 0 : s.value(value.name));
            this.mergeDescription(valueSources, value);
            this.mergeAppliedDirectives(valueSources, value);
            this.hintOnInconsistentEnumValue(sources, dest, value.name);
        }
    }
    hintOnInconsistentEnumValue(sources, dest, valueName) {
        for (const source of sources) {
            if (source && !source.value(valueName)) {
                this.reportMismatchHint(hints_1.hintInconsistentEnumValue, `Value "${valueName}" of enum type "${dest}" is only defined in a subset of the subgraphs defining "${dest}" (but can always be resolved from these subgraphs): `, dest, sources, type => type.value(valueName) ? 'yes' : 'no', (_, subgraphs) => `"${valueName}" is defined in ${subgraphs}`, (_, subgraphs) => ` but not in ${subgraphs}`);
            }
        }
    }
    mergeInput(sources, dest) {
        this.addFieldsShallow(sources, dest);
        for (const destField of dest.fields()) {
            this.hintOnInconsistentValueTypeField(sources, dest, destField);
            const subgraphFields = sources.map(t => t === null || t === void 0 ? void 0 : t.field(destField.name));
            this.mergeInputField(subgraphFields, destField);
        }
    }
    mergeInputField(sources, dest) {
        this.mergeDescription(sources, dest);
        this.mergeAppliedDirectives(sources, dest);
        const allTypesEqual = this.mergeTypeReference(sources, dest, true);
        this.addJoinField(sources, dest, allTypesEqual);
        this.mergeDefaultValue(sources, dest, 'Input field');
    }
    mergeDirectiveDefinition(sources, dest) {
        this.mergeDescription(sources, dest);
        if (MERGED_TYPE_SYSTEM_DIRECTIVES.includes(dest.name)) {
            this.mergeTypeSystemDirectiveDefinition(sources, dest);
        }
        else {
            this.mergeExecutionDirectiveDefinition(sources, dest);
        }
    }
    mergeTypeSystemDirectiveDefinition(sources, dest) {
        this.addArgumentsShallow(sources, dest);
        for (const destArg of dest.arguments()) {
            const subgraphArgs = sources.map(f => f === null || f === void 0 ? void 0 : f.argument(destArg.name));
            this.mergeArgument(subgraphArgs, destArg);
        }
        let repeatable = undefined;
        let inconsistentRepeatable = false;
        let locations = undefined;
        let inconsistentLocations = false;
        for (const source of sources) {
            if (!source) {
                continue;
            }
            if (repeatable === undefined) {
                repeatable = source.repeatable;
            }
            else if (repeatable !== source.repeatable) {
                inconsistentRepeatable = true;
            }
            const sourceLocations = this.extractLocations(source);
            if (!locations) {
                locations = sourceLocations;
            }
            else {
                if (!(0, federation_internals_1.arrayEquals)(locations, sourceLocations)) {
                    inconsistentLocations = true;
                }
                sourceLocations.forEach(loc => {
                    if (!locations.includes(loc)) {
                        locations.push(loc);
                    }
                });
            }
        }
        dest.repeatable = repeatable;
        dest.addLocations(...locations);
        if (inconsistentRepeatable) {
            this.reportMismatchHint(hints_1.hintInconsistentTypeSystemDirectiveRepeatable, `Type system directive "${dest}" is marked repeatable in the supergraph but it is inconsistently marked repeatable in subgraphs: `, dest, sources, directive => directive.repeatable ? 'yes' : 'no', (_, subgraphs) => `it is repeatable in ${subgraphs}`, (_, subgraphs) => ` but not in ${subgraphs}`);
        }
        if (inconsistentLocations) {
            this.reportMismatchHint(hints_1.hintInconsistentTypeSystemDirectiveLocations, `Type system directive "${dest}" has inconsistent locations across subgraphs `, dest, sources, directive => locationString(this.extractLocations(directive)), (locs, subgraphs) => `and will use ${locs} (union of all subgraphs) in the supergraph, but has: ${subgraphs ? `${locs} in ${subgraphs} and ` : ''}`, (locs, subgraphs) => `${locs} in ${subgraphs}`);
        }
    }
    mergeExecutionDirectiveDefinition(sources, dest) {
        let repeatable = undefined;
        let inconsistentRepeatable = false;
        let locations = undefined;
        let inconsistentLocations = false;
        for (const source of sources) {
            if (!source) {
                const usages = dest.remove();
                (0, federation_internals_1.assert)(usages.length === 0, () => `Found usages of execution directive ${dest}: ${usages}`);
                this.reportMismatchHint(hints_1.hintInconsistentExecutionDirectivePresence, `Execution directive "${dest}" will not be part of the supergraph as it does not appear in all subgraphs: `, dest, sources, _ => 'yes', (_, subgraphs) => `it is defined in ${subgraphs}`, (_, subgraphs) => ` but not in ${subgraphs}`, undefined, true);
                return;
            }
            if (repeatable === undefined) {
                repeatable = source.repeatable;
            }
            else if (repeatable !== source.repeatable) {
                inconsistentRepeatable = true;
                repeatable = false;
            }
            const sourceLocations = this.extractLocations(source);
            if (!locations) {
                locations = sourceLocations;
            }
            else {
                if (!(0, federation_internals_1.arrayEquals)(locations, sourceLocations)) {
                    inconsistentLocations = true;
                }
                locations = locations.filter(loc => sourceLocations.includes(loc));
                if (locations.length === 0) {
                    const usages = dest.remove();
                    (0, federation_internals_1.assert)(usages.length === 0, () => `Found usages of execution directive ${dest}: ${usages}`);
                    this.reportMismatchHint(hints_1.hintNoExecutionDirectiveLocationsIntersection, `Execution directive "${dest}" has no location that is common to all subgraphs: `, dest, sources, directive => locationString(this.extractLocations(directive)), () => `it will not appear in the subgraph as there no intersection between `, (locs, subgraphs) => `${locs} in ${subgraphs}`);
                    return;
                }
            }
        }
        dest.repeatable = repeatable;
        dest.addLocations(...locations);
        if (inconsistentRepeatable) {
            this.reportMismatchHint(hints_1.hintInconsistentExecutionDirectiveRepeatable, `Execution directive "${dest}" will not be marked repeatable in the supergraph as it is inconsistently marked repeatable in subgraphs: `, dest, sources, directive => directive.repeatable ? 'yes' : 'no', (_, subgraphs) => `it is not repeatable in ${subgraphs}`, (_, subgraphs) => ` but is repeatable in ${subgraphs}`);
        }
        if (inconsistentLocations) {
            this.reportMismatchHint(hints_1.hintInconsistentExecutionDirectiveLocations, `Execution directive "${dest}" has inconsistent locations across subgraphs `, dest, sources, directive => locationString(this.extractLocations(directive)), (locs, subgraphs) => `and will use ${locs} (intersection of all subgraphs) in the supergraph, but has: ${subgraphs ? `${locs} in ${subgraphs} and ` : ''}`, (locs, subgraphs) => `${locs} in ${subgraphs}`);
        }
        this.addArgumentsShallow(sources, dest);
        for (const destArg of dest.arguments()) {
            const subgraphArgs = sources.map(f => f === null || f === void 0 ? void 0 : f.argument(destArg.name));
            this.mergeArgument(subgraphArgs, destArg, true);
        }
    }
    extractLocations(source) {
        return this.filterExecutableDirectiveLocations(source).concat().sort();
    }
    filterExecutableDirectiveLocations(source) {
        if (MERGED_TYPE_SYSTEM_DIRECTIVES.includes(source.name)) {
            return source.locations;
        }
        return source.locations.filter(loc => federation_internals_1.executableDirectiveLocations.includes(loc));
    }
    mergeAppliedDirectives(sources, dest) {
        const names = this.gatherAppliedDirectiveNames(sources);
        for (const name of names) {
            this.mergeAppliedDirective(name, sources, dest);
        }
    }
    gatherAppliedDirectiveNames(sources) {
        const names = new Set();
        for (const source of sources) {
            if (source) {
                for (const directive of source.appliedDirectives) {
                    if (isMergedDirective(directive)) {
                        names.add(directive.name);
                    }
                }
            }
        }
        return names;
    }
    mergeAppliedDirective(name, sources, dest) {
        let perSource = [];
        for (const source of sources) {
            if (!source) {
                continue;
            }
            const directives = source.appliedDirectivesOf(name);
            if (directives.length) {
                perSource.push(directives);
            }
        }
        while (perSource.length > 0) {
            const directive = this.pickNextDirective(perSource);
            dest.applyDirective(directive.name, directive.arguments(false));
            perSource = this.removeDirective(directive, perSource);
        }
    }
    pickNextDirective(directives) {
        return directives[0][0];
    }
    removeDirective(toRemove, directives) {
        return directives
            .map(ds => ds.filter(d => !(0, federation_internals_1.valueEquals)(toRemove.arguments(), d.arguments()))).
            filter(ds => ds.length);
    }
    mergeSchemaDefinition(sources, dest) {
        this.mergeDescription(sources, dest);
        this.mergeAppliedDirectives(sources, dest);
        for (const rootKind of federation_internals_1.allSchemaRootKinds) {
            let rootType;
            let isIncompatible = false;
            for (const sourceType of sources.map(s => filteredRoot(s, rootKind))) {
                if (!sourceType) {
                    continue;
                }
                if (rootType) {
                    isIncompatible = isIncompatible || rootType !== sourceType.name;
                }
                else {
                    rootType = sourceType.name;
                }
            }
            if (!rootType) {
                continue;
            }
            dest.setRoot(rootKind, rootType);
            (0, federation_internals_1.assert)(!isIncompatible, () => `Should not have incompatible root type for ${rootKind}`);
        }
    }
    filterSubgraphs(predicate) {
        return this.subgraphsSchema.map((s, i) => predicate(s) ? this.names[i] : undefined).filter(n => n !== undefined);
    }
    subgraphByName(name) {
        return this.subgraphsSchema[this.names.indexOf(name)];
    }
    postMergeValidations() {
        for (const type of this.merged.types()) {
            if (!(0, federation_internals_1.isObjectType)(type) && !(0, federation_internals_1.isInterfaceType)(type)) {
                continue;
            }
            for (const itf of type.interfaces()) {
                for (const itfField of itf.fields()) {
                    const field = type.field(itfField.name);
                    if (!field) {
                        const subgraphsWithTheField = this.filterSubgraphs(s => { var _a; return ((_a = s.typeOfKind(itf.name, 'InterfaceType')) === null || _a === void 0 ? void 0 : _a.field(itfField.name)) !== undefined; });
                        const subgraphsWithTypeImplementingItf = this.filterSubgraphs(s => {
                            const typeInSubgraph = s.type(type.name);
                            return typeInSubgraph !== undefined && typeInSubgraph.implementsInterface(itf.name);
                        });
                        this.errors.push(federation_internals_1.ERRORS.INTERFACE_FIELD_NO_IMPLEM.err({
                            message: `Interface field "${itfField.coordinate}" is declared in ${printSubgraphNames(subgraphsWithTheField)} but type "${type}", `
                                + `which implements "${itf}" only in ${printSubgraphNames(subgraphsWithTypeImplementingItf)} does not have field "${itfField.name}".`,
                            nodes: (0, federation_internals_1.sourceASTs)(...subgraphsWithTheField.map(s => { var _a; return (_a = this.subgraphByName(s).typeOfKind(itf.name, 'InterfaceType')) === null || _a === void 0 ? void 0 : _a.field(itfField.name); }), ...subgraphsWithTypeImplementingItf.map(s => this.subgraphByName(s).type(type.name)))
                        }));
                        continue;
                    }
                }
            }
        }
    }
}
//# sourceMappingURL=merge.js.map