"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printBlockString = exports.printType = exports.printIntrospectionSchema = exports.printSubgraphSchema = void 0;
const graphql_1 = require("graphql");
const types_1 = require("./types");
const directives_1 = require("./directives");
function printSubgraphSchema(schema) {
    return printFilteredSchema(schema, (n) => !(0, graphql_1.isSpecifiedDirective)(n) && !(0, directives_1.isFederationDirective)(n), isDefinedType);
}
exports.printSubgraphSchema = printSubgraphSchema;
function printIntrospectionSchema(schema) {
    return printFilteredSchema(schema, graphql_1.isSpecifiedDirective, graphql_1.isIntrospectionType);
}
exports.printIntrospectionSchema = printIntrospectionSchema;
function isDefinedType(type) {
    return (!(0, graphql_1.isSpecifiedScalarType)(type) &&
        !(0, graphql_1.isIntrospectionType)(type) &&
        !(0, types_1.isFederationType)(type));
}
function printFilteredSchema(schema, directiveFilter, typeFilter) {
    const directives = schema.getDirectives().filter(directiveFilter);
    const types = Object.values(schema.getTypeMap()).filter(typeFilter);
    return ([
        printSchemaDefinition(schema),
        ...directives.map((directive) => printDirective(directive)),
        ...types.map((type) => printType(type)),
    ]
        .filter(Boolean)
        .join('\n\n') + '\n');
}
function printSchemaDefinition(schema) {
    if (isSchemaOfCommonNames(schema)) {
        return;
    }
    const operationTypes = [];
    const queryType = schema.getQueryType();
    if (queryType) {
        operationTypes.push(`  query: ${queryType.name}`);
    }
    const mutationType = schema.getMutationType();
    if (mutationType) {
        operationTypes.push(`  mutation: ${mutationType.name}`);
    }
    const subscriptionType = schema.getSubscriptionType();
    if (subscriptionType) {
        operationTypes.push(`  subscription: ${subscriptionType.name}`);
    }
    return printDescription(schema) + `schema {\n${operationTypes.join('\n')}\n}`;
}
function isSchemaOfCommonNames(schema) {
    const queryType = schema.getQueryType();
    if (queryType && queryType.name !== 'Query') {
        return false;
    }
    const mutationType = schema.getMutationType();
    if (mutationType && mutationType.name !== 'Mutation') {
        return false;
    }
    const subscriptionType = schema.getSubscriptionType();
    if (subscriptionType && subscriptionType.name !== 'Subscription') {
        return false;
    }
    return true;
}
function printType(type) {
    if ((0, graphql_1.isScalarType)(type)) {
        return printScalar(type);
    }
    if ((0, graphql_1.isObjectType)(type)) {
        return printObject(type);
    }
    if ((0, graphql_1.isInterfaceType)(type)) {
        return printInterface(type);
    }
    if ((0, graphql_1.isUnionType)(type)) {
        return printUnion(type);
    }
    if ((0, graphql_1.isEnumType)(type)) {
        return printEnum(type);
    }
    if ((0, graphql_1.isInputObjectType)(type)) {
        return printInputObject(type);
    }
    throw Error('Unexpected type: ' + type.toString());
}
exports.printType = printType;
function printScalar(type) {
    return (printDescription(type) + `scalar ${type.name}` + printSpecifiedByURL(type));
}
function printImplementedInterfaces(type) {
    const interfaces = type.getInterfaces();
    return interfaces.length
        ? ' implements ' + interfaces.map((i) => i.name).join(' & ')
        : '';
}
function printObject(type) {
    const isExtension = type.extensionASTNodes && type.astNode && !type.astNode.fields;
    return (printDescription(type) +
        (isExtension ? 'extend ' : '') +
        `type ${type.name}` +
        printImplementedInterfaces(type) +
        printFederationDirectives(type) +
        printKnownDirectiveUsagesOnTypeOrField(type) +
        printFields(type));
}
function printInterface(type) {
    const isExtension = type.extensionASTNodes && type.astNode && !type.astNode.fields;
    return (printDescription(type) +
        (isExtension ? 'extend ' : '') +
        `interface ${type.name}` +
        printImplementedInterfaces(type) +
        printFederationDirectives(type) +
        printKnownDirectiveUsagesOnTypeOrField(type) +
        printFields(type));
}
function printUnion(type) {
    const types = type.getTypes();
    const possibleTypes = types.length ? ' = ' + types.join(' | ') : '';
    return (printDescription(type) +
        'union ' +
        type.name +
        printKnownDirectiveUsagesOnTypeOrField(type) +
        possibleTypes);
}
function printEnum(type) {
    const values = type
        .getValues()
        .map((value, i) => printDescription(value, '  ', !i) +
        '  ' +
        value.name +
        printDeprecated(value.deprecationReason));
    return printDescription(type) + `enum ${type.name}` + printBlock(values);
}
function printInputObject(type) {
    const fields = Object.values(type.getFields()).map((f, i) => printDescription(f, '  ', !i) + '  ' + printInputValue(f));
    return printDescription(type) + `input ${type.name}` + printBlock(fields);
}
function printFields(type) {
    const fields = Object.values(type.getFields()).map((f, i) => printDescription(f, '  ', !i) +
        '  ' +
        f.name +
        printArgs(f.args, '  ') +
        ': ' +
        String(f.type) +
        printDeprecated(f.deprecationReason) +
        printFederationDirectives(f) +
        printKnownDirectiveUsagesOnTypeOrField(f));
    return printBlock(fields);
}
function printFederationDirectives(typeOrField) {
    if (!typeOrField.astNode)
        return '';
    if ((0, graphql_1.isInputObjectType)(typeOrField))
        return '';
    const federationDirectivesOnTypeOrField = (0, directives_1.gatherDirectives)(typeOrField)
        .filter((n) => directives_1.federationDirectives.some((fedDir) => fedDir.name === n.name.value))
        .map(graphql_1.print);
    const dedupedDirectives = [...new Set(federationDirectivesOnTypeOrField)];
    return dedupedDirectives.length > 0 ? ' ' + dedupedDirectives.join(' ') : '';
}
function printKnownDirectiveUsagesOnTypeOrField(typeOrField) {
    if (!typeOrField.astNode)
        return '';
    if ((0, graphql_1.isInputObjectType)(typeOrField))
        return '';
    const knownSubgraphDirectivesOnTypeOrField = (0, directives_1.gatherDirectives)(typeOrField)
        .filter((n) => directives_1.otherKnownDirectives.some((directive) => directive.name === n.name.value))
        .map(graphql_1.print);
    return knownSubgraphDirectivesOnTypeOrField.length > 0
        ? ' ' + knownSubgraphDirectivesOnTypeOrField.join(' ')
        : '';
}
function printBlock(items) {
    return items.length !== 0 ? ' {\n' + items.join('\n') + '\n}' : '';
}
function printArgs(args, indentation = '') {
    if (args.length === 0) {
        return '';
    }
    if (args.every((arg) => !arg.description)) {
        return '(' + args.map(printInputValue).join(', ') + ')';
    }
    return ('(\n' +
        args
            .map((arg, i) => printDescription(arg, '  ' + indentation, !i) +
            '  ' +
            indentation +
            printInputValue(arg))
            .join('\n') +
        '\n' +
        indentation +
        ')');
}
function printInputValue(arg) {
    const defaultAST = (0, graphql_1.astFromValue)(arg.defaultValue, arg.type);
    let argDecl = arg.name + ': ' + String(arg.type);
    if (defaultAST) {
        argDecl += ` = ${(0, graphql_1.print)(defaultAST)}`;
    }
    return argDecl + printDeprecated(arg.deprecationReason);
}
function printDirective(directive) {
    return (printDescription(directive) +
        'directive @' +
        directive.name +
        printArgs(directive.args) +
        (directive.isRepeatable ? ' repeatable' : '') +
        ' on ' +
        directive.locations.join(' | '));
}
function printDeprecated(reason) {
    if (reason == null) {
        return '';
    }
    if (reason !== graphql_1.DEFAULT_DEPRECATION_REASON) {
        const astValue = (0, graphql_1.print)({ kind: graphql_1.Kind.STRING, value: reason });
        return ` @deprecated(reason: ${astValue})`;
    }
    return ' @deprecated';
}
function printSpecifiedByURL(scalar) {
    var _a;
    const value = (_a = scalar.specifiedByUrl) !== null && _a !== void 0 ? _a : scalar.specifiedByURL;
    if (value == null) {
        return '';
    }
    const astValue = (0, graphql_1.print)({
        kind: graphql_1.Kind.STRING,
        value,
    });
    return ` @specifiedBy(url: ${astValue})`;
}
function printDescription(def, indentation = '', firstInBlock = true) {
    const { description } = def;
    if (description == null) {
        return '';
    }
    const preferMultipleLines = description.length > 70;
    const blockString = printBlockString(description, preferMultipleLines);
    const prefix = indentation && !firstInBlock ? '\n' + indentation : indentation;
    return prefix + blockString.replace(/\n/g, '\n' + indentation) + '\n';
}
function printBlockString(value, preferMultipleLines = false) {
    const isSingleLine = !value.includes('\n');
    const hasLeadingSpace = value[0] === ' ' || value[0] === '\t';
    const hasTrailingQuote = value[value.length - 1] === '"';
    const hasTrailingSlash = value[value.length - 1] === '\\';
    const printAsMultipleLines = !isSingleLine ||
        hasTrailingQuote ||
        hasTrailingSlash ||
        preferMultipleLines;
    let result = '';
    if (printAsMultipleLines && !(isSingleLine && hasLeadingSpace)) {
        result += '\n';
    }
    result += value;
    if (printAsMultipleLines) {
        result += '\n';
    }
    return '"""' + result.replace(/"""/g, '\\"""') + '"""';
}
exports.printBlockString = printBlockString;
//# sourceMappingURL=printSubgraphSchema.js.map