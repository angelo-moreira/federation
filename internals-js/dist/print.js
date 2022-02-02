"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printDirectiveDefinition = exports.printTypeDefinitionAndExtensions = exports.printType = exports.printSchema = exports.orderPrintedDefinitions = exports.defaultPrintOptions = void 0;
const utils_1 = require("./utils");
const values_1 = require("./values");
exports.defaultPrintOptions = {
    indentString: "  ",
    definitionsOrder: ['schema', 'directives', 'types'],
    rootTypesOrder: ['query', 'mutation', 'subscription'],
    mergeTypesAndExtensions: false,
    showAllBuiltIns: false,
    showNonGraphQLBuiltIns: false,
    noDescriptions: false,
};
function orderPrintedDefinitions(options) {
    return {
        ...options,
        typeCompareFn: (t1, t2) => t1.name.localeCompare(t2.name),
        directiveCompareFn: (t1, t2) => t1.name.localeCompare(t2.name),
    };
}
exports.orderPrintedDefinitions = orderPrintedDefinitions;
function isDefinitionOrderValid(options) {
    return options.definitionsOrder.length === 3
        && options.definitionsOrder.indexOf('schema') >= 0
        && options.definitionsOrder.indexOf('types') >= 0
        && options.definitionsOrder.indexOf('directives') >= 0;
}
function validateOptions(options) {
    if (!isDefinitionOrderValid(options)) {
        throw new Error(`'definitionsOrder' should be a 3-element array containing 'schema', 'types' and 'directives' in the desired order (got: [${options.definitionsOrder.join(', ')}])`);
    }
}
function printSchema(schema, options = exports.defaultPrintOptions) {
    validateOptions(options);
    let directives = options.showAllBuiltIns ? schema.allDirectives() : schema.directives(options.showNonGraphQLBuiltIns);
    if (options.directiveCompareFn) {
        directives = directives.concat().sort(options.directiveCompareFn);
    }
    let types = options.showAllBuiltIns ? schema.allTypes() : schema.types(undefined, options.showNonGraphQLBuiltIns);
    if (options.typeCompareFn) {
        types = types.concat().sort(options.typeCompareFn);
    }
    const definitions = new Array(3);
    definitions[options.definitionsOrder.indexOf('schema')] = printSchemaDefinitionAndExtensions(schema.schemaDefinition, options);
    definitions[options.definitionsOrder.indexOf('directives')] = directives.map(directive => printDirectiveDefinition(directive, options));
    definitions[options.definitionsOrder.indexOf('types')] = types.flatMap(type => printTypeDefinitionAndExtensions(type, options));
    return definitions.flat().join('\n\n');
}
exports.printSchema = printSchema;
function definitionAndExtensions(element, options) {
    return options.mergeTypesAndExtensions ? [undefined] : [null, ...element.extensions()];
}
function printSchemaDefinitionAndExtensions(schemaDefinition, options) {
    if (isSchemaOfCommonNames(schemaDefinition)) {
        return [];
    }
    return printDefinitionAndExtensions(schemaDefinition, options, printSchemaDefinitionOrExtension);
}
function printDefinitionAndExtensions(t, options, printer) {
    return definitionAndExtensions(t, options)
        .map(ext => printer(t, options, ext))
        .filter(v => v !== undefined);
}
function printIsExtension(extension) {
    return extension ? 'extend ' : '';
}
function forExtension(ts, extension) {
    if (extension === undefined) {
        return ts;
    }
    return ts.filter(r => { var _a; return ((_a = r.ofExtension()) !== null && _a !== void 0 ? _a : null) === extension; });
}
function orderRoots(roots, options) {
    return roots.concat().sort((r1, r2) => options.rootTypesOrder.indexOf(r1.rootKind) - options.rootTypesOrder.indexOf(r2.rootKind));
}
function printSchemaDefinitionOrExtension(schemaDefinition, options, extension) {
    const roots = forExtension(schemaDefinition.roots(), extension);
    const directives = forExtension(schemaDefinition.appliedDirectives, extension);
    if (!roots.length && !directives.length) {
        return undefined;
    }
    const rootEntries = orderRoots(roots, options).map((rootType) => `${options.indentString}${rootType.rootKind}: ${rootType.type}`);
    return printDescription(schemaDefinition, options)
        + printIsExtension(extension)
        + 'schema'
        + printAppliedDirectives(directives, options, true)
        + (directives.length === 0 ? ' ' : '')
        + '{\n' + rootEntries.join('\n') + '\n}';
}
function isSchemaOfCommonNames(schema) {
    return schema.appliedDirectives.length === 0 && !schema.description && schema.roots().every(r => r.isDefaultRootName());
}
function printType(type, options = exports.defaultPrintOptions) {
    const definitionAndExtensions = printTypeDefinitionAndExtensions(type, options);
    (0, utils_1.assert)(definitionAndExtensions.length == 1, `Type ${type} is built from more than 1 definition or extension`);
    return definitionAndExtensions[0];
}
exports.printType = printType;
function printTypeDefinitionAndExtensions(type, options = exports.defaultPrintOptions) {
    switch (type.kind) {
        case 'ScalarType': return printDefinitionAndExtensions(type, options, printScalarDefinitionOrExtension);
        case 'ObjectType': return printDefinitionAndExtensions(type, options, (t, options, ext) => printFieldBasedTypeDefinitionOrExtension('type', t, options, ext));
        case 'InterfaceType': return printDefinitionAndExtensions(type, options, (t, options, ext) => printFieldBasedTypeDefinitionOrExtension('interface', t, options, ext));
        case 'UnionType': return printDefinitionAndExtensions(type, options, printUnionDefinitionOrExtension);
        case 'EnumType': return printDefinitionAndExtensions(type, options, printEnumDefinitionOrExtension);
        case 'InputObjectType': return printDefinitionAndExtensions(type, options, printInputDefinitionOrExtension);
    }
}
exports.printTypeDefinitionAndExtensions = printTypeDefinitionAndExtensions;
function printDirectiveDefinition(directive, options) {
    const locations = directive.locations.join(' | ');
    return `${printDescription(directive, options)}directive ${directive}${printArgs(directive.arguments(), options)}${directive.repeatable ? ' repeatable' : ''} on ${locations}`;
}
exports.printDirectiveDefinition = printDirectiveDefinition;
function printAppliedDirectives(appliedDirectives, options, onNewLines = false, endWithNewLine = onNewLines) {
    if (appliedDirectives.length == 0) {
        return "";
    }
    const joinStr = onNewLines ? '\n' + options.indentString : ' ';
    const directives = appliedDirectives.map(d => d.toString()).join(joinStr);
    return onNewLines ? '\n' + options.indentString + directives + (endWithNewLine ? '\n' : '') : ' ' + directives;
}
function printDescription(element, options, indentation = '', firstInBlock = true) {
    if (element.description === undefined || options.noDescriptions) {
        return '';
    }
    const preferMultipleLines = element.description.length > 70;
    const blockString = printBlockString(element.description, '', preferMultipleLines);
    const prefix = indentation && !firstInBlock ? '\n' + indentation : indentation;
    return prefix + blockString.replace(/\n/g, '\n' + indentation) + '\n';
}
function printScalarDefinitionOrExtension(type, options, extension) {
    const directives = forExtension(type.appliedDirectives, extension);
    if (extension && !directives.length) {
        return undefined;
    }
    return `${printDescription(type, options)}${printIsExtension(extension)}scalar ${type.name}${printAppliedDirectives(directives, options, true, false)}`;
}
function printImplementedInterfaces(implementations) {
    return implementations.length
        ? ' implements ' + implementations.map(i => i.interface.name).join(' & ')
        : '';
}
function printFieldBasedTypeDefinitionOrExtension(kind, type, options, extension) {
    const directives = forExtension(type.appliedDirectives, extension);
    const interfaces = forExtension(type.interfaceImplementations(), extension);
    const fields = forExtension(type.fields(options.showNonGraphQLBuiltIns), extension);
    if (!directives.length && !interfaces.length && !fields.length) {
        return undefined;
    }
    return printDescription(type, options)
        + printIsExtension(extension)
        + kind + ' ' + type
        + printImplementedInterfaces(interfaces)
        + printAppliedDirectives(directives, options, true, fields.length > 0)
        + (directives.length === 0 ? ' ' : '')
        + printFields(fields, options);
}
function printUnionDefinitionOrExtension(type, options, extension) {
    const directives = forExtension(type.appliedDirectives, extension);
    const members = forExtension(type.members(), extension);
    if (!directives.length && !members.length) {
        return undefined;
    }
    const possibleTypes = members.length ? ' = ' + members.map(m => m.type).join(' | ') : '';
    return printDescription(type, options)
        + printIsExtension(extension)
        + 'union ' + type
        + printAppliedDirectives(directives, options, true, members.length > 0)
        + possibleTypes;
}
function printEnumDefinitionOrExtension(type, options, extension) {
    const directives = forExtension(type.appliedDirectives, extension);
    const values = forExtension(type.values, extension);
    if (!directives.length && !values.length) {
        return undefined;
    }
    const vals = values.map((v, i) => printDescription(v, options, options.indentString, !i)
        + options.indentString
        + v
        + printAppliedDirectives(v.appliedDirectives, options));
    return printDescription(type, options)
        + printIsExtension(extension)
        + 'enum ' + type
        + printAppliedDirectives(directives, options, true, vals.length > 0)
        + (directives.length === 0 ? ' ' : '')
        + printBlock(vals);
}
function printInputDefinitionOrExtension(type, options, extension) {
    const directives = forExtension(type.appliedDirectives, extension);
    const fields = forExtension(type.fields(), extension);
    if (!directives.length && !fields.length) {
        return undefined;
    }
    return printDescription(type, options)
        + printIsExtension(extension)
        + 'input ' + type
        + printAppliedDirectives(directives, options, true, fields.length > 0)
        + (directives.length === 0 ? ' ' : '')
        + printFields(fields, options);
}
function printFields(fields, options) {
    return printBlock(fields.map((f, i) => printDescription(f, options, options.indentString, !i)
        + options.indentString
        + printField(f, options)
        + printAppliedDirectives(f.appliedDirectives, options)));
}
function printField(field, options) {
    const args = field.kind == 'FieldDefinition' ? printArgs(field.arguments(), options, options.indentString) : '';
    const defaultValue = field.kind === 'InputFieldDefinition' && field.defaultValue !== undefined
        ? ' = ' + (0, values_1.valueToString)(field.defaultValue, field.type)
        : '';
    return `${field.name}${args}: ${field.type}${defaultValue}`;
}
function printArgs(args, options, indentation = '') {
    if (args.length === 0) {
        return '';
    }
    if (args.every(arg => !arg.description)) {
        return '(' + args.map(arg => printArg(arg, options)).join(', ') + ')';
    }
    const formattedArgs = args
        .map((arg, i) => printDescription(arg, options, '  ' + indentation, !i) + '  ' + indentation + printArg(arg, options))
        .join('\n');
    return `(\n${formattedArgs}\n${indentation})`;
}
function printArg(arg, options) {
    return `${arg}${printAppliedDirectives(arg.appliedDirectives, options)}`;
}
function printBlock(items) {
    return items.length !== 0 ? '{\n' + items.join('\n') + '\n}' : '';
}
function printBlockString(value, indentation = '', preferMultipleLines = false) {
    const isSingleLine = value.indexOf('\n') === -1;
    const hasLeadingSpace = value[0] === ' ' || value[0] === '\t';
    const hasTrailingQuote = value[value.length - 1] === '"';
    const hasTrailingSlash = value[value.length - 1] === '\\';
    const printAsMultipleLines = !isSingleLine ||
        hasTrailingQuote ||
        hasTrailingSlash ||
        preferMultipleLines;
    let result = '';
    if (printAsMultipleLines && !(isSingleLine && hasLeadingSpace)) {
        result += '\n' + indentation;
    }
    result += indentation ? value.replace(/\n/g, '\n' + indentation) : value;
    if (printAsMultipleLines) {
        result += '\n';
    }
    return '"""' + result.replace(/"""/g, '\\"""') + '"""';
}
//# sourceMappingURL=print.js.map