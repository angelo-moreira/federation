"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSubgraphsFromSupergraph = exports.extractSubgraphsNamesAndUrlsFromSupergraph = void 0;
const definitions_1 = require("./definitions");
const federation_1 = require("./federation");
const coreSpec_1 = require("./coreSpec");
const federation_2 = require("./federation");
const utils_1 = require("./utils");
const supergraphs_1 = require("./supergraphs");
const buildSchema_1 = require("./buildSchema");
const graphql_1 = require("graphql");
const operations_1 = require("./operations");
const types_1 = require("./types");
const print_1 = require("./print");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const utils_2 = require("./utils");
function filteredTypes(supergraph, joinSpec, coreSpec) {
    return supergraph.types().filter(t => !joinSpec.isSpecType(t) && !coreSpec.isSpecType(t));
}
function extractSubgraphsNamesAndUrlsFromSupergraph(supergraph) {
    const [_, joinSpec] = (0, supergraphs_1.validateSupergraph)(supergraph);
    const [subgraphs] = collectEmptySubgraphs(supergraph, joinSpec);
    return subgraphs.values().map(subgraph => { return { name: subgraph.name, url: subgraph.url }; });
}
exports.extractSubgraphsNamesAndUrlsFromSupergraph = extractSubgraphsNamesAndUrlsFromSupergraph;
function collectEmptySubgraphs(supergraph, joinSpec) {
    const subgraphs = new federation_2.Subgraphs();
    const graphDirective = joinSpec.graphDirective(supergraph);
    const graphEnum = joinSpec.graphEnum(supergraph);
    const graphEnumNameToSubgraphName = new Map();
    for (const value of graphEnum.values) {
        const graphApplications = value.appliedDirectivesOf(graphDirective);
        if (!graphApplications.length) {
            throw new Error(`Value ${value} of join__Graph enum has no @join__graph directive`);
        }
        const info = graphApplications[0].arguments();
        const subgraph = new federation_2.Subgraph(info.name, info.url, new definitions_1.Schema(federation_1.federationBuiltIns), false);
        subgraphs.add(subgraph);
        graphEnumNameToSubgraphName.set(value.name, info.name);
    }
    return [subgraphs, graphEnumNameToSubgraphName];
}
function extractSubgraphsFromSupergraph(supergraph) {
    const [coreFeatures, joinSpec] = (0, supergraphs_1.validateSupergraph)(supergraph);
    const isFed1 = joinSpec.version.equals(new coreSpec_1.FeatureVersion(0, 1));
    const [subgraphs, graphEnumNameToSubgraphName] = collectEmptySubgraphs(supergraph, joinSpec);
    const typeDirective = joinSpec.typeDirective(supergraph);
    const implementsDirective = joinSpec.implementsDirective(supergraph);
    for (const type of filteredTypes(supergraph, joinSpec, coreFeatures.coreDefinition)) {
        const typeApplications = type.appliedDirectivesOf(typeDirective);
        if (!typeApplications.length) {
            subgraphs.values().map(sg => sg.schema).forEach(schema => schema.addType((0, definitions_1.newNamedType)(type.kind, type.name)));
        }
        else {
            for (const application of typeApplications) {
                const args = application.arguments();
                const subgraphName = graphEnumNameToSubgraphName.get(args.graph);
                const schema = subgraphs.get(subgraphName).schema;
                let subgraphType = schema.type(type.name);
                if (!subgraphType) {
                    subgraphType = schema.addType((0, definitions_1.newNamedType)(type.kind, type.name));
                }
                if (args.key) {
                    const directive = subgraphType.applyDirective('key', { 'fields': args.key });
                    if (args.extension) {
                        directive.setOfExtension(subgraphType.newExtension());
                    }
                }
            }
        }
    }
    const ownerDirective = joinSpec.ownerDirective(supergraph);
    const fieldDirective = joinSpec.fieldDirective(supergraph);
    for (const type of filteredTypes(supergraph, joinSpec, coreFeatures.coreDefinition)) {
        switch (type.kind) {
            case 'ObjectType':
            case 'InterfaceType':
                const addedInterfaces = [];
                const implementsApplications = implementsDirective ? type.appliedDirectivesOf(implementsDirective) : [];
                for (const application of implementsApplications) {
                    const args = application.arguments();
                    const subgraph = subgraphs.get(graphEnumNameToSubgraphName.get(args.graph));
                    const schema = subgraph.schema;
                    schema.type(type.name).addImplementedInterface(args.interface);
                    addedInterfaces.push(args.interface);
                }
                for (const implementations of type.interfaceImplementations()) {
                    const name = implementations.interface.name;
                    if (!addedInterfaces.includes(name)) {
                        for (const subgraph of subgraphs) {
                            const subgraphType = subgraph.schema.type(type.name);
                            const subgraphItf = subgraph.schema.type(name);
                            if (subgraphType && subgraphItf) {
                                subgraphType.addImplementedInterface(name);
                            }
                        }
                    }
                }
            case 'InputObjectType':
                for (const field of type.fields()) {
                    const fieldApplications = field.appliedDirectivesOf(fieldDirective);
                    if (!fieldApplications.length) {
                        const ownerApplications = ownerDirective ? type.appliedDirectivesOf(ownerDirective) : [];
                        if (!ownerApplications.length) {
                            const fieldBaseType = (0, definitions_1.baseType)(field.type);
                            for (const subgraph of subgraphs) {
                                if (subgraph.schema.type(fieldBaseType.name)) {
                                    addSubgraphField(field, subgraph);
                                }
                            }
                        }
                        else {
                            (0, utils_1.assert)(ownerApplications.length == 1, () => `Found multiple join__owner directives on type ${type}`);
                            const subgraph = subgraphs.get(graphEnumNameToSubgraphName.get(ownerApplications[0].arguments().graph));
                            const subgraphField = addSubgraphField(field, subgraph);
                            (0, utils_1.assert)(subgraphField, () => `Found join__owner directive on ${type} but no corresponding join__type`);
                        }
                    }
                    else {
                        for (const application of fieldApplications) {
                            const args = application.arguments();
                            const subgraph = subgraphs.get(graphEnumNameToSubgraphName.get(args.graph));
                            const subgraphField = addSubgraphField(field, subgraph, args.type);
                            (0, utils_1.assert)(subgraphField, () => `Found join__field directive for graph ${subgraph.name} on field ${field.coordinate} but no corresponding join__type on ${type}`);
                            if (args.requires) {
                                subgraphField.applyDirective('requires', { 'fields': args.requires });
                            }
                            if (args.provides) {
                                subgraphField.applyDirective('provides', { 'fields': args.provides });
                            }
                            if (args.external) {
                                subgraphField.applyDirective('external');
                            }
                        }
                    }
                }
                break;
            case 'EnumType':
                for (const subgraph of subgraphs) {
                    const subgraphEnum = subgraph.schema.type(type.name);
                    if (!subgraphEnum) {
                        continue;
                    }
                    (0, utils_1.assert)((0, definitions_1.isEnumType)(subgraphEnum), () => `${subgraphEnum} should be an enum but found a ${subgraphEnum.kind}`);
                    for (const value of type.values) {
                        subgraphEnum.addValue(value.name);
                    }
                }
                break;
            case 'UnionType':
                for (const subgraph of subgraphs) {
                    const subgraphUnion = subgraph.schema.type(type.name);
                    if (!subgraphUnion) {
                        continue;
                    }
                    (0, utils_1.assert)((0, definitions_1.isUnionType)(subgraphUnion), () => `${subgraphUnion} should be an enum but found a ${subgraphUnion.kind}`);
                    for (const memberType of type.types()) {
                        const subgraphType = subgraph.schema.type(memberType.name);
                        if (subgraphType) {
                            subgraphUnion.addType(subgraphType);
                        }
                    }
                }
                break;
        }
    }
    for (const subgraph of subgraphs) {
        if (isFed1) {
            addExternalFields(subgraph, supergraph, isFed1);
        }
        removeNeedlessProvides(subgraph);
        for (const type of subgraph.schema.types()) {
            switch (type.kind) {
                case 'ObjectType':
                case 'InterfaceType':
                case 'InputObjectType':
                    if (!type.hasFields()) {
                        type.removeRecursive();
                    }
                    break;
                case 'UnionType':
                    if (type.membersCount() === 0) {
                        type.remove();
                    }
                    break;
            }
        }
    }
    if (isFed1) {
        for (const subgraph of subgraphs) {
            for (const itf of subgraph.schema.types('InterfaceType')) {
                const implementations = itf.possibleRuntimeTypes();
                for (const field of itf.fields()) {
                    if (!implementations.every(implem => implem.field(field.name))) {
                        field.remove();
                    }
                }
                if (!itf.hasFields()) {
                    itf.remove();
                }
            }
        }
    }
    for (const subgraph of subgraphs) {
        try {
            subgraph.schema.validate();
        }
        catch (e) {
            if (isFed1) {
                const msg = `Error extracting subgraph ${subgraph.name} from the supergraph: this might due to errors in subgraphs that were mistakenly ignored by federation 0.x versions but are rejected by federation 2.\n`
                    + 'Please try composing your subgraphs with federation 2: this should help precisely pinpoint the errors and generate a correct federation 2 supergraph.';
                throw new Error(`${msg}.\n\nDetails:\n${errorToString(e, subgraph.name)}`);
            }
            else {
                const msg = `Unexpected error extracting subgraph ${subgraph.name} from the supergraph: this is either a bug, or the supergraph has been corrupted.`;
                const dumpMsg = maybeDumpSubgraphSchema(subgraph);
                throw new Error(`${msg}.\n\nDetails:\n${errorToString(e, subgraph.name)}\n\n${dumpMsg}`);
            }
        }
    }
    return subgraphs;
}
exports.extractSubgraphsFromSupergraph = extractSubgraphsFromSupergraph;
const DEBUG_SUBGRAPHS_ENV_VARIABLE_NAME = 'APOLLO_FEDERATION_DEBUG_SUBGRAPHS';
function maybeDumpSubgraphSchema(subgraph) {
    const shouldDump = !!(0, utils_2.validateStringContainsBoolean)(process.env[DEBUG_SUBGRAPHS_ENV_VARIABLE_NAME]);
    if (!shouldDump) {
        return `Re-run with environment variable '${DEBUG_SUBGRAPHS_ENV_VARIABLE_NAME}' set to 'true' to extract the invalid subgraph`;
    }
    try {
        const filename = `extracted-subgraph-${subgraph.name}-${Date.now()}.graphql`;
        const file = path_1.default.resolve(filename);
        if (fs_1.default.existsSync(file)) {
            throw new Error(`candidate file ${filename} already existed`);
        }
        fs_1.default.writeFileSync(file, (0, print_1.printSchema)(subgraph.schema));
        return `The (invalid) extracted subgraph has been written in: ${file}.`;
    }
    catch (e2) {
        return `Was not able to print generated subgraph because: ${errorToString(e2, subgraph.name)}`;
    }
}
function errorToString(e, subgraphName) {
    return e instanceof graphql_1.GraphQLError ? (0, federation_1.addSubgraphToError)(e, subgraphName).toString() : String(e);
}
function addSubgraphField(supergraphField, subgraph, encodedType) {
    if (supergraphField instanceof definitions_1.FieldDefinition) {
        return addSubgraphObjectOrInterfaceField(supergraphField, subgraph, encodedType);
    }
    else {
        return addSubgraphInputField(supergraphField, subgraph, encodedType);
    }
}
function addSubgraphObjectOrInterfaceField(supergraphField, subgraph, encodedType) {
    const subgraphType = subgraph.schema.type(supergraphField.parent.name);
    if (subgraphType) {
        const copiedType = encodedType
            ? decodeType(encodedType, subgraph.schema, subgraph.name)
            : copyType(supergraphField.type, subgraph.schema, subgraph.name);
        const field = subgraphType.addField(supergraphField.name, copiedType);
        for (const arg of supergraphField.arguments()) {
            field.addArgument(arg.name, copyType(arg.type, subgraph.schema, subgraph.name), arg.defaultValue);
        }
        return field;
    }
    else {
        return undefined;
    }
}
function addSubgraphInputField(supergraphField, subgraph, encodedType) {
    const subgraphType = subgraph.schema.type(supergraphField.parent.name);
    if (subgraphType) {
        const copiedType = encodedType
            ? decodeType(encodedType, subgraph.schema, subgraph.name)
            : copyType(supergraphField.type, subgraph.schema, subgraph.name);
        return subgraphType.addField(supergraphField.name, copiedType);
    }
    else {
        return undefined;
    }
}
function decodeType(encodedType, subgraph, subgraphName) {
    try {
        return (0, buildSchema_1.builtTypeReference)(encodedType, subgraph);
    }
    catch (e) {
        (0, utils_1.assert)(false, () => `Cannot parse type "${encodedType}" in subgraph ${subgraphName}: ${e}`);
    }
}
function copyType(type, subgraph, subgraphName) {
    switch (type.kind) {
        case 'ListType':
            return new definitions_1.ListType(copyType(type.ofType, subgraph, subgraphName));
        case 'NonNullType':
            return new definitions_1.NonNullType(copyType(type.ofType, subgraph, subgraphName));
        default:
            const subgraphType = subgraph.type(type.name);
            (0, utils_1.assert)(subgraphType, () => `Cannot find type ${type.name} in subgraph ${subgraphName}`);
            return subgraphType;
    }
}
function addExternalFields(subgraph, supergraph, isFed1) {
    for (const type of subgraph.schema.types()) {
        if (!(0, definitions_1.isObjectType)(type) && !(0, definitions_1.isInterfaceType)(type)) {
            continue;
        }
        for (const keyApplication of type.appliedDirectivesOf(federation_1.federationBuiltIns.keyDirective(subgraph.schema))) {
            const forceNonExternal = isFed1 || !!keyApplication.ofExtension();
            addExternalFieldsFromDirectiveFieldSet(subgraph, type, keyApplication, supergraph, forceNonExternal);
        }
        for (const field of type.fields()) {
            for (const requiresApplication of field.appliedDirectivesOf(federation_1.federationBuiltIns.requiresDirective(subgraph.schema))) {
                addExternalFieldsFromDirectiveFieldSet(subgraph, type, requiresApplication, supergraph);
            }
            const fieldBaseType = (0, definitions_1.baseType)(field.type);
            for (const providesApplication of field.appliedDirectivesOf(federation_1.federationBuiltIns.providesDirective(subgraph.schema))) {
                (0, utils_1.assert)((0, definitions_1.isObjectType)(fieldBaseType) || (0, definitions_1.isInterfaceType)(fieldBaseType), () => `Found @provides on field ${field.coordinate} whose type ${field.type} (${fieldBaseType.kind}) is not an object or interface `);
                addExternalFieldsFromDirectiveFieldSet(subgraph, fieldBaseType, providesApplication, supergraph);
            }
        }
        addExternalFieldsFromInterface(type);
    }
}
function addExternalFieldsFromDirectiveFieldSet(subgraph, parentType, directive, supergraph, forceNonExternal = false) {
    const external = federation_1.federationBuiltIns.externalDirective(subgraph.schema);
    const accessor = function (type, fieldName) {
        const field = type.field(fieldName);
        if (field) {
            if (forceNonExternal && field.hasAppliedDirective(external)) {
                field.appliedDirectivesOf(external).forEach(d => d.remove());
            }
            return field;
        }
        (0, utils_1.assert)(!(0, definitions_1.isUnionType)(type), () => `Shouldn't select field ${fieldName} from union type ${type}`);
        const supergraphType = supergraph.type(type.name);
        const supergraphField = supergraphType.field(fieldName);
        (0, utils_1.assert)(supergraphField, () => `No field named ${fieldName} found on type ${type.name} in the supergraph`);
        const created = addSubgraphObjectOrInterfaceField(supergraphField, subgraph);
        if (!forceNonExternal) {
            created.applyDirective(external);
        }
        return created;
    };
    (0, federation_1.parseFieldSetArgument)(parentType, directive, accessor);
}
function addExternalFieldsFromInterface(type) {
    for (const itf of type.interfaces()) {
        for (const field of itf.fields()) {
            const typeField = type.field(field.name);
            if (!typeField) {
                copyFieldAsExternal(field, type);
            }
            else if (typeField.hasAppliedDirective(federation_1.externalDirectiveName)) {
                maybeUpdateFieldForInterface(typeField, field);
            }
        }
    }
}
function copyFieldAsExternal(field, type) {
    const newField = type.addField(field.name, field.type);
    for (const arg of field.arguments()) {
        newField.addArgument(arg.name, arg.type, arg.defaultValue);
    }
    newField.applyDirective(federation_1.externalDirectiveName);
}
function maybeUpdateFieldForInterface(toModify, itfField) {
    if (!(0, types_1.isSubtype)(itfField.type, toModify.type)) {
        (0, utils_1.assert)((0, types_1.isSubtype)(toModify.type, itfField.type), () => `For ${toModify.coordinate}, expected ${itfField.type} and ${toModify.type} to be in a subtyping relationship`);
        toModify.type = itfField.type;
    }
}
function removeNeedlessProvides(subgraph) {
    for (const type of subgraph.schema.types()) {
        if (!(0, definitions_1.isObjectType)(type) && !(0, definitions_1.isInterfaceType)(type)) {
            continue;
        }
        const providesDirective = federation_1.federationBuiltIns.providesDirective(subgraph.schema);
        for (const field of type.fields()) {
            const fieldBaseType = (0, definitions_1.baseType)(field.type);
            for (const providesApplication of field.appliedDirectivesOf(providesDirective)) {
                const selection = (0, federation_1.parseFieldSetArgument)(fieldBaseType, providesApplication);
                if (selectsNonExternalLeafField(selection)) {
                    providesApplication.remove();
                    const updated = withoutNonExternalLeafFields(selection);
                    if (!updated.isEmpty()) {
                        field.applyDirective(providesDirective, { fields: updated.toString(true, false) });
                    }
                }
            }
        }
    }
}
function isExternalOrHasExternalImplementations(field) {
    if (field.hasAppliedDirective(federation_1.externalDirectiveName)) {
        return true;
    }
    const parentType = field.parent;
    if ((0, definitions_1.isInterfaceType)(parentType)) {
        for (const implem of parentType.possibleRuntimeTypes()) {
            const fieldInImplem = implem.field(field.name);
            if (fieldInImplem && fieldInImplem.hasAppliedDirective(federation_1.externalDirectiveName)) {
                return true;
            }
        }
    }
    return false;
}
function selectsNonExternalLeafField(selection) {
    return selection.selections().some(s => {
        if (s.kind === 'FieldSelection') {
            if (isExternalOrHasExternalImplementations(s.field.definition)) {
                return false;
            }
            return !s.selectionSet || selectsNonExternalLeafField(s.selectionSet);
        }
        else {
            return selectsNonExternalLeafField(s.selectionSet);
        }
    });
}
function withoutNonExternalLeafFields(selectionSet) {
    const newSelectionSet = new operations_1.SelectionSet(selectionSet.parentType);
    for (const selection of selectionSet.selections()) {
        if (selection.kind === 'FieldSelection') {
            if (isExternalOrHasExternalImplementations(selection.field.definition)) {
                newSelectionSet.add(selection);
                continue;
            }
        }
        if (selection.selectionSet) {
            const updated = withoutNonExternalLeafFields(selection.selectionSet);
            if (!updated.isEmpty()) {
                newSelectionSet.add((0, operations_1.selectionOfElement)(selection.element(), updated));
            }
        }
    }
    return newSelectionSet;
}
//# sourceMappingURL=extractSubgraphsFromSupergraph.js.map