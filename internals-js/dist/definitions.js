"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectType = exports.InterfaceImplementation = exports.ScalarType = exports.SchemaDefinition = exports.RootType = exports.Schema = exports.CoreFeatures = exports.CoreFeature = exports.BuiltIns = exports.NamedSchemaElementWithType = exports.NamedSchemaElement = exports.SchemaElement = exports.Extension = exports.sourceASTs = exports.DirectiveTargetElement = exports.isLeafType = exports.typeFromAST = exports.typeToAST = exports.executableDirectiveLocations = exports.runtimeTypesIntersects = exports.possibleRuntimeTypes = exports.isCompositeType = exports.isAbstractType = exports.isNullableType = exports.baseType = exports.isInputType = exports.isOutputType = exports.isInputObjectType = exports.isUnionType = exports.isEnumType = exports.isInterfaceType = exports.isObjectType = exports.isIDType = exports.isBooleanType = exports.isFloatType = exports.isStringType = exports.isIntType = exports.isCustomScalarType = exports.isScalarType = exports.isNonNullType = exports.isListType = exports.isWrapperType = exports.isNamedType = exports.defaultRootName = exports.allSchemaRootKinds = exports.typenameFieldName = exports.printErrors = exports.printGraphQLErrorsOrRethrow = exports.errorCauses = exports.ErrGraphQLValidationFailed = void 0;
exports.newNamedType = exports.graphQLBuiltIns = exports.variableDefinitionFromAST = exports.variableDefinitionsFromAST = exports.VariableDefinitions = exports.VariableDefinition = exports.variablesInArguments = exports.isVariable = exports.containsVariable = exports.mergeVariables = exports.Variable = exports.Directive = exports.DirectiveDefinition = exports.EnumValue = exports.ArgumentDefinition = exports.InputFieldDefinition = exports.FieldDefinition = exports.NonNullType = exports.ListType = exports.InputObjectType = exports.EnumType = exports.UnionType = exports.UnionMember = exports.InterfaceType = void 0;
const graphql_1 = require("graphql");
const coreSpec_1 = require("./coreSpec");
const utils_1 = require("./utils");
const values_1 = require("./values");
const inaccessibleSpec_1 = require("./inaccessibleSpec");
const print_1 = require("./print");
const types_1 = require("./types");
const introspection_1 = require("./introspection");
const core_schema_1 = require("@apollo/core-schema");
const error_1 = require("@apollo/core-schema/dist/error");
const validate_1 = require("graphql/validation/validate");
const specifiedRules_1 = require("graphql/validation/specifiedRules");
const validate_2 = require("./validate");
const validationErrorCode = 'GraphQLValidationFailed';
const ErrGraphQLValidationFailed = (causes) => (0, core_schema_1.err)(validationErrorCode, {
    message: 'The schema is not a valid GraphQL schema',
    causes
});
exports.ErrGraphQLValidationFailed = ErrGraphQLValidationFailed;
function errorCauses(e) {
    if (e instanceof error_1.GraphQLErrorExt) {
        if (e.code === validationErrorCode) {
            return (e.causes);
        }
        return [e];
    }
    if (e instanceof graphql_1.GraphQLError) {
        return [e];
    }
    return undefined;
}
exports.errorCauses = errorCauses;
function printGraphQLErrorsOrRethrow(e) {
    const causes = errorCauses(e);
    if (!causes) {
        throw e;
    }
    return causes.map(e => (0, graphql_1.printError)(e)).join('\n\n');
}
exports.printGraphQLErrorsOrRethrow = printGraphQLErrorsOrRethrow;
function printErrors(errors) {
    return errors.map(e => (0, graphql_1.printError)(e)).join('\n\n');
}
exports.printErrors = printErrors;
exports.typenameFieldName = '__typename';
exports.allSchemaRootKinds = ['query', 'mutation', 'subscription'];
function defaultRootName(rootKind) {
    return rootKind.charAt(0).toUpperCase() + rootKind.slice(1);
}
exports.defaultRootName = defaultRootName;
function checkDefaultSchemaRoot(type) {
    if (type.kind !== 'ObjectType') {
        return undefined;
    }
    switch (type.name) {
        case 'Query': return 'query';
        case 'Mutation': return 'mutation';
        case 'Subscription': return 'subscription';
        default: return undefined;
    }
}
function isNamedType(type) {
    return type instanceof BaseNamedType;
}
exports.isNamedType = isNamedType;
function isWrapperType(type) {
    return isListType(type) || isNonNullType(type);
}
exports.isWrapperType = isWrapperType;
function isListType(type) {
    return type.kind == 'ListType';
}
exports.isListType = isListType;
function isNonNullType(type) {
    return type.kind == 'NonNullType';
}
exports.isNonNullType = isNonNullType;
function isScalarType(type) {
    return type.kind == 'ScalarType';
}
exports.isScalarType = isScalarType;
function isCustomScalarType(type) {
    return isScalarType(type) && !exports.graphQLBuiltIns.defaultGraphQLBuiltInTypes.includes(type.name);
}
exports.isCustomScalarType = isCustomScalarType;
function isIntType(type) {
    return type === type.schema().intType();
}
exports.isIntType = isIntType;
function isStringType(type) {
    return type === type.schema().stringType();
}
exports.isStringType = isStringType;
function isFloatType(type) {
    return type === type.schema().floatType();
}
exports.isFloatType = isFloatType;
function isBooleanType(type) {
    return type === type.schema().booleanType();
}
exports.isBooleanType = isBooleanType;
function isIDType(type) {
    return type === type.schema().idType();
}
exports.isIDType = isIDType;
function isObjectType(type) {
    return type.kind == 'ObjectType';
}
exports.isObjectType = isObjectType;
function isInterfaceType(type) {
    return type.kind == 'InterfaceType';
}
exports.isInterfaceType = isInterfaceType;
function isEnumType(type) {
    return type.kind == 'EnumType';
}
exports.isEnumType = isEnumType;
function isUnionType(type) {
    return type.kind == 'UnionType';
}
exports.isUnionType = isUnionType;
function isInputObjectType(type) {
    return type.kind == 'InputObjectType';
}
exports.isInputObjectType = isInputObjectType;
function isOutputType(type) {
    switch (baseType(type).kind) {
        case 'ScalarType':
        case 'ObjectType':
        case 'UnionType':
        case 'EnumType':
        case 'InterfaceType':
            return true;
        default:
            return false;
    }
}
exports.isOutputType = isOutputType;
function isInputType(type) {
    switch (baseType(type).kind) {
        case 'ScalarType':
        case 'EnumType':
        case 'InputObjectType':
            return true;
        default:
            return false;
    }
}
exports.isInputType = isInputType;
function baseType(type) {
    return isWrapperType(type) ? type.baseType() : type;
}
exports.baseType = baseType;
function isNullableType(type) {
    return !isNonNullType(type);
}
exports.isNullableType = isNullableType;
function isAbstractType(type) {
    return isInterfaceType(type) || isUnionType(type);
}
exports.isAbstractType = isAbstractType;
function isCompositeType(type) {
    return isObjectType(type) || isInterfaceType(type) || isUnionType(type);
}
exports.isCompositeType = isCompositeType;
function possibleRuntimeTypes(type) {
    switch (type.kind) {
        case 'InterfaceType': return type.possibleRuntimeTypes();
        case 'UnionType': return type.types();
        case 'ObjectType': return [type];
    }
}
exports.possibleRuntimeTypes = possibleRuntimeTypes;
function runtimeTypesIntersects(t1, t2) {
    const rt1 = possibleRuntimeTypes(t1);
    const rt2 = possibleRuntimeTypes(t2);
    for (const obj1 of rt1) {
        if (rt2.some(obj2 => obj1.name === obj2.name)) {
            return true;
        }
    }
    return false;
}
exports.runtimeTypesIntersects = runtimeTypesIntersects;
exports.executableDirectiveLocations = [
    graphql_1.DirectiveLocation.QUERY,
    graphql_1.DirectiveLocation.MUTATION,
    graphql_1.DirectiveLocation.SUBSCRIPTION,
    graphql_1.DirectiveLocation.FIELD,
    graphql_1.DirectiveLocation.FRAGMENT_DEFINITION,
    graphql_1.DirectiveLocation.FRAGMENT_SPREAD,
    graphql_1.DirectiveLocation.INLINE_FRAGMENT,
    graphql_1.DirectiveLocation.VARIABLE_DEFINITION,
];
function typeToAST(type) {
    switch (type.kind) {
        case 'ListType':
            return {
                kind: graphql_1.Kind.LIST_TYPE,
                type: typeToAST(type.ofType)
            };
        case 'NonNullType':
            return {
                kind: graphql_1.Kind.NON_NULL_TYPE,
                type: typeToAST(type.ofType)
            };
        default:
            return {
                kind: graphql_1.Kind.NAMED_TYPE,
                name: { kind: graphql_1.Kind.NAME, value: type.name }
            };
    }
}
exports.typeToAST = typeToAST;
function typeFromAST(schema, node) {
    switch (node.kind) {
        case graphql_1.Kind.LIST_TYPE:
            return new ListType(typeFromAST(schema, node.type));
        case graphql_1.Kind.NON_NULL_TYPE:
            return new NonNullType(typeFromAST(schema, node.type));
        default:
            const type = schema.type(node.name.value);
            if (!type) {
                throw new graphql_1.GraphQLError(`Unknown type "${node.name.value}"`, node);
            }
            return type;
    }
}
exports.typeFromAST = typeFromAST;
function isLeafType(type) {
    return isScalarType(type) || isEnumType(type);
}
exports.isLeafType = isLeafType;
class DirectiveTargetElement {
    constructor(_schema) {
        this._schema = _schema;
        this.appliedDirectives = [];
    }
    schema() {
        return this._schema;
    }
    appliedDirectivesOf(nameOrDefinition) {
        const directiveName = typeof nameOrDefinition === 'string' ? nameOrDefinition : nameOrDefinition.name;
        return this.appliedDirectives.filter(d => d.name == directiveName);
    }
    hasAppliedDirective(nameOrDefinition) {
        const directiveName = typeof nameOrDefinition === 'string' ? nameOrDefinition : nameOrDefinition.name;
        return this.appliedDirectives.some(d => d.name == directiveName);
    }
    applyDirective(defOrDirective, args) {
        let toAdd;
        if (defOrDirective instanceof Directive) {
            if (defOrDirective.schema() != this.schema()) {
                throw new Error(`Cannot add directive ${defOrDirective} to ${this} as it is attached to another schema`);
            }
            toAdd = defOrDirective;
            if (args) {
                toAdd.setArguments(args);
            }
        }
        else {
            toAdd = new Directive(defOrDirective.name, args !== null && args !== void 0 ? args : Object.create(null));
        }
        Element.prototype['setParent'].call(toAdd, this);
        this.appliedDirectives.push(toAdd);
        return toAdd;
    }
    appliedDirectivesToDirectiveNodes() {
        if (this.appliedDirectives.length == 0) {
            return undefined;
        }
        return this.appliedDirectives.map(directive => {
            return {
                kind: graphql_1.Kind.DIRECTIVE,
                name: {
                    kind: graphql_1.Kind.NAME,
                    value: directive.name,
                },
                arguments: directive.argumentsToAST()
            };
        });
    }
    appliedDirectivesToString() {
        return this.appliedDirectives.length == 0
            ? ''
            : ' ' + this.appliedDirectives.join(' ');
    }
    variablesInAppliedDirectives() {
        return this.appliedDirectives.reduce((acc, d) => mergeVariables(acc, variablesInArguments(d.arguments())), []);
    }
}
exports.DirectiveTargetElement = DirectiveTargetElement;
function sourceASTs(...elts) {
    return elts.map(elt => elt === null || elt === void 0 ? void 0 : elt.sourceAST).filter(elt => elt !== undefined);
}
exports.sourceASTs = sourceASTs;
class Element {
    schema() {
        const schema = this.schemaInternal();
        (0, utils_1.assert)(schema, 'requested schema does not exist. Probably because the element is unattached');
        return schema;
    }
    schemaInternal() {
        if (!this._parent) {
            return undefined;
        }
        else if (this._parent instanceof Schema) {
            return this._parent;
        }
        else if (this._parent instanceof SchemaElement) {
            return this._parent.schemaInternal();
        }
        else if (this._parent instanceof DirectiveTargetElement) {
            return this._parent.schema();
        }
        (0, utils_1.assert)(false, 'unreachable code. parent is of unknown type');
    }
    get parent() {
        (0, utils_1.assert)(this._parent, 'trying to access non-existent parent');
        return this._parent;
    }
    isAttached() {
        return !!this._parent;
    }
    setParent(parent) {
        (0, utils_1.assert)(!this._parent, "Cannot set parent of an already attached element");
        this._parent = parent;
        this.onAttached();
    }
    onAttached() {
    }
    checkUpdate() {
        if (!this.isAttached()) {
            throw error(`Cannot modify detached element ${this}`);
        }
    }
}
class Extension {
    get extendedElement() {
        return this._extendedElement;
    }
    setExtendedElement(element) {
        (0, utils_1.assert)(!this._extendedElement, "Cannot attached already attached extension");
        this._extendedElement = element;
    }
}
exports.Extension = Extension;
class SchemaElement extends Element {
    constructor() {
        super(...arguments);
        this._appliedDirectives = [];
    }
    get appliedDirectives() {
        return this._appliedDirectives;
    }
    appliedDirectivesOf(nameOrDefinition) {
        const directiveName = typeof nameOrDefinition === 'string' ? nameOrDefinition : nameOrDefinition.name;
        return this._appliedDirectives.filter(d => d.name == directiveName);
    }
    hasAppliedDirective(nameOrDefinition) {
        return (typeof nameOrDefinition === 'string'
            ? this.appliedDirectivesOf(nameOrDefinition)
            : this.appliedDirectivesOf(nameOrDefinition)).length !== 0;
    }
    applyDirective(nameOrDefOrDirective, args) {
        let toAdd;
        if (nameOrDefOrDirective instanceof Directive) {
            this.checkUpdate(nameOrDefOrDirective);
            toAdd = nameOrDefOrDirective;
            if (args) {
                toAdd.setArguments(args);
            }
        }
        else {
            let name;
            if (typeof nameOrDefOrDirective === 'string') {
                this.checkUpdate();
                const def = this.schema().directive(nameOrDefOrDirective);
                if (!def) {
                    throw new graphql_1.GraphQLError(`Cannot apply unknown directive "@${nameOrDefOrDirective}"`);
                }
                name = nameOrDefOrDirective;
            }
            else {
                this.checkUpdate(nameOrDefOrDirective);
                name = nameOrDefOrDirective.name;
            }
            toAdd = new Directive(name, args !== null && args !== void 0 ? args : Object.create(null));
            Element.prototype['setParent'].call(toAdd, this);
        }
        this._appliedDirectives.push(toAdd);
        DirectiveDefinition.prototype['addReferencer'].call(toAdd.definition, toAdd);
        this.onModification();
        return toAdd;
    }
    removeAppliedDirectives() {
        const applied = this._appliedDirectives.concat();
        applied.forEach(d => d.remove());
    }
    onModification() {
        const schema = this.schemaInternal();
        if (schema) {
            Schema.prototype['onModification'].call(schema);
        }
    }
    isElementBuiltIn() {
        return false;
    }
    removeTypeReferenceInternal(type) {
        this.removeTypeReference(type);
    }
    checkRemoval() {
        if (this.isElementBuiltIn() && !Schema.prototype['canModifyBuiltIn'].call(this.schema())) {
            throw error(`Cannot modify built-in ${this}`);
        }
    }
    checkUpdate(addedElement) {
        super.checkUpdate();
        if (!Schema.prototype['canModifyBuiltIn'].call(this.schema())) {
            let thisElement = this;
            while (thisElement && thisElement instanceof SchemaElement) {
                if (thisElement.isElementBuiltIn()) {
                    throw error(`Cannot modify built-in (or part of built-in) ${this}`);
                }
                thisElement = thisElement.parent;
            }
        }
        if (addedElement && addedElement.isAttached()) {
            const thatSchema = addedElement.schema();
            if (thatSchema && thatSchema != this.schema()) {
                throw error(`Cannot add element ${addedElement} to ${this} as it is attached to another schema`);
            }
        }
    }
}
exports.SchemaElement = SchemaElement;
class NamedSchemaElement extends SchemaElement {
    constructor(name) {
        super();
        this._name = name;
    }
    get name() {
        return this._name;
    }
}
exports.NamedSchemaElement = NamedSchemaElement;
class BaseNamedType extends NamedSchemaElement {
    constructor(name, isBuiltIn = false) {
        super(name);
        this.isBuiltIn = isBuiltIn;
        this._referencers = new Set();
        this._extensions = new Set();
    }
    addReferencer(referencer) {
        this._referencers.add(referencer);
    }
    removeReferencer(referencer) {
        this._referencers.delete(referencer);
    }
    get coordinate() {
        return this.name;
    }
    *allChildElements() {
    }
    extensions() {
        return this._extensions;
    }
    newExtension() {
        return this.addExtension(new Extension());
    }
    addExtension(extension) {
        this.checkUpdate();
        if (this._extensions.has(extension)) {
            return extension;
        }
        if (extension.extendedElement) {
            throw error(`Cannot add extension to type ${this}: it is already added to another type`);
        }
        this._extensions.add(extension);
        Extension.prototype['setExtendedElement'].call(extension, this);
        this.onModification();
        return extension;
    }
    isIntrospectionType() {
        return (0, introspection_1.isIntrospectionName)(this.name);
    }
    hasExtensionElements() {
        return this._extensions.size > 0;
    }
    hasNonExtensionElements() {
        return this._appliedDirectives.some(d => d.ofExtension() === undefined) || this.hasNonExtensionInnerElements();
    }
    isElementBuiltIn() {
        return this.isBuiltIn;
    }
    rename(newName) {
        this.checkUpdate();
        const oldName = this._name;
        this._name = newName;
        Schema.prototype['renameTypeInternal'].call(this._parent, oldName, newName);
        this.onModification();
    }
    remove() {
        if (!this._parent) {
            return [];
        }
        this.checkRemoval();
        this.onModification();
        this.removeInnerElements();
        Schema.prototype['removeTypeInternal'].call(this._parent, this);
        this.removeAppliedDirectives();
        this.sourceAST = undefined;
        const toReturn = (0, utils_1.setValues)(this._referencers).map(r => {
            SchemaElement.prototype['removeTypeReferenceInternal'].call(r, this);
            return r;
        });
        this._referencers.clear();
        this._parent = undefined;
        return toReturn;
    }
    removeRecursive() {
        this.remove().forEach(ref => this.removeReferenceRecursive(ref));
    }
    referencers() {
        return (0, utils_1.setValues)(this._referencers);
    }
    isReferenced() {
        return this._referencers.size > 0;
    }
    toString() {
        return this.name;
    }
}
class NamedSchemaElementWithType extends NamedSchemaElement {
    get type() {
        return this._type;
    }
    set type(type) {
        if (type) {
            this.checkUpdate(type);
        }
        else {
            this.checkRemoval();
        }
        if (this._type) {
            removeReferenceToType(this, this._type);
        }
        this._type = type;
        if (type) {
            addReferenceToType(this, type);
        }
    }
    removeTypeReference(type) {
        (0, utils_1.assert)(this._type && baseType(this._type) === type, () => `Cannot remove reference to type ${type} on ${this} as its type is ${this._type}`);
        this._type = undefined;
    }
}
exports.NamedSchemaElementWithType = NamedSchemaElementWithType;
function error(message) {
    return new graphql_1.GraphQLError(message);
}
class BaseExtensionMember extends Element {
    ofExtension() {
        return this._extension;
    }
    setOfExtension(extension) {
        var _a;
        this.checkUpdate();
        if (extension && !((_a = this._parent) === null || _a === void 0 ? void 0 : _a.extensions().has(extension))) {
            throw error(`Cannot set object as part of the provided extension: it is not an extension of parent ${this.parent}`);
        }
        this._extension = extension;
    }
    remove() {
        this.removeInner();
        Schema.prototype['onModification'].call(this.schema());
        this._extension = undefined;
        this._parent = undefined;
    }
}
function sortedMemberNames(u) {
    return u.members().map(m => m.type.name).sort((n1, n2) => n1.localeCompare(n2));
}
class BuiltIns {
    constructor() {
        this.defaultGraphQLBuiltInTypes = ['Int', 'Float', 'String', 'Boolean', 'ID'];
        this.defaultGraphQLBuiltInDirectives = ['include', 'skip', 'deprecated', 'specifiedBy'];
    }
    addBuiltInTypes(schema) {
        this.defaultGraphQLBuiltInTypes.forEach(t => this.addBuiltInScalar(schema, t));
    }
    addBuiltInDirectives(schema) {
        for (const name of ['include', 'skip']) {
            this.addBuiltInDirective(schema, name)
                .addLocations(graphql_1.DirectiveLocation.FIELD, graphql_1.DirectiveLocation.FRAGMENT_SPREAD, graphql_1.DirectiveLocation.INLINE_FRAGMENT)
                .addArgument('if', new NonNullType(schema.booleanType()));
        }
        this.addBuiltInDirective(schema, 'deprecated')
            .addLocations(graphql_1.DirectiveLocation.FIELD_DEFINITION, graphql_1.DirectiveLocation.ENUM_VALUE, graphql_1.DirectiveLocation.ARGUMENT_DEFINITION, graphql_1.DirectiveLocation.INPUT_FIELD_DEFINITION).addArgument('reason', schema.stringType(), 'No longer supported');
        this.addBuiltInDirective(schema, 'specifiedBy')
            .addLocations(graphql_1.DirectiveLocation.SCALAR)
            .addArgument('url', new NonNullType(schema.stringType()));
    }
    isGraphQLBuiltIn(element) {
        if ((0, introspection_1.isIntrospectionName)(element.name)) {
            return true;
        }
        if (element instanceof FieldDefinition) {
            return false;
        }
        else if (element instanceof DirectiveDefinition) {
            return this.defaultGraphQLBuiltInDirectives.includes(element.name);
        }
        else {
            return this.defaultGraphQLBuiltInTypes.includes(element.name);
        }
    }
    prepareValidation(_) {
    }
    onValidation(schema, unvalidatedDirectives) {
        const errors = [];
        for (const type of schema.builtInTypes(undefined, true)) {
            const maybeRedefined = schema.type(type.name);
            if (!maybeRedefined.isBuiltIn) {
                this.ensureSameTypeStructure(type, maybeRedefined, errors);
            }
        }
        for (const directive of schema.builtInDirectives(true)) {
            if (unvalidatedDirectives && unvalidatedDirectives.includes(directive.name)) {
                continue;
            }
            const maybeRedefined = schema.directive(directive.name);
            if (!maybeRedefined.isBuiltIn) {
                this.ensureSameDirectiveStructure(directive, maybeRedefined, errors);
            }
        }
        return errors;
    }
    validationRules() {
        return specifiedRules_1.specifiedSDLRules;
    }
    maybeUpdateSubgraphDocument(_, document) {
        return document;
    }
    ensureSameDirectiveStructure(builtIn, manuallyDefined, errors) {
        this.ensureSameArguments(builtIn, manuallyDefined, `directive ${builtIn}`, errors);
        if (!builtIn.repeatable && manuallyDefined.repeatable) {
            errors.push(error(`Invalid redefinition of built-in directive ${builtIn}: ${builtIn} should${builtIn.repeatable ? "" : " not"} be repeatable`));
        }
        if (!manuallyDefined.locations.every(loc => builtIn.locations.includes(loc))) {
            errors.push(error(`Invalid redefinition of built-in directive ${builtIn}: ${builtIn} should have locations ${builtIn.locations.join(', ')}, but found (non-subset) ${manuallyDefined.locations.join(', ')}`));
        }
    }
    ensureSameArguments(builtIn, manuallyDefined, what, errors) {
        const expectedArguments = builtIn.arguments();
        const foundArguments = manuallyDefined.arguments();
        if (expectedArguments.length !== foundArguments.length) {
            errors.push(error(`Invalid redefinition of built-in ${what}: should have ${expectedArguments.length} arguments but ${foundArguments.length} found in redefinition`));
            return;
        }
        for (const expectedArgument of expectedArguments) {
            const foundArgument = manuallyDefined.argument(expectedArgument.name);
            const expectedType = expectedArgument.type;
            let actualType = foundArgument.type;
            if (isNonNullType(actualType) && !isNonNullType(expectedType)) {
                actualType = actualType.ofType;
            }
            if (!(0, types_1.sameType)(expectedType, actualType)) {
                errors.push(error(`Invalid redefinition of built-in ${what}: ${expectedArgument.coordinate} should have type ${expectedArgument.type} but found type ${foundArgument.type}`));
            }
            else if (!isNonNullType(actualType) && !(0, values_1.valueEquals)(expectedArgument.defaultValue, foundArgument.defaultValue)) {
                errors.push(error(`Invalid redefinition of built-in ${what}: ${expectedArgument.coordinate} should have default value ${(0, values_1.valueToString)(expectedArgument.defaultValue)} but found default value ${(0, values_1.valueToString)(foundArgument.defaultValue)}`));
            }
        }
    }
    ensureSameTypeStructure(builtIn, manuallyDefined, errors) {
        if (builtIn.kind !== manuallyDefined.kind) {
            errors.push(error(`Invalid redefinition of built-in type ${builtIn}: ${builtIn} should be a ${builtIn.kind} type but redefined as a ${manuallyDefined.kind}`));
            return;
        }
        switch (builtIn.kind) {
            case 'ScalarType':
                return;
            case 'ObjectType':
                const redefinedObject = manuallyDefined;
                for (const builtInField of builtIn.fields()) {
                    const redefinedField = redefinedObject.field(builtInField.name);
                    if (!redefinedField) {
                        errors.push(error(`Invalid redefinition of built-in type ${builtIn}: redefinition is missing field ${builtInField}`));
                        return;
                    }
                    let rType = redefinedField.type;
                    if (!isNonNullType(builtInField.type) && isNonNullType(rType)) {
                        rType = rType.ofType;
                    }
                    if (!(0, types_1.sameType)(builtInField.type, rType)) {
                        errors.push(error(`Invalid redefinition of field ${builtInField} of built-in type ${builtIn}: should have type ${builtInField.type} but redefined with type ${redefinedField.type}`));
                        return;
                    }
                    this.ensureSameArguments(builtInField, redefinedField, `field ${builtInField.coordinate}`, errors);
                }
                break;
            case 'UnionType':
                const redefinedUnion = manuallyDefined;
                const builtInMembers = sortedMemberNames(builtIn);
                const redefinedMembers = sortedMemberNames(redefinedUnion);
                if (!(0, utils_1.arrayEquals)(builtInMembers, redefinedMembers)) {
                    errors.push(error(`Invalid redefinition of built-in type ${builtIn}: redefinition has members [${redefinedMembers}] but should have members [${builtInMembers}]`));
                }
                break;
            default:
                errors.push(error(`Invalid redefinition of built-in type ${builtIn}: cannot redefine ${builtIn.kind} built-in types`));
        }
    }
    addBuiltInScalar(schema, name) {
        return schema.addType(new ScalarType(name, true));
    }
    addBuiltInObject(schema, name) {
        return schema.addType(new ObjectType(name, true));
    }
    addBuiltInUnion(schema, name) {
        return schema.addType(new UnionType(name, true));
    }
    addBuiltInDirective(schema, name) {
        return schema.addDirectiveDefinition(new DirectiveDefinition(name, true));
    }
    addBuiltInField(parentType, name, type) {
        return parentType.addField(new FieldDefinition(name, true), type);
    }
    getTypedDirective(schema, name) {
        const directive = schema.directive(name);
        if (!directive) {
            throw new Error(`The provided schema has not be built with the ${name} directive built-in`);
        }
        return directive;
    }
    includeDirective(schema) {
        return this.getTypedDirective(schema, 'include');
    }
    skipDirective(schema) {
        return this.getTypedDirective(schema, 'skip');
    }
    deprecatedDirective(schema) {
        return this.getTypedDirective(schema, 'deprecated');
    }
    specifiedByDirective(schema) {
        return this.getTypedDirective(schema, 'specifiedBy');
    }
}
exports.BuiltIns = BuiltIns;
class CoreFeature {
    constructor(url, nameInSchema, directive, purpose) {
        this.url = url;
        this.nameInSchema = nameInSchema;
        this.directive = directive;
        this.purpose = purpose;
    }
    isFeatureDefinition(element) {
        return element.name.startsWith(this.nameInSchema + '__')
            || (element.kind === 'DirectiveDefinition' && element.name === this.nameInSchema);
    }
}
exports.CoreFeature = CoreFeature;
class CoreFeatures {
    constructor(coreItself) {
        this.coreItself = coreItself;
        this.byAlias = new Map();
        this.byIdentity = new Map();
        this.add(coreItself);
        const coreDef = coreSpec_1.CORE_VERSIONS.find(coreItself.url.version);
        if (!coreDef) {
            throw error(`Schema uses unknown version ${coreItself.url.version} of the core spec (known versions: ${coreSpec_1.CORE_VERSIONS.versions().join(', ')})`);
        }
        this.coreDefinition = coreDef;
    }
    getByIdentity(identity) {
        return this.byIdentity.get(identity);
    }
    allFeatures() {
        return this.byIdentity.values();
    }
    removeFeature(featureIdentity) {
        const feature = this.byIdentity.get(featureIdentity);
        if (feature) {
            this.byIdentity.delete(featureIdentity);
            this.byAlias.delete(feature.nameInSchema);
        }
    }
    maybeAddFeature(directive) {
        var _a, _b;
        if (((_a = directive.definition) === null || _a === void 0 ? void 0 : _a.name) !== this.coreItself.nameInSchema) {
            return undefined;
        }
        const args = directive.arguments();
        const url = coreSpec_1.FeatureUrl.parse(args.feature);
        const existing = this.byIdentity.get(url.identity);
        if (existing) {
            throw error(`Duplicate inclusion of feature ${url.identity}`);
        }
        const feature = new CoreFeature(url, (_b = args.as) !== null && _b !== void 0 ? _b : url.name, directive, args.for);
        this.add(feature);
        return feature;
    }
    add(feature) {
        this.byAlias.set(feature.nameInSchema, feature);
        this.byIdentity.set(feature.url.identity, feature);
    }
}
exports.CoreFeatures = CoreFeatures;
const toASTPrintOptions = { ...print_1.defaultPrintOptions, showNonGraphQLBuiltIns: true };
class Schema {
    constructor(builtIns = exports.graphQLBuiltIns) {
        this.builtIns = builtIns;
        this._builtInTypes = new utils_1.MapWithCachedArrays();
        this._types = new utils_1.MapWithCachedArrays();
        this._builtInDirectives = new utils_1.MapWithCachedArrays();
        this._directives = new utils_1.MapWithCachedArrays();
        this.isConstructed = false;
        this.isValidated = false;
        this._schemaDefinition = new SchemaDefinition();
        Element.prototype['setParent'].call(this._schemaDefinition, this);
        builtIns.addBuiltInTypes(this);
        builtIns.addBuiltInDirectives(this);
        this.isConstructed = true;
    }
    canModifyBuiltIn() {
        return !this.isConstructed;
    }
    runWithBuiltInModificationAllowed(fct) {
        const wasConstructed = this.isConstructed;
        this.isConstructed = false;
        fct();
        this.isConstructed = wasConstructed;
    }
    renameTypeInternal(oldName, newName) {
        this._types.set(newName, this._types.get(oldName));
        this._types.delete(oldName);
    }
    removeTypeInternal(type) {
        this._types.delete(type.name);
    }
    removeDirectiveInternal(definition) {
        this._directives.delete(definition.name);
    }
    markAsCoreSchema(coreItself) {
        this._coreFeatures = new CoreFeatures(coreItself);
    }
    unmarkAsCoreSchema() {
        this._coreFeatures = undefined;
    }
    onModification() {
        if (this.isConstructed) {
            this.invalidate();
            this.cachedDocument = undefined;
            this.apiSchema = undefined;
        }
    }
    forceSetCachedDocument(document, addNonGraphQLBuiltIns = true) {
        this.cachedDocument = addNonGraphQLBuiltIns
            ? this.builtIns.maybeUpdateSubgraphDocument(this, document)
            : document;
    }
    isCoreSchema() {
        return this.coreFeatures !== undefined;
    }
    get coreFeatures() {
        return this._coreFeatures;
    }
    toAST() {
        if (!this.cachedDocument) {
            this.forceSetCachedDocument((0, graphql_1.parse)((0, print_1.printSchema)(this, toASTPrintOptions), { noLocation: true }), false);
        }
        return this.cachedDocument;
    }
    toAPISchema() {
        if (!this.apiSchema) {
            this.validate();
            const apiSchema = this.clone();
            (0, inaccessibleSpec_1.removeInaccessibleElements)(apiSchema);
            const coreFeatures = apiSchema.coreFeatures;
            if (coreFeatures) {
                for (const coreFeature of coreFeatures.allFeatures()) {
                    (0, coreSpec_1.removeFeatureElements)(apiSchema, coreFeature);
                }
            }
            (0, utils_1.assert)(!apiSchema.isCoreSchema(), "The API schema shouldn't be a core schema");
            apiSchema.validate();
            this.apiSchema = apiSchema;
        }
        return this.apiSchema;
    }
    toGraphQLJSSchema(isSubgraph = false) {
        if (!isSubgraph) {
            return (0, graphql_1.buildASTSchema)(this.toAST());
        }
        const ast = (0, graphql_1.parse)((0, print_1.printSchema)(this, { ...toASTPrintOptions, mergeTypesAndExtensions: true }), { noLocation: true });
        return (0, graphql_1.buildASTSchema)(ast);
    }
    get schemaDefinition() {
        return this._schemaDefinition;
    }
    types(kind, includeNonGraphQLBuiltIns = false) {
        const allKinds = this._types.values();
        const forKind = (kind ? allKinds.filter(t => t.kind === kind) : allKinds);
        return includeNonGraphQLBuiltIns
            ? this.builtInTypes(kind).filter(t => !exports.graphQLBuiltIns.isGraphQLBuiltIn(t)).concat(forKind)
            : forKind;
    }
    builtInTypes(kind, includeShadowed = false) {
        const allBuiltIns = this._builtInTypes.values();
        const forKind = (kind ? allBuiltIns.filter(t => t.kind === kind) : allBuiltIns);
        return includeShadowed
            ? forKind
            : forKind.filter(t => !this.isShadowedBuiltInType(t));
    }
    isShadowedBuiltInType(type) {
        return type.isBuiltIn && this._types.has(type.name);
    }
    allTypes(kind) {
        return this.builtInTypes(kind).concat(this.types(kind));
    }
    type(name) {
        const type = this._types.get(name);
        return type ? type : this._builtInTypes.get(name);
    }
    typeOfKind(name, kind) {
        const type = this.type(name);
        return type && type.kind === kind ? type : undefined;
    }
    intType() {
        return this._builtInTypes.get('Int');
    }
    floatType() {
        return this._builtInTypes.get('Float');
    }
    stringType() {
        return this._builtInTypes.get('String');
    }
    booleanType() {
        return this._builtInTypes.get('Boolean');
    }
    idType() {
        return this._builtInTypes.get('ID');
    }
    addType(type) {
        const existing = this.type(type.name);
        if (existing && !existing.isBuiltIn) {
            throw error(`Type ${type} already exists in this schema`);
        }
        if (type.isAttached()) {
            if (type.parent == this) {
                return type;
            }
            throw error(`Cannot add type ${type} to this schema; it is already attached to another schema`);
        }
        if (type.isBuiltIn) {
            if (!this.isConstructed) {
                this._builtInTypes.set(type.name, type);
            }
            else {
                throw error(`Cannot add built-in ${type} to this schema (built-ins can only be added at schema construction time)`);
            }
        }
        else {
            this._types.set(type.name, type);
        }
        Element.prototype['setParent'].call(type, this);
        const defaultSchemaRoot = checkDefaultSchemaRoot(type);
        if (defaultSchemaRoot && !this.schemaDefinition.root(defaultSchemaRoot)) {
            this.schemaDefinition.setRoot(defaultSchemaRoot, type);
        }
        this.onModification();
        return type;
    }
    directives(includeNonGraphQLBuiltIns = false) {
        return includeNonGraphQLBuiltIns
            ? this.builtInDirectives().filter(d => !exports.graphQLBuiltIns.isGraphQLBuiltIn(d)).concat(this._directives.values())
            : this._directives.values();
    }
    builtInDirectives(includeShadowed = false) {
        return includeShadowed
            ? this._builtInDirectives.values()
            : this._builtInDirectives.values().filter(d => !this.isShadowedBuiltInDirective(d));
    }
    allDirectives() {
        return this.builtInDirectives().concat(this.directives());
    }
    isShadowedBuiltInDirective(directive) {
        return directive.isBuiltIn && this._directives.has(directive.name);
    }
    directive(name) {
        const directive = this._directives.get(name);
        return directive ? directive : this._builtInDirectives.get(name);
    }
    *allNamedSchemaElement() {
        for (const type of this.types()) {
            yield type;
            yield* type.allChildElements();
        }
        for (const directive of this.directives()) {
            yield directive;
            yield* directive.arguments();
        }
    }
    *allSchemaElement() {
        yield this._schemaDefinition;
        yield* this.allNamedSchemaElement();
    }
    addDirectiveDefinition(directiveOrName) {
        const definition = typeof directiveOrName === 'string' ? new DirectiveDefinition(directiveOrName) : directiveOrName;
        const existing = this.directive(definition.name);
        if (existing && !existing.isBuiltIn) {
            throw error(`Directive ${definition} already exists in this schema`);
        }
        if (definition.isAttached()) {
            if (definition.parent == this) {
                return definition;
            }
            throw error(`Cannot add directive ${definition} to this schema; it is already attached to another schema`);
        }
        if (definition.isBuiltIn) {
            if (!this.isConstructed) {
                this._builtInDirectives.set(definition.name, definition);
            }
            else {
                throw error(`Cannot add built-in ${definition} to this schema (built-ins can only be added at schema construction time)`);
            }
        }
        else {
            this._directives.set(definition.name, definition);
        }
        Element.prototype['setParent'].call(definition, this);
        this.onModification();
        return definition;
    }
    invalidate() {
        this.isValidated = false;
    }
    validate() {
        if (this.isValidated) {
            return;
        }
        this.runWithBuiltInModificationAllowed(() => {
            this.builtIns.prepareValidation(this);
            (0, introspection_1.addIntrospectionFields)(this);
        });
        let errors = (0, validate_1.validateSDL)(this.toAST(), undefined, this.builtIns.validationRules());
        errors = errors.concat((0, validate_2.validateSchema)(this));
        if (errors.length === 0) {
            this.runWithBuiltInModificationAllowed(() => {
                errors = this.builtIns.onValidation(this);
            });
        }
        if (errors.length > 0) {
            throw (0, exports.ErrGraphQLValidationFailed)(errors);
        }
        this.isValidated = true;
    }
    clone(builtIns) {
        const cloned = new Schema(builtIns !== null && builtIns !== void 0 ? builtIns : this.builtIns);
        copy(this, cloned);
        if (this.isValidated) {
            cloned.validate();
        }
        return cloned;
    }
}
exports.Schema = Schema;
class RootType extends BaseExtensionMember {
    constructor(rootKind, type) {
        super();
        this.rootKind = rootKind;
        this.type = type;
    }
    isDefaultRootName() {
        return defaultRootName(this.rootKind) == this.type.name;
    }
    removeInner() {
        SchemaDefinition.prototype['removeRootType'].call(this._parent, this);
    }
}
exports.RootType = RootType;
class SchemaDefinition extends SchemaElement {
    constructor() {
        super(...arguments);
        this.kind = 'SchemaDefinition';
        this._roots = new utils_1.MapWithCachedArrays();
        this._extensions = new Set();
    }
    roots() {
        return this._roots.values();
    }
    applyDirective(nameOrDefOrDirective, args) {
        var _a;
        const applied = super.applyDirective(nameOrDefOrDirective, args);
        const schema = this.schema();
        const coreFeatures = schema.coreFeatures;
        if ((0, coreSpec_1.isCoreSpecDirectiveApplication)(applied)) {
            if (coreFeatures) {
                throw error(`Invalid duplicate application of the @core feature`);
            }
            const schemaDirective = applied;
            const args = schemaDirective.arguments();
            const url = coreSpec_1.FeatureUrl.parse(args.feature);
            const core = new CoreFeature(url, (_a = args.as) !== null && _a !== void 0 ? _a : 'core', schemaDirective, args.for);
            Schema.prototype['markAsCoreSchema'].call(schema, core);
        }
        else if (coreFeatures) {
            CoreFeatures.prototype['maybeAddFeature'].call(coreFeatures, applied);
        }
        this.onModification();
        return applied;
    }
    root(rootKind) {
        return this._roots.get(rootKind);
    }
    rootType(rootKind) {
        var _a;
        return (_a = this.root(rootKind)) === null || _a === void 0 ? void 0 : _a.type;
    }
    setRoot(rootKind, nameOrType) {
        let toSet;
        if (typeof nameOrType === 'string') {
            this.checkUpdate();
            const obj = this.schema().type(nameOrType);
            if (!obj) {
                throw new graphql_1.GraphQLError(`Cannot set schema ${rootKind} root to unknown type ${nameOrType}`);
            }
            else if (obj.kind != 'ObjectType') {
                throw new graphql_1.GraphQLError(`${defaultRootName(rootKind)} root type must be an Object type${rootKind === 'query' ? '' : ' if provided'}, it cannot be set to ${nameOrType} (an ${obj.kind}).`);
            }
            toSet = new RootType(rootKind, obj);
        }
        else {
            this.checkUpdate(nameOrType);
            toSet = new RootType(rootKind, nameOrType);
        }
        const prevRoot = this._roots.get(rootKind);
        if (prevRoot) {
            removeReferenceToType(this, prevRoot.type);
        }
        this._roots.set(rootKind, toSet);
        Element.prototype['setParent'].call(toSet, this);
        addReferenceToType(this, toSet.type);
        this.onModification();
        return toSet;
    }
    extensions() {
        return this._extensions;
    }
    newExtension() {
        return this.addExtension(new Extension());
    }
    addExtension(extension) {
        this.checkUpdate();
        if (this._extensions.has(extension)) {
            return extension;
        }
        if (extension.extendedElement) {
            throw error(`Cannot add extension to this schema: extension is already added to another schema`);
        }
        this._extensions.add(extension);
        Extension.prototype['setExtendedElement'].call(extension, this);
        this.onModification();
        return extension;
    }
    removeRootType(rootType) {
        this._roots.delete(rootType.rootKind);
        removeReferenceToType(this, rootType.type);
    }
    removeTypeReference(toRemove) {
        for (const rootType of this.roots()) {
            if (rootType.type == toRemove) {
                this._roots.delete(rootType.rootKind);
            }
        }
    }
    toString() {
        return `schema[${this._roots.keys().join(', ')}]`;
    }
}
exports.SchemaDefinition = SchemaDefinition;
class ScalarType extends BaseNamedType {
    constructor() {
        super(...arguments);
        this.kind = 'ScalarType';
    }
    removeTypeReference(type) {
        (0, utils_1.assert)(false, `Scalar type ${this} can't reference other types; shouldn't be asked to remove reference to ${type}`);
    }
    hasNonExtensionInnerElements() {
        return false;
    }
    removeInnerElements() {
    }
    removeReferenceRecursive(ref) {
        ref.remove();
    }
}
exports.ScalarType = ScalarType;
class InterfaceImplementation extends BaseExtensionMember {
    constructor(itf) {
        super();
        this.interface = itf;
    }
    removeInner() {
        FieldBasedType.prototype['removeInterfaceImplementation'].call(this._parent, this.interface);
    }
    toString() {
        return `'implements ${this.interface}'`;
    }
}
exports.InterfaceImplementation = InterfaceImplementation;
class FieldBasedType extends BaseNamedType {
    constructor() {
        super(...arguments);
        this._interfaceImplementations = new utils_1.MapWithCachedArrays();
        this._fields = new utils_1.MapWithCachedArrays();
    }
    onAttached() {
        Schema.prototype['runWithBuiltInModificationAllowed'].call(this.schema(), () => {
            this.addField(new FieldDefinition(exports.typenameFieldName, true), new NonNullType(this.schema().stringType()));
        });
    }
    removeFieldInternal(field) {
        this._fields.delete(field.name);
        this._cachedNonBuiltInFields = undefined;
    }
    interfaceImplementations() {
        return this._interfaceImplementations.values();
    }
    interfaceImplementation(type) {
        return this._interfaceImplementations.get(typeof type === 'string' ? type : type.name);
    }
    interfaces() {
        return this.interfaceImplementations().map(impl => impl.interface);
    }
    implementsInterface(type) {
        return this._interfaceImplementations.has(typeof type === 'string' ? type : type.name);
    }
    addImplementedInterface(nameOrItfOrItfImpl) {
        let toAdd;
        if (nameOrItfOrItfImpl instanceof InterfaceImplementation) {
            this.checkUpdate(nameOrItfOrItfImpl);
            toAdd = nameOrItfOrItfImpl;
        }
        else {
            let itf;
            if (typeof nameOrItfOrItfImpl === 'string') {
                this.checkUpdate();
                const maybeItf = this.schema().type(nameOrItfOrItfImpl);
                if (!maybeItf) {
                    throw new graphql_1.GraphQLError(`Cannot implement unknown type ${nameOrItfOrItfImpl}`);
                }
                else if (maybeItf.kind != 'InterfaceType') {
                    throw new graphql_1.GraphQLError(`Cannot implement non-interface type ${nameOrItfOrItfImpl} (of type ${maybeItf.kind})`);
                }
                itf = maybeItf;
            }
            else {
                itf = nameOrItfOrItfImpl;
            }
            toAdd = new InterfaceImplementation(itf);
        }
        const existing = this._interfaceImplementations.get(toAdd.interface.name);
        if (!existing) {
            this._interfaceImplementations.set(toAdd.interface.name, toAdd);
            addReferenceToType(this, toAdd.interface);
            Element.prototype['setParent'].call(toAdd, this);
            this.onModification();
            return toAdd;
        }
        else {
            return existing;
        }
    }
    fields(includeNonGraphQLBuiltIns = false) {
        if (includeNonGraphQLBuiltIns) {
            return this.allFields().filter(f => !exports.graphQLBuiltIns.isGraphQLBuiltIn(f));
        }
        if (!this._cachedNonBuiltInFields) {
            this._cachedNonBuiltInFields = this._fields.values().filter(f => !f.isBuiltIn);
        }
        return this._cachedNonBuiltInFields;
    }
    hasFields(includeNonGraphQLBuiltIns = false) {
        return this.fields(includeNonGraphQLBuiltIns).length > 0;
    }
    builtInFields() {
        return this.allFields().filter(f => f.isBuiltIn);
    }
    allFields() {
        return this._fields.values();
    }
    field(name) {
        return this._fields.get(name);
    }
    typenameField() {
        return this.field(exports.typenameFieldName);
    }
    addField(nameOrField, type) {
        let toAdd;
        if (typeof nameOrField === 'string') {
            this.checkUpdate();
            toAdd = new FieldDefinition(nameOrField);
        }
        else {
            this.checkUpdate(nameOrField);
            toAdd = nameOrField;
        }
        if (this.field(toAdd.name)) {
            throw error(`Field ${toAdd.name} already exists on ${this}`);
        }
        if (type && !isOutputType(type)) {
            throw error(`Invalid input type ${type} for field ${toAdd.name}: object and interface field types should be output types.`);
        }
        this._fields.set(toAdd.name, toAdd);
        this._cachedNonBuiltInFields = undefined;
        Element.prototype['setParent'].call(toAdd, this);
        if (type) {
            toAdd.type = type;
        }
        this.onModification();
        return toAdd;
    }
    *allChildElements() {
        for (const field of this._fields.values()) {
            yield field;
            yield* field.arguments();
        }
    }
    removeInterfaceImplementation(itf) {
        this._interfaceImplementations.delete(itf.name);
        removeReferenceToType(this, itf);
    }
    removeTypeReference(type) {
        this._interfaceImplementations.delete(type.name);
    }
    removeInnerElements() {
        for (const interfaceImpl of this.interfaceImplementations()) {
            interfaceImpl.remove();
        }
        for (const field of this.allFields()) {
            if (field.isBuiltIn) {
                FieldDefinition.prototype['removeParent'].call(field);
            }
            else {
                field.remove();
            }
        }
    }
    hasNonExtensionInnerElements() {
        return this.interfaceImplementations().some(itf => itf.ofExtension() === undefined)
            || this.fields().some(f => f.ofExtension() === undefined);
    }
}
class ObjectType extends FieldBasedType {
    constructor() {
        super(...arguments);
        this.kind = 'ObjectType';
    }
    isRootType() {
        const schema = this.schema();
        return schema.schemaDefinition.roots().some(rt => rt.type == this);
    }
    isQueryRootType() {
        var _a;
        const schema = this.schema();
        return ((_a = schema.schemaDefinition.root('query')) === null || _a === void 0 ? void 0 : _a.type) === this;
    }
    removeReferenceRecursive(ref) {
        switch (ref.kind) {
            case 'FieldDefinition':
                ref.removeRecursive();
                break;
            case 'UnionType':
                if (ref.membersCount() === 0) {
                    ref.removeRecursive();
                }
                break;
        }
    }
}
exports.ObjectType = ObjectType;
class InterfaceType extends FieldBasedType {
    constructor() {
        super(...arguments);
        this.kind = 'InterfaceType';
    }
    allImplementations() {
        return (0, utils_1.setValues)(this._referencers).filter(ref => ref.kind === 'ObjectType' || ref.kind === 'InterfaceType');
    }
    possibleRuntimeTypes() {
        return this.allImplementations().filter(impl => impl.kind === 'ObjectType');
    }
    isPossibleRuntimeType(type) {
        const typeName = typeof type === 'string' ? type : type.name;
        return this.possibleRuntimeTypes().some(t => t.name == typeName);
    }
    removeReferenceRecursive(ref) {
        if (ref.kind === 'FieldDefinition') {
            ref.removeRecursive();
        }
    }
}
exports.InterfaceType = InterfaceType;
class UnionMember extends BaseExtensionMember {
    constructor(type) {
        super();
        this.type = type;
    }
    removeInner() {
        UnionType.prototype['removeMember'].call(this._parent, this.type);
    }
}
exports.UnionMember = UnionMember;
class UnionType extends BaseNamedType {
    constructor() {
        super(...arguments);
        this.kind = 'UnionType';
        this._members = new utils_1.MapWithCachedArrays();
    }
    onAttached() {
        Schema.prototype['runWithBuiltInModificationAllowed'].call(this.schema(), () => {
            this._typenameField = new FieldDefinition(exports.typenameFieldName, true);
            Element.prototype['setParent'].call(this._typenameField, this);
            this._typenameField.type = new NonNullType(this.schema().stringType());
        });
    }
    types() {
        return this.members().map(m => m.type);
    }
    members() {
        return this._members.values();
    }
    membersCount() {
        return this._members.size;
    }
    hasTypeMember(type) {
        return this._members.has(typeof type === 'string' ? type : type.name);
    }
    addType(nameOrTypeOrMember) {
        let toAdd;
        if (nameOrTypeOrMember instanceof UnionMember) {
            this.checkUpdate(nameOrTypeOrMember);
            toAdd = nameOrTypeOrMember;
        }
        else {
            let obj;
            if (typeof nameOrTypeOrMember === 'string') {
                this.checkUpdate();
                const maybeObj = this.schema().type(nameOrTypeOrMember);
                if (!maybeObj) {
                    throw new graphql_1.GraphQLError(`Cannot add unknown type ${nameOrTypeOrMember} as member of union type ${this.name}`);
                }
                else if (maybeObj.kind != 'ObjectType') {
                    throw new graphql_1.GraphQLError(`Cannot add non-object type ${nameOrTypeOrMember} (of type ${maybeObj.kind}) as member of union type ${this.name}`);
                }
                obj = maybeObj;
            }
            else {
                this.checkUpdate(nameOrTypeOrMember);
                obj = nameOrTypeOrMember;
            }
            toAdd = new UnionMember(obj);
        }
        const existing = this._members.get(toAdd.type.name);
        if (!existing) {
            this._members.set(toAdd.type.name, toAdd);
            Element.prototype['setParent'].call(toAdd, this);
            addReferenceToType(this, toAdd.type);
            this.onModification();
            return toAdd;
        }
        else {
            return existing;
        }
    }
    clearTypes() {
        for (const type of this.types()) {
            this.removeMember(type);
        }
        this.onModification();
    }
    field(name) {
        if (name === exports.typenameFieldName && this._typenameField) {
            return this._typenameField;
        }
        return undefined;
    }
    typenameField() {
        return this._typenameField;
    }
    removeMember(type) {
        this._members.delete(type.name);
        removeReferenceToType(this, type);
    }
    removeTypeReference(type) {
        this._members.delete(type.name);
    }
    removeInnerElements() {
        for (const member of this.members()) {
            member.remove();
        }
    }
    hasNonExtensionInnerElements() {
        return this.members().some(m => m.ofExtension() === undefined);
    }
    removeReferenceRecursive(ref) {
        ref.removeRecursive();
    }
}
exports.UnionType = UnionType;
class EnumType extends BaseNamedType {
    constructor() {
        super(...arguments);
        this.kind = 'EnumType';
        this._values = [];
    }
    get values() {
        return this._values;
    }
    value(name) {
        return this._values.find(v => v.name == name);
    }
    addValue(nameOrValue) {
        let toAdd;
        if (typeof nameOrValue === 'string') {
            this.checkUpdate();
            toAdd = new EnumValue(nameOrValue);
        }
        else {
            this.checkUpdate(nameOrValue);
            toAdd = nameOrValue;
        }
        const existing = this.value(toAdd.name);
        if (!existing) {
            this._values.push(toAdd);
            Element.prototype['setParent'].call(toAdd, this);
            this.onModification();
            return toAdd;
        }
        else {
            return existing;
        }
    }
    removeTypeReference(type) {
        (0, utils_1.assert)(false, `Eum type ${this} can't reference other types; shouldn't be asked to remove reference to ${type}`);
    }
    removeValueInternal(value) {
        const index = this._values.indexOf(value);
        if (index >= 0) {
            this._values.splice(index, 1);
        }
    }
    removeInnerElements() {
        this._values.splice(0, this._values.length);
    }
    hasNonExtensionInnerElements() {
        return this._values.some(v => v.ofExtension() === undefined);
    }
    removeReferenceRecursive(ref) {
        ref.removeRecursive();
    }
}
exports.EnumType = EnumType;
class InputObjectType extends BaseNamedType {
    constructor() {
        super(...arguments);
        this.kind = 'InputObjectType';
        this._fields = new Map();
    }
    fields() {
        if (!this._cachedFieldsArray) {
            this._cachedFieldsArray = (0, utils_1.mapValues)(this._fields);
        }
        return this._cachedFieldsArray;
    }
    field(name) {
        return this._fields.get(name);
    }
    addField(nameOrField, type) {
        const toAdd = typeof nameOrField === 'string' ? new InputFieldDefinition(nameOrField) : nameOrField;
        this.checkUpdate(toAdd);
        if (this.field(toAdd.name)) {
            throw error(`Field ${toAdd.name} already exists on ${this}`);
        }
        if (type && !isInputType(type)) {
            throw error(`Invalid output type ${type} for field ${toAdd.name}: input field types should be input types.`);
        }
        this._fields.set(toAdd.name, toAdd);
        this._cachedFieldsArray = undefined;
        Element.prototype['setParent'].call(toAdd, this);
        if (typeof nameOrField === 'string' && type) {
            toAdd.type = type;
        }
        this.onModification();
        return toAdd;
    }
    hasFields() {
        return this._fields.size > 0;
    }
    *allChildElements() {
        yield* this._fields.values();
    }
    removeTypeReference(type) {
        (0, utils_1.assert)(false, `Input Object type ${this} can't reference other types; shouldn't be asked to remove reference to ${type}`);
    }
    removeInnerElements() {
        for (const field of this.fields()) {
            field.remove();
        }
    }
    removeFieldInternal(field) {
        this._fields.delete(field.name);
        this._cachedFieldsArray = undefined;
    }
    hasNonExtensionInnerElements() {
        return this.fields().some(f => f.ofExtension() === undefined);
    }
    removeReferenceRecursive(ref) {
        if (ref.kind === 'ArgumentDefinition') {
            ref.parent().removeRecursive();
        }
        else {
            ref.removeRecursive();
        }
    }
}
exports.InputObjectType = InputObjectType;
class BaseWrapperType {
    constructor(_type) {
        this._type = _type;
        (0, utils_1.assert)(this._type, 'Cannot wrap an undefined/null type');
    }
    schema() {
        return this.baseType().schema();
    }
    isAttached() {
        return this.baseType().isAttached();
    }
    get ofType() {
        return this._type;
    }
    baseType() {
        return baseType(this._type);
    }
}
class ListType extends BaseWrapperType {
    constructor(type) {
        super(type);
        this.kind = 'ListType';
    }
    toString() {
        return `[${this.ofType}]`;
    }
}
exports.ListType = ListType;
class NonNullType extends BaseWrapperType {
    constructor(type) {
        super(type);
        this.kind = 'NonNullType';
    }
    toString() {
        return `${this.ofType}!`;
    }
}
exports.NonNullType = NonNullType;
class FieldDefinition extends NamedSchemaElementWithType {
    constructor(name, isBuiltIn = false) {
        super(name);
        this.isBuiltIn = isBuiltIn;
        this.kind = 'FieldDefinition';
        this._args = new utils_1.MapWithCachedArrays();
    }
    isElementBuiltIn() {
        return this.isBuiltIn;
    }
    get coordinate() {
        const parent = this._parent;
        return `${parent == undefined ? '<detached>' : parent.coordinate}.${this.name}`;
    }
    hasArguments() {
        return this._args.size > 0;
    }
    arguments() {
        return this._args.values();
    }
    argument(name) {
        return this._args.get(name);
    }
    addArgument(nameOrArg, type, defaultValue) {
        let toAdd;
        if (typeof nameOrArg === 'string') {
            this.checkUpdate();
            toAdd = new ArgumentDefinition(nameOrArg);
            toAdd.defaultValue = defaultValue;
        }
        else {
            this.checkUpdate(nameOrArg);
            toAdd = nameOrArg;
        }
        const existing = this.argument(toAdd.name);
        if (existing) {
            if (type && existing.type && !(0, types_1.sameType)(type, existing.type)) {
                throw error(`Argument ${toAdd.name} already exists on field ${this.name} with a different type (${existing.type})`);
            }
            if (defaultValue && (!existing.defaultValue || !(0, values_1.valueEquals)(defaultValue, existing.defaultValue))) {
                throw error(`Argument ${toAdd.name} already exists on field ${this.name} with a different default value (${(0, values_1.valueToString)(existing.defaultValue)})`);
            }
            return existing;
        }
        if (type && !isInputType(type)) {
            throw error(`Invalid output type ${type} for argument ${toAdd.name} of ${this}: arguments should be input types.`);
        }
        this._args.set(toAdd.name, toAdd);
        Element.prototype['setParent'].call(toAdd, this);
        if (typeof nameOrArg === 'string') {
            toAdd.type = type;
        }
        this.onModification();
        return toAdd;
    }
    ofExtension() {
        return this._extension;
    }
    setOfExtension(extension) {
        var _a;
        this.checkUpdate();
        if (extension && !((_a = this._parent) === null || _a === void 0 ? void 0 : _a.extensions().has(extension))) {
            throw error(`Cannot mark field ${this.name} as part of the provided extension: it is not an extension of field parent type ${this.parent}`);
        }
        this._extension = extension;
        this.onModification();
    }
    isIntrospectionField() {
        return (0, introspection_1.isIntrospectionName)(this.name);
    }
    isSchemaIntrospectionField() {
        return introspection_1.introspectionFieldNames.includes(this.name);
    }
    removeArgumentInternal(name) {
        this._args.delete(name);
    }
    removeParent() {
        this._parent = undefined;
    }
    isDeprecated() {
        return this.hasAppliedDirective('deprecated');
    }
    remove() {
        if (!this._parent) {
            return [];
        }
        this.onModification();
        this.removeAppliedDirectives();
        this.type = undefined;
        this._extension = undefined;
        for (const arg of this.arguments()) {
            arg.remove();
        }
        FieldBasedType.prototype['removeFieldInternal'].call(this._parent, this);
        this._parent = undefined;
        return [];
    }
    removeRecursive() {
        const parent = this._parent;
        this.remove();
        if (parent && !isUnionType(parent) && parent.fields().length === 0) {
            parent.removeRecursive();
        }
    }
    toString() {
        const args = this._args.size == 0
            ? ""
            : '(' + this.arguments().map(arg => arg.toString()).join(', ') + ')';
        return `${this.name}${args}: ${this.type}`;
    }
}
exports.FieldDefinition = FieldDefinition;
class InputFieldDefinition extends NamedSchemaElementWithType {
    constructor() {
        super(...arguments);
        this.kind = 'InputFieldDefinition';
    }
    get coordinate() {
        const parent = this._parent;
        return `${parent == undefined ? '<detached>' : parent.coordinate}.${this.name}`;
    }
    isRequired() {
        return isNonNullType(this.type) && this.defaultValue === undefined;
    }
    ofExtension() {
        return this._extension;
    }
    setOfExtension(extension) {
        var _a;
        this.checkUpdate();
        if (extension && !((_a = this._parent) === null || _a === void 0 ? void 0 : _a.extensions().has(extension))) {
            throw error(`Cannot mark field ${this.name} as part of the provided extension: it is not an extension of field parent type ${this.parent}`);
        }
        this._extension = extension;
        this.onModification();
    }
    isDeprecated() {
        return this.hasAppliedDirective('deprecated');
    }
    remove() {
        if (!this._parent) {
            return [];
        }
        this.onModification();
        InputObjectType.prototype['removeFieldInternal'].call(this._parent, this);
        this._parent = undefined;
        this.type = undefined;
        return [];
    }
    removeRecursive() {
        const parent = this._parent;
        this.remove();
        if (parent && parent.fields().length === 0) {
            parent.removeRecursive();
        }
    }
    toString() {
        const defaultStr = this.defaultValue === undefined ? "" : ` = ${(0, values_1.valueToString)(this.defaultValue, this.type)}`;
        return `${this.name}: ${this.type}${defaultStr}`;
    }
}
exports.InputFieldDefinition = InputFieldDefinition;
class ArgumentDefinition extends NamedSchemaElementWithType {
    constructor(name) {
        super(name);
        this.kind = 'ArgumentDefinition';
    }
    get coordinate() {
        const parent = this._parent;
        return `${parent == undefined ? '<detached>' : parent.coordinate}(${this.name}:)`;
    }
    isRequired() {
        return isNonNullType(this.type) && this.defaultValue === undefined;
    }
    isDeprecated() {
        return this.hasAppliedDirective('deprecated');
    }
    remove() {
        if (!this._parent) {
            return [];
        }
        this.onModification();
        if (this._parent instanceof FieldDefinition) {
            FieldDefinition.prototype['removeArgumentInternal'].call(this._parent, this.name);
        }
        else {
            DirectiveDefinition.prototype['removeArgumentInternal'].call(this._parent, this.name);
        }
        this._parent = undefined;
        this.type = undefined;
        this.defaultValue = undefined;
        return [];
    }
    toString() {
        const defaultStr = this.defaultValue === undefined ? "" : ` = ${(0, values_1.valueToString)(this.defaultValue, this.type)}`;
        return `${this.name}: ${this.type}${defaultStr}`;
    }
}
exports.ArgumentDefinition = ArgumentDefinition;
class EnumValue extends NamedSchemaElement {
    constructor() {
        super(...arguments);
        this.kind = 'EnumValue';
    }
    get coordinate() {
        const parent = this._parent;
        return `${parent == undefined ? '<detached>' : parent.coordinate}.${this.name}`;
    }
    ofExtension() {
        return this._extension;
    }
    setOfExtension(extension) {
        var _a;
        this.checkUpdate();
        if (extension && !((_a = this._parent) === null || _a === void 0 ? void 0 : _a.extensions().has(extension))) {
            throw error(`Cannot mark field ${this.name} as part of the provided extension: it is not an extension of field parent type ${this.parent}`);
        }
        this._extension = extension;
        this.onModification();
    }
    isDeprecated() {
        return this.hasAppliedDirective('deprecated');
    }
    remove() {
        if (!this._parent) {
            return [];
        }
        this.onModification();
        EnumType.prototype['removeValueInternal'].call(this._parent, this);
        this._parent = undefined;
        return [];
    }
    removeTypeReference(type) {
        (0, utils_1.assert)(false, `Enum value ${this} can't reference other types; shouldn't be asked to remove reference to ${type}`);
    }
    toString() {
        return `${this.name}`;
    }
}
exports.EnumValue = EnumValue;
class DirectiveDefinition extends NamedSchemaElement {
    constructor(name, isBuiltIn = false) {
        super(name);
        this.isBuiltIn = isBuiltIn;
        this.kind = 'DirectiveDefinition';
        this._args = new utils_1.MapWithCachedArrays();
        this.repeatable = false;
        this._locations = [];
        this._referencers = new Set();
    }
    get coordinate() {
        return `@${this.name}`;
    }
    arguments() {
        return this._args.values();
    }
    argument(name) {
        return this._args.get(name);
    }
    addArgument(nameOrArg, type, defaultValue) {
        let toAdd;
        if (typeof nameOrArg === 'string') {
            this.checkUpdate();
            toAdd = new ArgumentDefinition(nameOrArg);
            toAdd.defaultValue = defaultValue;
        }
        else {
            this.checkUpdate(nameOrArg);
            toAdd = nameOrArg;
        }
        if (this.argument(toAdd.name)) {
            throw error(`Argument ${toAdd.name} already exists on field ${this.name}`);
        }
        this._args.set(toAdd.name, toAdd);
        Element.prototype['setParent'].call(toAdd, this);
        if (typeof nameOrArg === 'string') {
            toAdd.type = type;
        }
        this.onModification();
        return toAdd;
    }
    removeArgumentInternal(name) {
        this._args.delete(name);
    }
    get locations() {
        return this._locations;
    }
    addLocations(...locations) {
        let modified = false;
        for (const location of locations) {
            if (!this._locations.includes(location)) {
                this._locations.push(location);
                modified = true;
            }
        }
        if (modified) {
            this.onModification();
        }
        return this;
    }
    addAllLocations() {
        return this.addLocations(...Object.values(graphql_1.DirectiveLocation));
    }
    addAllTypeLocations() {
        return this.addLocations(graphql_1.DirectiveLocation.SCALAR, graphql_1.DirectiveLocation.OBJECT, graphql_1.DirectiveLocation.INTERFACE, graphql_1.DirectiveLocation.UNION, graphql_1.DirectiveLocation.ENUM, graphql_1.DirectiveLocation.INPUT_OBJECT);
    }
    removeLocations(...locations) {
        let modified = false;
        for (const location of locations) {
            const index = this._locations.indexOf(location);
            if (index >= 0) {
                this._locations.splice(index, 1);
                modified = true;
            }
        }
        if (modified) {
            this.onModification();
        }
        return this;
    }
    applications() {
        return (0, utils_1.setValues)(this._referencers);
    }
    addReferencer(referencer) {
        (0, utils_1.assert)(referencer, 'Referencer should exists');
        this._referencers.add(referencer);
    }
    removeReferencer(referencer) {
        this._referencers.delete(referencer);
    }
    removeTypeReference(type) {
        (0, utils_1.assert)(false, `Directive definition ${this} can't reference other types (it's arguments can); shouldn't be asked to remove reference to ${type}`);
    }
    remove() {
        if (!this._parent) {
            return [];
        }
        this.onModification();
        Schema.prototype['removeDirectiveInternal'].call(this._parent, this);
        this._parent = undefined;
        (0, utils_1.assert)(this._appliedDirectives.length === 0, "Directive definition should not have directive applied to it");
        for (const arg of this.arguments()) {
            arg.remove();
        }
        const toReturn = (0, utils_1.setValues)(this._referencers);
        this._referencers.clear();
        return toReturn;
    }
    removeRecursive() {
        this.remove().forEach(ref => ref.remove());
    }
    toString() {
        return `@${this.name}`;
    }
}
exports.DirectiveDefinition = DirectiveDefinition;
class Directive extends Element {
    constructor(name, _args) {
        super();
        this.name = name;
        this._args = _args;
    }
    schema() {
        return this.parent.schema();
    }
    get definition() {
        const doc = this.schema();
        return doc.directive(this.name);
    }
    arguments(includeDefaultValues = false) {
        if (!includeDefaultValues) {
            return this._args;
        }
        const definition = this.definition;
        if (!definition) {
            throw error(`Cannot include default values for arguments: cannot find directive definition for ${this.name}`);
        }
        const updated = Object.create(null);
        for (const argDef of definition.arguments()) {
            updated[argDef.name] = (0, values_1.withDefaultValues)(this._args[argDef.name], argDef);
        }
        return updated;
    }
    onModification() {
        if (this.isAttachedToSchemaElement()) {
            Schema.prototype['onModification'].call(this.schema());
        }
    }
    isAttachedToSchemaElement() {
        return this.isAttached();
    }
    setArguments(args) {
        this._args = args;
        this.onModification();
    }
    argumentType(name) {
        var _a, _b;
        return (_b = (_a = this.definition) === null || _a === void 0 ? void 0 : _a.argument(name)) === null || _b === void 0 ? void 0 : _b.type;
    }
    matchArguments(expectedArgs) {
        const entries = Object.entries(this._args);
        if (entries.length !== Object.keys(expectedArgs).length) {
            return false;
        }
        for (const [key, val] of entries) {
            if (!(key in expectedArgs)) {
                return false;
            }
            const expectedVal = expectedArgs[key];
            if (!(0, values_1.valueEquals)(expectedVal, val)) {
                return false;
            }
        }
        return true;
    }
    ofExtension() {
        return this._extension;
    }
    setOfExtension(extension) {
        this.checkUpdate();
        if (extension) {
            const parent = this.parent;
            if (parent instanceof SchemaDefinition || parent instanceof BaseNamedType) {
                if (!parent.extensions().has(extension)) {
                    throw error(`Cannot mark directive ${this.name} as part of the provided extension: it is not an extension of parent ${parent}`);
                }
            }
            else {
                throw error(`Can only mark directive parts of extensions when directly apply to type or schema definition.`);
            }
        }
        this._extension = extension;
        this.onModification();
    }
    argumentsToAST() {
        const entries = Object.entries(this._args);
        if (entries.length === 0) {
            return undefined;
        }
        const definition = this.definition;
        (0, utils_1.assert)(definition, () => `Cannot convert arguments of detached directive ${this}`);
        return entries.map(([n, v]) => {
            return {
                kind: graphql_1.Kind.ARGUMENT,
                name: { kind: graphql_1.Kind.NAME, value: n },
                value: (0, values_1.valueToAST)(v, definition.argument(n).type),
            };
        });
    }
    remove() {
        if (!this._parent) {
            return false;
        }
        this.onModification();
        const coreFeatures = this.schema().coreFeatures;
        if (coreFeatures && this.name === coreFeatures.coreItself.nameInSchema) {
            const url = coreSpec_1.FeatureUrl.parse(this._args['feature']);
            if (url.identity === coreFeatures.coreItself.url.identity) {
                Schema.prototype['unmarkAsCoreSchema'].call(this.schema());
                for (const d of this.schema().schemaDefinition.appliedDirectivesOf(coreFeatures.coreItself.nameInSchema)) {
                    d.removeInternal();
                }
                return true;
            }
            else {
                CoreFeatures.prototype['removeFeature'].call(coreFeatures, url.identity);
            }
        }
        return this.removeInternal();
    }
    removeInternal() {
        if (!this._parent) {
            return false;
        }
        const definition = this.definition;
        if (definition && this.isAttachedToSchemaElement()) {
            DirectiveDefinition.prototype['removeReferencer'].call(definition, this);
        }
        const parentDirectives = this._parent.appliedDirectives;
        const index = parentDirectives.indexOf(this);
        (0, utils_1.assert)(index >= 0, () => `Directive ${this} lists ${this._parent} as parent, but that parent doesn't list it as applied directive`);
        parentDirectives.splice(index, 1);
        this._parent = undefined;
        this._extension = undefined;
        return true;
    }
    toString() {
        const entries = Object.entries(this._args).filter(([_, v]) => v !== undefined);
        const args = entries.length == 0 ? '' : '(' + entries.map(([n, v]) => `${n}: ${(0, values_1.valueToString)(v, this.argumentType(n))}`).join(', ') + ')';
        return `@${this.name}${args}`;
    }
}
exports.Directive = Directive;
class Variable {
    constructor(name) {
        this.name = name;
    }
    toVariableNode() {
        return {
            kind: graphql_1.Kind.VARIABLE,
            name: { kind: graphql_1.Kind.NAME, value: this.name },
        };
    }
    toString() {
        return '$' + this.name;
    }
}
exports.Variable = Variable;
function mergeVariables(v1s, v2s) {
    if (v1s.length == 0) {
        return v2s;
    }
    if (v2s.length == 0) {
        return v1s;
    }
    const res = v1s.concat();
    for (const v of v2s) {
        if (!containsVariable(v1s, v)) {
            res.push(v);
        }
    }
    return res;
}
exports.mergeVariables = mergeVariables;
function containsVariable(variables, toCheck) {
    return variables.some(v => v.name == toCheck.name);
}
exports.containsVariable = containsVariable;
function isVariable(v) {
    return v instanceof Variable;
}
exports.isVariable = isVariable;
function variablesInArguments(args) {
    let variables = [];
    for (const value of Object.values(args)) {
        variables = mergeVariables(variables, (0, values_1.variablesInValue)(value));
    }
    return variables;
}
exports.variablesInArguments = variablesInArguments;
class VariableDefinition extends DirectiveTargetElement {
    constructor(schema, variable, type, defaultValue) {
        super(schema);
        this.variable = variable;
        this.type = type;
        this.defaultValue = defaultValue;
    }
    toVariableDefinitionNode() {
        const ast = (0, values_1.valueToAST)(this.defaultValue, this.type);
        return {
            kind: graphql_1.Kind.VARIABLE_DEFINITION,
            variable: this.variable.toVariableNode(),
            type: typeToAST(this.type),
            defaultValue: (ast !== undefined) ? (0, values_1.valueNodeToConstValueNode)(ast) : undefined,
            directives: this.appliedDirectivesToDirectiveNodes(),
        };
    }
    toString() {
        let base = this.variable + ': ' + this.type;
        if (this.defaultValue) {
            base = base + ' = ' + (0, values_1.valueToString)(this.defaultValue, this.type);
        }
        return base + this.appliedDirectivesToString();
    }
}
exports.VariableDefinition = VariableDefinition;
class VariableDefinitions {
    constructor() {
        this._definitions = new utils_1.MapWithCachedArrays();
    }
    add(definition) {
        if (this._definitions.has(definition.variable.name)) {
            return false;
        }
        this._definitions.set(definition.variable.name, definition);
        return true;
    }
    addAll(definitions) {
        for (const definition of definitions._definitions.values()) {
            this.add(definition);
        }
    }
    definition(variable) {
        const varName = typeof variable === 'string' ? variable : variable.name;
        return this._definitions.get(varName);
    }
    isEmpty() {
        return this._definitions.size === 0;
    }
    definitions() {
        return this._definitions.values();
    }
    filter(variables) {
        if (variables.length === 0) {
            return new VariableDefinitions();
        }
        const newDefs = new VariableDefinitions();
        for (const variable of variables) {
            const def = this.definition(variable);
            if (!def) {
                throw new Error(`Cannot find variable ${variable} in definitions ${this}`);
            }
            newDefs.add(def);
        }
        return newDefs;
    }
    toVariableDefinitionNodes() {
        if (this._definitions.size === 0) {
            return undefined;
        }
        return this.definitions().map(def => def.toVariableDefinitionNode());
    }
    toString() {
        return '(' + this.definitions().join(', ') + ')';
    }
}
exports.VariableDefinitions = VariableDefinitions;
function variableDefinitionsFromAST(schema, definitionNodes) {
    const definitions = new VariableDefinitions();
    for (const definitionNode of definitionNodes) {
        if (!definitions.add(variableDefinitionFromAST(schema, definitionNode))) {
            const name = definitionNode.variable.name.value;
            throw new graphql_1.GraphQLError(`Duplicate definition for variable ${name}`, definitionNodes.filter(n => n.variable.name.value === name));
        }
    }
    return definitions;
}
exports.variableDefinitionsFromAST = variableDefinitionsFromAST;
function variableDefinitionFromAST(schema, definitionNode) {
    const variable = new Variable(definitionNode.variable.name.value);
    const type = typeFromAST(schema, definitionNode.type);
    if (!isInputType(type)) {
        throw new graphql_1.GraphQLError(`Invalid type "${type}" for variable $${variable}: not an input type`, definitionNode.type);
    }
    const def = new VariableDefinition(schema, variable, type, definitionNode.defaultValue ? (0, values_1.valueFromAST)(definitionNode.defaultValue, type) : undefined);
    return def;
}
exports.variableDefinitionFromAST = variableDefinitionFromAST;
exports.graphQLBuiltIns = new BuiltIns();
function addReferenceToType(referencer, type) {
    switch (type.kind) {
        case 'ListType':
            addReferenceToType(referencer, type.baseType());
            break;
        case 'NonNullType':
            addReferenceToType(referencer, type.baseType());
            break;
        default:
            BaseNamedType.prototype['addReferencer'].call(type, referencer);
            break;
    }
}
function removeReferenceToType(referencer, type) {
    switch (type.kind) {
        case 'ListType':
            removeReferenceToType(referencer, type.baseType());
            break;
        case 'NonNullType':
            removeReferenceToType(referencer, type.baseType());
            break;
        default:
            BaseNamedType.prototype['removeReferencer'].call(type, referencer);
            break;
    }
}
function newNamedType(kind, name) {
    switch (kind) {
        case 'ScalarType':
            return new ScalarType(name);
        case 'ObjectType':
            return new ObjectType(name);
        case 'InterfaceType':
            return new InterfaceType(name);
        case 'UnionType':
            return new UnionType(name);
        case 'EnumType':
            return new EnumType(name);
        case 'InputObjectType':
            return new InputObjectType(name);
        default:
            (0, utils_1.assert)(false, `Unhandled kind ${kind} for type ${name}`);
    }
}
exports.newNamedType = newNamedType;
function* typesToCopy(source, dest) {
    var _a;
    for (const type of source.builtInTypes()) {
        if (!type.isIntrospectionType() && !((_a = dest.type(type.name)) === null || _a === void 0 ? void 0 : _a.isBuiltIn)) {
            yield type;
        }
    }
    yield* source.types();
}
function* directivesToCopy(source, dest) {
    var _a;
    for (const directive of source.builtInDirectives()) {
        if (!((_a = dest.directive(directive.name)) === null || _a === void 0 ? void 0 : _a.isBuiltIn)) {
            yield directive;
        }
    }
    yield* source.directives();
}
function copy(source, dest) {
    for (const type of typesToCopy(source, dest)) {
        dest.addType(newNamedType(type.kind, type.name));
    }
    for (const directive of directivesToCopy(source, dest)) {
        copyDirectiveDefinitionInner(directive, dest.addDirectiveDefinition(directive.name));
    }
    copySchemaDefinitionInner(source.schemaDefinition, dest.schemaDefinition);
    for (const type of typesToCopy(source, dest)) {
        copyNamedTypeInner(type, dest.type(type.name));
    }
}
function copyExtensions(source, dest) {
    const extensionMap = new Map();
    for (const sourceExtension of source.extensions()) {
        const destExtension = new Extension();
        dest.addExtension(destExtension);
        extensionMap.set(sourceExtension, destExtension);
    }
    return extensionMap;
}
function copyOfExtension(extensionsMap, source, dest) {
    const toCopy = source.ofExtension();
    if (toCopy) {
        dest.setOfExtension(extensionsMap.get(toCopy));
    }
}
function copySchemaDefinitionInner(source, dest) {
    const extensionsMap = copyExtensions(source, dest);
    for (const rootType of source.roots()) {
        copyOfExtension(extensionsMap, rootType, dest.setRoot(rootType.rootKind, rootType.type.name));
    }
    for (const directive of source.appliedDirectives) {
        copyOfExtension(extensionsMap, directive, dest.applyDirective(directive.name, { ...directive.arguments() }));
    }
    dest.description = source.description;
    dest.sourceAST = source.sourceAST;
}
function copyNamedTypeInner(source, dest) {
    const extensionsMap = copyExtensions(source, dest);
    for (const directive of source.appliedDirectives) {
        copyOfExtension(extensionsMap, directive, dest.applyDirective(directive.name, { ...directive.arguments() }));
    }
    dest.description = source.description;
    dest.sourceAST = source.sourceAST;
    switch (source.kind) {
        case 'ObjectType':
        case 'InterfaceType':
            const destFieldBasedType = dest;
            for (const sourceField of source.fields()) {
                const destField = destFieldBasedType.addField(new FieldDefinition(sourceField.name));
                copyOfExtension(extensionsMap, sourceField, destField);
                copyFieldDefinitionInner(sourceField, destField);
            }
            for (const sourceImpl of source.interfaceImplementations()) {
                const destImpl = destFieldBasedType.addImplementedInterface(sourceImpl.interface.name);
                copyOfExtension(extensionsMap, sourceImpl, destImpl);
            }
            break;
        case 'UnionType':
            const destUnionType = dest;
            for (const sourceType of source.members()) {
                const destType = destUnionType.addType(sourceType.type.name);
                copyOfExtension(extensionsMap, sourceType, destType);
            }
            break;
        case 'EnumType':
            const destEnumType = dest;
            for (const sourceValue of source.values) {
                const destValue = destEnumType.addValue(sourceValue.name);
                destValue.description = sourceValue.description;
                copyOfExtension(extensionsMap, sourceValue, destValue);
                copyAppliedDirectives(sourceValue, destValue);
            }
            break;
        case 'InputObjectType':
            const destInputType = dest;
            for (const sourceField of source.fields()) {
                const destField = destInputType.addField(new InputFieldDefinition(sourceField.name));
                copyOfExtension(extensionsMap, sourceField, destField);
                copyInputFieldDefinitionInner(sourceField, destField);
            }
    }
}
function copyAppliedDirectives(source, dest) {
    for (const directive of source.appliedDirectives) {
        dest.applyDirective(directive.name, { ...directive.arguments() });
    }
}
function copyFieldDefinitionInner(source, dest) {
    const type = copyWrapperTypeOrTypeRef(source.type, dest.schema());
    dest.type = type;
    for (const arg of source.arguments()) {
        const argType = copyWrapperTypeOrTypeRef(arg.type, dest.schema());
        copyArgumentDefinitionInner(arg, dest.addArgument(arg.name, argType));
    }
    copyAppliedDirectives(source, dest);
    dest.description = source.description;
    dest.sourceAST = source.sourceAST;
}
function copyInputFieldDefinitionInner(source, dest) {
    const type = copyWrapperTypeOrTypeRef(source.type, dest.schema());
    dest.type = type;
    dest.defaultValue = source.defaultValue;
    copyAppliedDirectives(source, dest);
    dest.description = source.description;
    dest.sourceAST = source.sourceAST;
}
function copyWrapperTypeOrTypeRef(source, destParent) {
    if (!source) {
        return undefined;
    }
    switch (source.kind) {
        case 'ListType':
            return new ListType(copyWrapperTypeOrTypeRef(source.ofType, destParent));
        case 'NonNullType':
            return new NonNullType(copyWrapperTypeOrTypeRef(source.ofType, destParent));
        default:
            return destParent.type(source.name);
    }
}
function copyArgumentDefinitionInner(source, dest) {
    const type = copyWrapperTypeOrTypeRef(source.type, dest.schema());
    dest.type = type;
    dest.defaultValue = source.defaultValue;
    copyAppliedDirectives(source, dest);
    dest.description = source.description;
    dest.sourceAST = source.sourceAST;
}
function copyDirectiveDefinitionInner(source, dest) {
    for (const arg of source.arguments()) {
        const type = copyWrapperTypeOrTypeRef(arg.type, dest.schema());
        copyArgumentDefinitionInner(arg, dest.addArgument(arg.name, type));
    }
    dest.repeatable = source.repeatable;
    dest.addLocations(...source.locations);
    dest.sourceAST = source.sourceAST;
    dest.description = source.description;
}
//# sourceMappingURL=definitions.js.map