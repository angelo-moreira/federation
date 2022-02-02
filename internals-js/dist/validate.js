"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSchema = void 0;
const definitions_1 = require("./definitions");
const graphql_1 = require("graphql");
const values_1 = require("./values");
const introspection_1 = require("./introspection");
const types_1 = require("./types");
function validateSchema(schema) {
    return new Validator(schema).validate();
}
exports.validateSchema = validateSchema;
class InputObjectCircularRefsValidator {
    constructor(onError) {
        this.onError = onError;
        this.visitedTypes = new Set();
        this.fieldPath = [];
        this.fieldPathIndexByTypeName = new Map();
    }
    detectCycles(type) {
        if (this.visitedTypes.has(type.name)) {
            return;
        }
        this.visitedTypes.add(type.name);
        this.fieldPathIndexByTypeName.set(type.name, this.fieldPath.length);
        for (const field of type.fields()) {
            if ((0, definitions_1.isNonNullType)(field.type) && (0, definitions_1.isInputObjectType)(field.type.ofType)) {
                const fieldType = field.type.ofType;
                const cycleIndex = this.fieldPathIndexByTypeName.get(fieldType.name);
                this.fieldPath.push(field);
                if (cycleIndex === undefined) {
                    this.detectCycles(fieldType);
                }
                else {
                    const cyclePath = this.fieldPath.slice(cycleIndex);
                    const pathStr = cyclePath.map((fieldObj) => fieldObj.name).join('.');
                    this.onError(new graphql_1.GraphQLError(`Cannot reference Input Object "${fieldType.name}" within itself through a series of non-null fields: "${pathStr}".`, (0, definitions_1.sourceASTs)(...cyclePath)));
                }
                this.fieldPath.pop();
            }
        }
        this.fieldPathIndexByTypeName.delete(type.name);
    }
}
class Validator {
    constructor(schema) {
        this.schema = schema;
        this.emptyVariables = new definitions_1.VariableDefinitions();
        this.hasMissingTypes = false;
        this.errors = [];
    }
    validate() {
        for (const type of this.schema.types()) {
            this.validateName(type);
            switch (type.kind) {
                case 'ObjectType':
                case 'InterfaceType':
                    this.validateObjectOrInterfaceType(type);
                    break;
                case 'InputObjectType':
                    this.validateInputObjectType(type);
                    break;
                case 'UnionType':
                    this.validateUnionType(type);
                    break;
                case 'EnumType':
                    this.validateEnumType(type);
                    break;
            }
        }
        for (const directive of this.schema.allDirectives()) {
            this.validateName(directive);
            for (const arg of directive.arguments()) {
                this.validateArg(arg);
            }
            for (const application of directive.applications()) {
                this.validateDirectiveApplication(directive, application);
            }
        }
        if (!this.hasMissingTypes) {
            const refsValidator = new InputObjectCircularRefsValidator(e => this.errors.push(e));
            for (const type of this.schema.types()) {
                switch (type.kind) {
                    case 'ObjectType':
                    case 'InterfaceType':
                        this.validateImplementedInterfaces(type);
                        break;
                    case 'InputObjectType':
                        refsValidator.detectCycles(type);
                        break;
                }
            }
        }
        return this.errors;
    }
    validateHasType(elt) {
        if (!elt.type) {
            this.errors.push(new graphql_1.GraphQLError(`Element ${elt.coordinate} does not have a type set`, elt.sourceAST));
            this.hasMissingTypes = false;
        }
    }
    validateName(elt) {
        if ((0, introspection_1.isIntrospectionName)(elt.name)) {
            return;
        }
        const error = (0, graphql_1.isValidNameError)(elt.name);
        if (error) {
            this.errors.push(elt.sourceAST ? new graphql_1.GraphQLError(error.message, elt.sourceAST) : error);
        }
    }
    validateObjectOrInterfaceType(type) {
        if (!type.hasFields(true)) {
            this.errors.push(new graphql_1.GraphQLError(`Type ${type.name} must define one or more fields.`, type.sourceAST));
        }
        for (const field of type.fields()) {
            this.validateName(field);
            this.validateHasType(field);
            for (const arg of field.arguments()) {
                this.validateArg(arg);
            }
        }
    }
    validateImplementedInterfaces(type) {
        if (type.implementsInterface(type.name)) {
            this.errors.push(new graphql_1.GraphQLError(`Type ${type} cannot implement itself because it would create a circular reference.`, (0, definitions_1.sourceASTs)(type, type.interfaceImplementation(type.name))));
        }
        for (const itf of type.interfaces()) {
            for (const itfField of itf.fields()) {
                const field = type.field(itfField.name);
                if (!field) {
                    this.errors.push(new graphql_1.GraphQLError(`Interface field ${itfField.coordinate} expected but ${type} does not provide it.`, (0, definitions_1.sourceASTs)(itfField, type)));
                    continue;
                }
                this.validateHasType(itfField);
                if (!(0, types_1.isSubtype)(itfField.type, field.type)) {
                    this.errors.push(new graphql_1.GraphQLError(`Interface field ${itfField.coordinate} expects type ${itfField.type} but ${field.coordinate} of type ${field.type} is not a proper subtype.`, (0, definitions_1.sourceASTs)(itfField, field)));
                }
                for (const itfArg of itfField.arguments()) {
                    const arg = field.argument(itfArg.name);
                    if (!arg) {
                        this.errors.push(new graphql_1.GraphQLError(`Interface field argument ${itfArg.coordinate} expected but ${field.coordinate} does not provide it.`, (0, definitions_1.sourceASTs)(itfArg, field)));
                        continue;
                    }
                    this.validateHasType(itfArg);
                    if (!(0, types_1.sameType)(itfArg.type, arg.type)) {
                        this.errors.push(new graphql_1.GraphQLError(`Interface field argument ${itfArg.coordinate} expects type ${itfArg.type} but ${arg.coordinate} is type ${arg.type}.`, (0, definitions_1.sourceASTs)(itfArg, arg)));
                    }
                }
                for (const arg of field.arguments()) {
                    if (itfField.argument(arg.name)) {
                        continue;
                    }
                    if (arg.isRequired()) {
                        this.errors.push(new graphql_1.GraphQLError(`Field ${field.coordinate} includes required argument ${arg.name} that is missing from the Interface field ${itfField.coordinate}.`, (0, definitions_1.sourceASTs)(arg, itfField)));
                    }
                }
            }
            for (const itfOfItf of itf.interfaces()) {
                if (!type.implementsInterface(itfOfItf)) {
                    if (itfOfItf === type) {
                        this.errors.push(new graphql_1.GraphQLError(`Type ${type} cannot implement ${itf} because it would create a circular reference.`, (0, definitions_1.sourceASTs)(type, itf)));
                    }
                    else {
                        this.errors.push(new graphql_1.GraphQLError(`Type ${type} must implement ${itfOfItf} because it is implemented by ${itf}.`, (0, definitions_1.sourceASTs)(type, itf, itfOfItf)));
                    }
                }
            }
        }
    }
    validateInputObjectType(type) {
        if (!type.hasFields()) {
            this.errors.push(new graphql_1.GraphQLError(`Input Object type ${type.name} must define one or more fields.`, type.sourceAST));
        }
        for (const field of type.fields()) {
            this.validateName(field);
            this.validateHasType(field);
            if (field.isRequired() && field.isDeprecated()) {
                this.errors.push(new graphql_1.GraphQLError(`Required input field ${field.coordinate} cannot be deprecated.`, (0, definitions_1.sourceASTs)(field.appliedDirectivesOf('deprecated')[0], field)));
            }
        }
    }
    validateArg(arg) {
        this.validateName(arg);
        this.validateHasType(arg);
        if (arg.isRequired() && arg.isDeprecated()) {
            this.errors.push(new graphql_1.GraphQLError(`Required argument ${arg.coordinate} cannot be deprecated.`, (0, definitions_1.sourceASTs)(arg.appliedDirectivesOf('deprecated')[0], arg)));
        }
    }
    validateUnionType(type) {
        if (type.membersCount() === 0) {
            this.errors.push(new graphql_1.GraphQLError(`Union type ${type.coordinate} must define one or more member types.`, type.sourceAST));
        }
    }
    validateEnumType(type) {
        if (type.values.length === 0) {
            this.errors.push(new graphql_1.GraphQLError(`Enum type ${type.coordinate} must define one or more values.`, type.sourceAST));
        }
        for (const value of type.values) {
            this.validateName(value);
            if (value.name === 'true' || value.name === 'false' || value.name === 'null') {
                this.errors.push(new graphql_1.GraphQLError(`Enum type ${type.coordinate} cannot include value: ${value}.`, value.sourceAST));
            }
        }
    }
    validateDirectiveApplication(definition, application) {
        for (const argument of definition.arguments()) {
            const value = application.arguments()[argument.name];
            if (!value) {
                continue;
            }
            if (!(0, values_1.isValidValue)(value, argument, this.emptyVariables)) {
                const parent = application.parent;
                const parentDesc = parent instanceof definitions_1.NamedSchemaElement
                    ? parent.coordinate
                    : 'schema';
                this.errors.push(new graphql_1.GraphQLError(`Invalid value for "${argument.coordinate}" of type "${argument.type}" in application of "${definition.coordinate}" to "${parentDesc}".`, (0, definitions_1.sourceASTs)(application, argument)));
            }
        }
    }
}
//# sourceMappingURL=validate.js.map