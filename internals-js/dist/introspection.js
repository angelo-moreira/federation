"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addIntrospectionFields = exports.isIntrospectionName = exports.introspectionFieldNames = void 0;
const graphql_1 = require("graphql");
const definitions_1 = require("./definitions");
exports.introspectionFieldNames = ['__schema', '__type'];
function isIntrospectionName(name) {
    return name.startsWith('__');
}
exports.isIntrospectionName = isIntrospectionName;
function addIntrospectionFields(schema) {
    if (schema.type('__Schema')) {
        return;
    }
    const typeKindEnum = schema.addType(new definitions_1.EnumType('__TypeKind', true));
    typeKindEnum.addValue('SCALAR');
    typeKindEnum.addValue('OBJECT');
    typeKindEnum.addValue('INTERFACE');
    typeKindEnum.addValue('UNION');
    typeKindEnum.addValue('ENUM');
    typeKindEnum.addValue('INPUT_OBJECT');
    typeKindEnum.addValue('LIST');
    typeKindEnum.addValue('NON_NULL');
    const inputValueType = schema.addType(new definitions_1.ObjectType('__InputValue', true));
    const fieldType = schema.addType(new definitions_1.ObjectType('__Field', true));
    const typeType = schema.addType(new definitions_1.ObjectType('__Type', true));
    const enumValueType = schema.addType(new definitions_1.ObjectType('__EnumValue', true));
    typeType.addField('kind', new definitions_1.NonNullType(typeKindEnum));
    typeType.addField('name', schema.stringType());
    typeType.addField('description', schema.stringType());
    typeType.addField('fields', new definitions_1.ListType(new definitions_1.NonNullType(fieldType)))
        .addArgument('includeDeprecated', schema.booleanType(), false);
    typeType.addField('interfaces', new definitions_1.ListType(new definitions_1.NonNullType(typeType)));
    typeType.addField('possibleTypes', new definitions_1.ListType(new definitions_1.NonNullType(typeType)));
    typeType.addField('enumValues', new definitions_1.ListType(new definitions_1.NonNullType(enumValueType)))
        .addArgument('includeDeprecated', schema.booleanType(), false);
    typeType.addField('inputFields', new definitions_1.ListType(new definitions_1.NonNullType(inputValueType)));
    typeType.addField('ofType', typeType);
    typeType.addField('specifiedByURL', schema.stringType());
    fieldType.addField('name', new definitions_1.NonNullType(schema.stringType()));
    fieldType.addField('description', schema.stringType());
    fieldType.addField('args', new definitions_1.NonNullType(new definitions_1.ListType(new definitions_1.NonNullType(inputValueType))));
    fieldType.addField('type', new definitions_1.NonNullType(typeType));
    fieldType.addField('isDeprecated', new definitions_1.NonNullType(schema.booleanType()));
    fieldType.addField('deprecationReason', schema.stringType());
    inputValueType.addField('name', new definitions_1.NonNullType(schema.stringType()));
    inputValueType.addField('description', schema.stringType());
    inputValueType.addField('type', new definitions_1.NonNullType(typeType));
    inputValueType.addField('defaultValue', schema.stringType());
    enumValueType.addField('name', new definitions_1.NonNullType(schema.stringType()));
    enumValueType.addField('description', schema.stringType());
    enumValueType.addField('isDeprecated', new definitions_1.NonNullType(schema.booleanType()));
    enumValueType.addField('deprecationReason', schema.stringType());
    const directiveLocationEnum = schema.addType(new definitions_1.EnumType('__DirectiveLocation', true));
    for (const location of Object.values(graphql_1.DirectiveLocation)) {
        directiveLocationEnum.addValue(location);
    }
    const directiveType = schema.addType(new definitions_1.ObjectType('__Directive', true));
    directiveType.addField('name', new definitions_1.NonNullType(schema.stringType()));
    directiveType.addField('description', schema.stringType());
    directiveType.addField('locations', new definitions_1.NonNullType(new definitions_1.ListType(new definitions_1.NonNullType(directiveLocationEnum))));
    directiveType.addField('args', new definitions_1.NonNullType(new definitions_1.ListType(new definitions_1.NonNullType(inputValueType))));
    directiveType.addField('isRepeatable', new definitions_1.NonNullType(schema.booleanType()));
    const schemaType = schema.addType(new definitions_1.ObjectType('__Schema', true));
    schemaType.addField('description', schema.stringType());
    schemaType.addField('types', new definitions_1.NonNullType(new definitions_1.ListType(new definitions_1.NonNullType(typeType))));
    schemaType.addField('queryType', new definitions_1.NonNullType(typeType));
    schemaType.addField('mutationType', new definitions_1.NonNullType(typeType));
    schemaType.addField('subscriptionType', new definitions_1.NonNullType(typeType));
    schemaType.addField('directives', new definitions_1.NonNullType(new definitions_1.ListType(new definitions_1.NonNullType(directiveType))));
    let queryRoot = schema.schemaDefinition.rootType('query');
    if (!queryRoot) {
        queryRoot = schema.addType(new definitions_1.ObjectType('Query'));
        schema.schemaDefinition.setRoot('query', queryRoot);
    }
    queryRoot.addField(new definitions_1.FieldDefinition('__schema', true), new definitions_1.NonNullType(schemaType));
    queryRoot.addField(new definitions_1.FieldDefinition('__type', true), typeType)
        .addArgument('name', new definitions_1.NonNullType(schema.stringType()));
}
exports.addIntrospectionFields = addIntrospectionFields;
//# sourceMappingURL=introspection.js.map