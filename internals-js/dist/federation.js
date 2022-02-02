"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalTester = exports.addSubgraphToError = exports.addSubgraphToASTNode = exports.Subgraph = exports.Subgraphs = exports.subgraphsFromServiceList = exports.parseFieldSetArgument = exports.buildSubgraph = exports.isEntityType = exports.isFederationDirective = exports.isFederationField = exports.isFederationTypeName = exports.isFederationType = exports.isFederationSubgraphSchema = exports.federationBuiltIns = exports.FederationBuiltIns = exports.FEDERATION_RESERVED_SUBGRAPH_NAME = exports.entitiesFieldName = exports.serviceFieldName = exports.tagDirectiveName = exports.providesDirectiveName = exports.requiresDirectiveName = exports.externalDirectiveName = exports.extendsDirectiveName = exports.keyDirectiveName = exports.fieldSetTypeName = exports.anyTypeName = exports.serviceTypeName = exports.entityTypeName = void 0;
const definitions_1 = require("./definitions");
const utils_1 = require("./utils");
const specifiedRules_1 = require("graphql/validation/specifiedRules");
const graphql_1 = require("graphql");
const print_1 = require("./print");
const KnownTypeNamesInFederationRule_1 = require("./validation/KnownTypeNamesInFederationRule");
const buildSchema_1 = require("./buildSchema");
const operations_1 = require("./operations");
const tagSpec_1 = require("./tagSpec");
const error_1 = require("./error");
exports.entityTypeName = '_Entity';
exports.serviceTypeName = '_Service';
exports.anyTypeName = '_Any';
exports.fieldSetTypeName = '_FieldSet';
exports.keyDirectiveName = 'key';
exports.extendsDirectiveName = 'extends';
exports.externalDirectiveName = 'external';
exports.requiresDirectiveName = 'requires';
exports.providesDirectiveName = 'provides';
exports.tagDirectiveName = 'tag';
exports.serviceFieldName = '_service';
exports.entitiesFieldName = '_entities';
const tagSpec = tagSpec_1.TAG_VERSIONS.latest();
exports.FEDERATION_RESERVED_SUBGRAPH_NAME = '_';
const FEDERATION_TYPES = [
    exports.entityTypeName,
    exports.serviceTypeName,
    exports.anyTypeName,
    exports.fieldSetTypeName
];
const FEDERATION_DIRECTIVES = [
    exports.keyDirectiveName,
    exports.extendsDirectiveName,
    exports.externalDirectiveName,
    exports.requiresDirectiveName,
    exports.providesDirectiveName,
    exports.tagDirectiveName
];
const FEDERATION_ROOT_FIELDS = [
    exports.serviceFieldName,
    exports.entitiesFieldName
];
const FEDERATION_OMITTED_VALIDATION_RULES = [
    graphql_1.PossibleTypeExtensionsRule,
    graphql_1.KnownTypeNamesRule
];
const FEDERATION_SPECIFIC_VALIDATION_RULES = [
    KnownTypeNamesInFederationRule_1.KnownTypeNamesInFederationRule
];
const FEDERATION_VALIDATION_RULES = specifiedRules_1.specifiedSDLRules.filter(rule => !FEDERATION_OMITTED_VALIDATION_RULES.includes(rule)).concat(FEDERATION_SPECIFIC_VALIDATION_RULES);
function validateFieldSetSelections(directiveName, selectionSet, hasExternalInParents, externalTester, externalFieldCoordinatesCollector, allowOnNonExternalLeafFields) {
    for (const selection of selectionSet.selections()) {
        if (selection.kind === 'FieldSelection') {
            const field = selection.element().definition;
            const isExternal = externalTester.isExternal(field);
            if (isExternal) {
                externalFieldCoordinatesCollector.push(field.coordinate);
            }
            if (field.hasArguments()) {
                throw error_1.ERROR_CATEGORIES.FIELDS_HAS_ARGS.get(directiveName).err({
                    message: `field ${field.coordinate} cannot be included because it has arguments (fields with argument are not allowed in @${directiveName})`,
                    nodes: field.sourceAST
                });
            }
            const mustBeExternal = !selection.selectionSet && !allowOnNonExternalLeafFields && !hasExternalInParents;
            if (!isExternal && mustBeExternal) {
                const errorCode = error_1.ERROR_CATEGORIES.DIRECTIVE_FIELDS_MISSING_EXTERNAL.get(directiveName);
                if (externalTester.isFakeExternal(field)) {
                    throw errorCode.err({
                        message: `field "${field.coordinate}" should not be part of a @${directiveName} since it is already "effectively" provided by this subgraph `
                            + `(while it is marked @${exports.externalDirectiveName}, it is a @${exports.keyDirectiveName} field of an extension type, which are not internally considered external for historical/backward compatibility reasons)`,
                        nodes: field.sourceAST
                    });
                }
                else {
                    throw errorCode.err({
                        message: `field "${field.coordinate}" should not be part of a @${directiveName} since it is already provided by this subgraph (it is not marked @${exports.externalDirectiveName})`,
                        nodes: field.sourceAST
                    });
                }
            }
            if (selection.selectionSet) {
                let newHasExternalInParents = hasExternalInParents || isExternal;
                const parentType = field.parent;
                if (!newHasExternalInParents && (0, definitions_1.isInterfaceType)(parentType)) {
                    for (const implem of parentType.possibleRuntimeTypes()) {
                        const fieldInImplem = implem.field(field.name);
                        if (fieldInImplem && externalTester.isExternal(fieldInImplem)) {
                            newHasExternalInParents = true;
                            break;
                        }
                    }
                }
                validateFieldSetSelections(directiveName, selection.selectionSet, newHasExternalInParents, externalTester, externalFieldCoordinatesCollector, allowOnNonExternalLeafFields);
            }
        }
        else {
            validateFieldSetSelections(directiveName, selection.selectionSet, hasExternalInParents, externalTester, externalFieldCoordinatesCollector, allowOnNonExternalLeafFields);
        }
    }
}
function validateFieldSet(type, directive, externalTester, externalFieldCoordinatesCollector, allowOnNonExternalLeafFields, onFields) {
    var _a;
    try {
        const fieldAcessor = onFields
            ? (type, fieldName) => {
                const field = type.field(fieldName);
                if (field) {
                    onFields(field);
                }
                return field;
            }
            : undefined;
        const selectionSet = parseFieldSetArgument(type, directive, fieldAcessor);
        try {
            validateFieldSetSelections(directive.name, selectionSet, false, externalTester, externalFieldCoordinatesCollector, allowOnNonExternalLeafFields);
            return undefined;
        }
        catch (e) {
            if (!(e instanceof graphql_1.GraphQLError)) {
                throw e;
            }
            const nodes = (0, definitions_1.sourceASTs)(directive);
            if (e.nodes) {
                nodes.push(...e.nodes);
            }
            const codeDef = (_a = (0, error_1.errorCodeDef)(e)) !== null && _a !== void 0 ? _a : error_1.ERROR_CATEGORIES.DIRECTIVE_INVALID_FIELDS.get(directive.name);
            return codeDef.err({
                message: `${fieldSetErrorDescriptor(directive)}: ${e.message.trim()}`,
                nodes,
                originalError: e,
            });
        }
    }
    catch (e) {
        if (e instanceof graphql_1.GraphQLError) {
            return e;
        }
        else {
            throw e;
        }
    }
}
function fieldSetErrorDescriptor(directive) {
    return `On ${fieldSetTargetDescription(directive)}, for ${directiveStrUsingASTIfPossible(directive)}`;
}
function directiveStrUsingASTIfPossible(directive) {
    return directive.sourceAST ? (0, graphql_1.print)(directive.sourceAST) : directive.toString();
}
function fieldSetTargetDescription(directive) {
    var _a;
    const targetKind = directive.parent instanceof definitions_1.FieldDefinition ? "field" : "type";
    return `${targetKind} "${(_a = directive.parent) === null || _a === void 0 ? void 0 : _a.coordinate}"`;
}
function validateAllFieldSet(definition, targetTypeExtractor, errorCollector, externalTester, externalFieldCoordinatesCollector, isOnParentType, allowOnNonExternalLeafFields, onFields) {
    for (const application of definition.applications()) {
        const elt = application.parent;
        const type = targetTypeExtractor(elt);
        const parentType = isOnParentType ? type : elt.parent;
        if ((0, definitions_1.isInterfaceType)(parentType)) {
            const code = error_1.ERROR_CATEGORIES.DIRECTIVE_UNSUPPORTED_ON_INTERFACE.get(definition.name);
            errorCollector.push(code.err({
                message: isOnParentType
                    ? `Cannot use ${definition.coordinate} on interface "${parentType.coordinate}": ${definition.coordinate} is not yet supported on interfaces`
                    : `Cannot use ${definition.coordinate} on ${fieldSetTargetDescription(application)} of parent type "${parentType}": ${definition.coordinate} is not yet supported within interfaces`,
                nodes: (0, definitions_1.sourceASTs)(application).concat(isOnParentType ? [] : (0, definitions_1.sourceASTs)(type)),
            }));
        }
        const error = validateFieldSet(type, application, externalTester, externalFieldCoordinatesCollector, allowOnNonExternalLeafFields, onFields);
        if (error) {
            errorCollector.push(error);
        }
    }
}
function validateAllExternalFieldsUsed(schema, externalTester, allExternalFieldsUsedInFederationDirectivesCoordinates, errorCollector) {
    for (const type of schema.types()) {
        if (!(0, definitions_1.isObjectType)(type) && !(0, definitions_1.isInterfaceType)(type)) {
            continue;
        }
        for (const field of type.fields()) {
            if (!externalTester.isExternal(field) || allExternalFieldsUsedInFederationDirectivesCoordinates.includes(field.coordinate)) {
                continue;
            }
            if (!isFieldSatisfyingInterface(field)) {
                errorCollector.push(error_1.ERRORS.EXTERNAL_UNUSED.err({
                    message: `Field "${field.coordinate}" is marked @external but is not used in any federation directive (@key, @provides, @requires) or to satisfy an interface;`
                        + ' the field declaration has no use and should be removed (or the field should not be @external).',
                    nodes: field.sourceAST,
                }));
            }
        }
    }
}
function isFieldSatisfyingInterface(field) {
    return field.parent.interfaces().some(itf => itf.field(field.name));
}
function validateInterfaceRuntimeImplementationFieldsTypes(itf, externalTester, errorCollector) {
    const runtimeTypes = itf.possibleRuntimeTypes();
    for (const field of itf.fields()) {
        const withExternalOrRequires = [];
        const typeToImplems = new utils_1.MultiMap();
        const nodes = [];
        for (const type of runtimeTypes) {
            const implemField = type.field(field.name);
            if (!implemField)
                continue;
            if (implemField.sourceAST) {
                nodes.push(implemField.sourceAST);
            }
            if (externalTester.isExternal(implemField) || implemField.hasAppliedDirective(exports.requiresDirectiveName)) {
                withExternalOrRequires.push(implemField);
            }
            const returnType = implemField.type;
            typeToImplems.add(returnType.toString(), implemField);
        }
        if (withExternalOrRequires.length > 0 && typeToImplems.size > 1) {
            const typeToImplemsArray = [...typeToImplems.entries()];
            errorCollector.push(error_1.ERRORS.INTERFACE_FIELD_IMPLEM_TYPE_MISMATCH.err({
                message: `Some of the runtime implementations of interface field "${field.coordinate}" are marked @external or have a @require (${withExternalOrRequires.map(printFieldCoordinate)}) so all the implementations should use the same type (a current limitation of federation; see https://github.com/apollographql/federation/issues/1257), but ${formatFieldsToReturnType(typeToImplemsArray[0])} while ${(0, utils_1.joinStrings)(typeToImplemsArray.slice(1).map(formatFieldsToReturnType), ' and ')}.`,
                nodes
            }));
        }
    }
}
const printFieldCoordinate = (f) => `"${f.coordinate}"`;
function formatFieldsToReturnType([type, implems]) {
    return `${(0, utils_1.joinStrings)(implems.map(printFieldCoordinate))} ${implems.length == 1 ? 'has' : 'have'} type "${type}"`;
}
class FederationBuiltIns extends definitions_1.BuiltIns {
    addBuiltInTypes(schema) {
        super.addBuiltInTypes(schema);
        this.addBuiltInUnion(schema, exports.entityTypeName);
        this.addBuiltInObject(schema, exports.serviceTypeName).addField('sdl', schema.stringType());
        this.addBuiltInScalar(schema, exports.anyTypeName);
        this.addBuiltInScalar(schema, exports.fieldSetTypeName);
    }
    addBuiltInDirectives(schema) {
        super.addBuiltInDirectives(schema);
        const fieldSetType = new definitions_1.NonNullType(schema.type(exports.fieldSetTypeName));
        const keyDirective = this.addBuiltInDirective(schema, exports.keyDirectiveName)
            .addLocations(graphql_1.DirectiveLocation.OBJECT, graphql_1.DirectiveLocation.INTERFACE);
        keyDirective.repeatable = true;
        keyDirective.addArgument('fields', fieldSetType);
        this.addBuiltInDirective(schema, exports.extendsDirectiveName)
            .addLocations(graphql_1.DirectiveLocation.OBJECT, graphql_1.DirectiveLocation.INTERFACE);
        this.addBuiltInDirective(schema, exports.externalDirectiveName)
            .addLocations(graphql_1.DirectiveLocation.OBJECT, graphql_1.DirectiveLocation.FIELD_DEFINITION);
        for (const name of [exports.requiresDirectiveName, exports.providesDirectiveName]) {
            this.addBuiltInDirective(schema, name)
                .addLocations(graphql_1.DirectiveLocation.FIELD_DEFINITION)
                .addArgument('fields', fieldSetType);
        }
        const directive = this.addBuiltInDirective(schema, 'tag').addLocations(...tagSpec_1.tagLocations);
        directive.addArgument("name", new definitions_1.NonNullType(schema.stringType()));
    }
    prepareValidation(schema) {
        super.prepareValidation(schema);
        let entityType = schema.type(exports.entityTypeName);
        if (!entityType.isBuiltIn) {
            if (entityType.membersCount() === 0) {
                entityType.remove();
            }
            entityType = schema.builtInTypes('UnionType', true).find(u => u.name === exports.entityTypeName);
        }
        entityType.clearTypes();
        for (const objectType of schema.types("ObjectType")) {
            if (isEntityType(objectType)) {
                entityType.addType(objectType);
            }
        }
        const hasEntities = entityType.membersCount() > 0;
        if (!hasEntities) {
            entityType.remove();
        }
        const queryRoot = schema.schemaDefinition.root("query");
        const queryType = queryRoot ? queryRoot.type : schema.addType(new definitions_1.ObjectType("Query"));
        const entityField = queryType.field(exports.entitiesFieldName);
        if (hasEntities) {
            const anyType = schema.type(exports.anyTypeName);
            (0, utils_1.assert)(anyType, `The schema should have the _Any type`);
            const entityFieldType = new definitions_1.NonNullType(new definitions_1.ListType(entityType));
            if (!entityField) {
                this.addBuiltInField(queryType, exports.entitiesFieldName, entityFieldType)
                    .addArgument('representations', new definitions_1.NonNullType(new definitions_1.ListType(new definitions_1.NonNullType(anyType))));
            }
            else if (!entityField.type) {
                entityField.type = entityType;
            }
        }
        else if (entityField) {
            entityField.remove();
        }
        if (!queryType.field(exports.serviceFieldName)) {
            this.addBuiltInField(queryType, exports.serviceFieldName, schema.type(exports.serviceTypeName));
        }
    }
    onValidation(schema) {
        var _a;
        const errors = super.onValidation(schema, [exports.tagDirectiveName]);
        for (const k of definitions_1.allSchemaRootKinds) {
            const type = (_a = schema.schemaDefinition.root(k)) === null || _a === void 0 ? void 0 : _a.type;
            const defaultName = (0, definitions_1.defaultRootName)(k);
            if (type && type.name !== defaultName) {
                const existing = schema.type(defaultName);
                if (existing) {
                    errors.push(error_1.ERROR_CATEGORIES.ROOT_TYPE_USED.get(k).err({
                        message: `The schema has a type named "${defaultName}" but it is not set as the ${k} root type ("${type.name}" is instead): `
                            + 'this is not supported by federation. '
                            + 'If a root type does not use its default name, there should be no other type with that default name.',
                        nodes: (0, definitions_1.sourceASTs)(type, existing),
                    }));
                }
                type.rename(defaultName);
            }
        }
        const externalTester = new ExternalTester(schema);
        const externalFieldsInFedDirectivesCoordinates = [];
        const keyDirective = this.keyDirective(schema);
        validateAllFieldSet(keyDirective, type => type, errors, externalTester, externalFieldsInFedDirectivesCoordinates, true, true, field => {
            if ((0, definitions_1.isListType)(field.type) || (0, definitions_1.isUnionType)(field.type) || (0, definitions_1.isInterfaceType)(field.type)) {
                let kind = field.type.kind;
                kind = kind.slice(0, kind.length - 'Type'.length);
                throw error_1.ERRORS.KEY_FIELDS_SELECT_INVALID_TYPE.err({
                    message: `field "${field.coordinate}" is a ${kind} type which is not allowed in @key`
                });
            }
        });
        validateAllFieldSet(this.requiresDirective(schema), field => field.parent, errors, externalTester, externalFieldsInFedDirectivesCoordinates, false, false);
        validateAllFieldSet(this.providesDirective(schema), field => {
            if (externalTester.isExternal(field)) {
                throw new graphql_1.GraphQLError(`Cannot have both @provides and @external on field "${field.coordinate}"`, field.sourceAST);
            }
            const type = (0, definitions_1.baseType)(field.type);
            if (!(0, definitions_1.isCompositeType)(type)) {
                throw error_1.ERRORS.PROVIDES_ON_NON_OBJECT_FIELD.err({
                    message: `Invalid @provides directive on field "${field.coordinate}": field has type "${field.type}" which is not a Composite Type`,
                    nodes: field.sourceAST,
                });
            }
            return type;
        }, errors, externalTester, externalFieldsInFedDirectivesCoordinates, false, false);
        validateAllExternalFieldsUsed(schema, externalTester, externalFieldsInFedDirectivesCoordinates, errors);
        const tagDirective = this.tagDirective(schema);
        if (!tagDirective.isBuiltIn) {
            const error = tagSpec.checkCompatibleDirective(tagDirective);
            if (error) {
                errors.push(error);
            }
        }
        for (const itf of schema.types('InterfaceType')) {
            validateInterfaceRuntimeImplementationFieldsTypes(itf, externalTester, errors);
        }
        return errors;
    }
    validationRules() {
        return FEDERATION_VALIDATION_RULES;
    }
    keyDirective(schema) {
        return this.getTypedDirective(schema, exports.keyDirectiveName);
    }
    extendsDirective(schema) {
        return this.getTypedDirective(schema, exports.extendsDirectiveName);
    }
    externalDirective(schema) {
        return this.getTypedDirective(schema, exports.externalDirectiveName);
    }
    requiresDirective(schema) {
        return this.getTypedDirective(schema, exports.requiresDirectiveName);
    }
    providesDirective(schema) {
        return this.getTypedDirective(schema, exports.providesDirectiveName);
    }
    tagDirective(schema) {
        return this.getTypedDirective(schema, exports.tagDirectiveName);
    }
    maybeUpdateSubgraphDocument(schema, document) {
        document = super.maybeUpdateSubgraphDocument(schema, document);
        const definitions = document.definitions.concat();
        for (const directiveName of FEDERATION_DIRECTIVES) {
            const directive = schema.directive(directiveName);
            (0, utils_1.assert)(directive, 'This method should only have been called on a schema with federation built-ins');
            if (directive.isBuiltIn) {
                definitions.push((0, graphql_1.parse)((0, print_1.printDirectiveDefinition)(directive, print_1.defaultPrintOptions)).definitions[0]);
            }
        }
        return {
            kind: graphql_1.Kind.DOCUMENT,
            loc: document.loc,
            definitions
        };
    }
}
exports.FederationBuiltIns = FederationBuiltIns;
exports.federationBuiltIns = new FederationBuiltIns();
function isFederationSubgraphSchema(schema) {
    return schema.builtIns instanceof FederationBuiltIns;
}
exports.isFederationSubgraphSchema = isFederationSubgraphSchema;
function isFederationType(type) {
    return isFederationTypeName(type.name);
}
exports.isFederationType = isFederationType;
function isFederationTypeName(typeName) {
    return FEDERATION_TYPES.includes(typeName);
}
exports.isFederationTypeName = isFederationTypeName;
function isFederationField(field) {
    var _a;
    if (field.parent === ((_a = field.schema().schemaDefinition.root("query")) === null || _a === void 0 ? void 0 : _a.type)) {
        return FEDERATION_ROOT_FIELDS.includes(field.name);
    }
    return false;
}
exports.isFederationField = isFederationField;
function isFederationDirective(directive) {
    return FEDERATION_DIRECTIVES.includes(directive.name);
}
exports.isFederationDirective = isFederationDirective;
function isEntityType(type) {
    return type.kind == "ObjectType" && type.hasAppliedDirective(exports.keyDirectiveName);
}
exports.isEntityType = isEntityType;
function buildSubgraph(name, source) {
    try {
        return typeof source === 'string'
            ? (0, buildSchema_1.buildSchema)(new graphql_1.Source(source, name), exports.federationBuiltIns)
            : (0, buildSchema_1.buildSchemaFromAST)(source, exports.federationBuiltIns);
    }
    catch (e) {
        if (e instanceof graphql_1.GraphQLError) {
            throw addSubgraphToError(e, name, error_1.ERRORS.INVALID_GRAPHQL);
        }
        else {
            throw e;
        }
    }
}
exports.buildSubgraph = buildSubgraph;
function parseFieldSetArgument(parentType, directive, fieldAccessor = (type, name) => type.field(name)) {
    var _a;
    try {
        const selectionSet = (0, operations_1.parseSelectionSet)(parentType, validateFieldSetValue(directive), new definitions_1.VariableDefinitions(), undefined, fieldAccessor);
        selectionSet.validate();
        return selectionSet;
    }
    catch (e) {
        if (!(e instanceof graphql_1.GraphQLError)) {
            throw e;
        }
        const nodes = (0, definitions_1.sourceASTs)(directive);
        if (e.nodes) {
            nodes.push(...e.nodes);
        }
        let msg = e.message.trim();
        if (msg.startsWith('Cannot query field')) {
            if (msg.endsWith('.')) {
                msg = msg.slice(0, msg.length - 1);
            }
            if (directive.name === exports.keyDirectiveName) {
                msg = msg + ' (the field should be either be added to this subgraph or, if it should not be resolved by this subgraph, you need to add it to this subgraph with @external).';
            }
            else {
                msg = msg + ' (if the field is defined in another subgraph, you need to add it to this subgraph with @external).';
            }
        }
        const codeDef = (_a = (0, error_1.errorCodeDef)(e)) !== null && _a !== void 0 ? _a : error_1.ERROR_CATEGORIES.DIRECTIVE_INVALID_FIELDS.get(directive.name);
        throw codeDef.err({
            message: `${fieldSetErrorDescriptor(directive)}: ${msg}`,
            nodes,
            originalError: e,
        });
    }
}
exports.parseFieldSetArgument = parseFieldSetArgument;
function validateFieldSetValue(directive) {
    var _a;
    const fields = directive.arguments().fields;
    const nodes = directive.sourceAST;
    if (typeof fields !== 'string') {
        throw error_1.ERROR_CATEGORIES.DIRECTIVE_INVALID_FIELDS_TYPE.get(directive.name).err({
            message: `Invalid value for argument "${directive.definition.argument('fields').name}": must be a string.`,
            nodes,
        });
    }
    if (nodes && nodes.kind === 'Directive') {
        for (const argNode of (_a = nodes.arguments) !== null && _a !== void 0 ? _a : []) {
            if (argNode.name.value === 'fields') {
                if (argNode.value.kind !== 'StringValue') {
                    throw error_1.ERROR_CATEGORIES.DIRECTIVE_INVALID_FIELDS_TYPE.get(directive.name).err({
                        message: `Invalid value for argument "${directive.definition.argument('fields').name}": must be a string.`,
                        nodes,
                    });
                }
                break;
            }
        }
    }
    return fields;
}
function subgraphsFromServiceList(serviceList) {
    var _a;
    let errors = [];
    const subgraphs = new Subgraphs();
    for (const service of serviceList) {
        try {
            subgraphs.add(service.name, (_a = service.url) !== null && _a !== void 0 ? _a : '', service.typeDefs);
        }
        catch (e) {
            const causes = (0, definitions_1.errorCauses)(e);
            if (causes) {
                errors = errors.concat(causes);
            }
            else {
                throw e;
            }
        }
    }
    return errors.length === 0 ? subgraphs : errors;
}
exports.subgraphsFromServiceList = subgraphsFromServiceList;
class Subgraphs {
    constructor() {
        this.subgraphs = new utils_1.OrderedMap();
    }
    add(subgraphOrName, url, schema) {
        const toAdd = typeof subgraphOrName === 'string'
            ? new Subgraph(subgraphOrName, url, schema instanceof definitions_1.Schema ? schema : buildSubgraph(subgraphOrName, schema))
            : subgraphOrName;
        if (toAdd.name === exports.FEDERATION_RESERVED_SUBGRAPH_NAME) {
            throw error_1.ERRORS.INVALID_SUBGRAPH_NAME.err({ message: `Invalid name ${exports.FEDERATION_RESERVED_SUBGRAPH_NAME} for a subgraph: this name is reserved` });
        }
        if (this.subgraphs.has(toAdd.name)) {
            throw new Error(`A subgraph named ${toAdd.name} already exists` + (toAdd.url ? ` (with url '${toAdd.url}')` : ''));
        }
        this.subgraphs.add(toAdd.name, toAdd);
        return toAdd;
    }
    get(name) {
        return this.subgraphs.get(name);
    }
    size() {
        return this.subgraphs.size;
    }
    names() {
        return this.subgraphs.keys();
    }
    values() {
        return this.subgraphs.values();
    }
    *[Symbol.iterator]() {
        for (const subgraph of this.subgraphs) {
            yield subgraph;
        }
    }
    toString() {
        return '[' + this.subgraphs.keys().join(', ') + ']';
    }
}
exports.Subgraphs = Subgraphs;
class Subgraph {
    constructor(name, url, schema, validateSchema = true) {
        this.name = name;
        this.url = url;
        this.schema = schema;
        if (validateSchema) {
            schema.validate();
        }
    }
    toString() {
        return `${this.name} (${this.url})`;
    }
}
exports.Subgraph = Subgraph;
function addSubgraphToASTNode(node, subgraph) {
    return {
        ...node,
        subgraph
    };
}
exports.addSubgraphToASTNode = addSubgraphToASTNode;
function addSubgraphToError(e, subgraphName, errorCode) {
    const updatedCauses = (0, definitions_1.errorCauses)(e).map(cause => {
        var _a;
        const message = `[${subgraphName}] ${cause.message}`;
        const nodes = cause.nodes
            ? cause.nodes.map(node => addSubgraphToASTNode(node, subgraphName))
            : undefined;
        const code = (_a = (0, error_1.errorCodeDef)(cause)) !== null && _a !== void 0 ? _a : errorCode;
        if (code) {
            return code.err({
                message,
                nodes,
                source: cause.source,
                positions: cause.positions,
                path: cause.path,
                originalError: cause.originalError,
                extensions: cause.extensions,
            });
        }
        else {
            return new graphql_1.GraphQLError(message, nodes, cause.source, cause.positions, cause.path, cause.originalError, cause.extensions);
        }
    });
    return (0, definitions_1.ErrGraphQLValidationFailed)(updatedCauses);
}
exports.addSubgraphToError = addSubgraphToError;
class ExternalTester {
    constructor(schema) {
        this.schema = schema;
        this.fakeExternalFields = new Set();
        this.collectFakeExternals();
    }
    collectFakeExternals() {
        const keyDirective = exports.federationBuiltIns.keyDirective(this.schema);
        if (!keyDirective) {
            return;
        }
        for (const key of keyDirective.applications()) {
            const parent = key.parent;
            if (!(key.ofExtension() || parent.hasAppliedDirective(exports.extendsDirectiveName))) {
                continue;
            }
            try {
                parseFieldSetArgument(parent, key, (parentType, fieldName) => {
                    const field = parentType.field(fieldName);
                    if (field && field.hasAppliedDirective(exports.externalDirectiveName)) {
                        this.fakeExternalFields.add(field.coordinate);
                    }
                    return field;
                });
            }
            catch (e) {
            }
        }
    }
    isExternal(field) {
        return field.hasAppliedDirective(exports.externalDirectiveName) && !this.isFakeExternal(field);
    }
    isFakeExternal(field) {
        return this.fakeExternalFields.has(field.coordinate);
    }
    selectsAnyExternalField(selectionSet) {
        for (const selection of selectionSet.selections()) {
            if (selection.kind === 'FieldSelection' && this.isExternal(selection.element().definition)) {
                return true;
            }
            if (selection.selectionSet) {
                if (this.selectsAnyExternalField(selection.selectionSet)) {
                    return true;
                }
            }
        }
        return false;
    }
}
exports.ExternalTester = ExternalTester;
//# sourceMappingURL=federation.js.map