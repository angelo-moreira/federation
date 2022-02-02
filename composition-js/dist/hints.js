"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printHint = exports.CompositionHint = exports.hintInconsistentArgumentPresence = exports.hintInconsistentDescription = exports.hintInconsistentExecutionDirectiveLocations = exports.hintInconsistentExecutionDirectiveRepeatable = exports.hintNoExecutionDirectiveLocationsIntersection = exports.hintInconsistentExecutionDirectivePresence = exports.hintInconsistentTypeSystemDirectiveLocations = exports.hintInconsistentTypeSystemDirectiveRepeatable = exports.hintInconsistentEnumValue = exports.hintInconsistentUnionMember = exports.hintInconsistentInputObjectField = exports.hintInconsistentInterfaceValueTypeField = exports.hintInconsistentObjectValueTypeField = exports.hintInconsistentEntity = exports.hintInconsistentDefaultValue = exports.hintInconsistentArgumentType = exports.hintInconsistentFieldType = exports.HintID = void 0;
const graphql_1 = require("graphql");
class HintID {
    constructor(code, description, mainElementDescription) {
        this.code = code;
        this.description = description;
        this.mainElementDescription = mainElementDescription;
    }
    toString() {
        return `${this.code}: ${this.description}`;
    }
}
exports.HintID = HintID;
exports.hintInconsistentFieldType = new HintID('InconsistentFieldType', 'Indicates that a field does not have the exact same types in all subgraphs, but that the types are "compatible"'
    + ' (2 types are compatible if one is a non-nullable version of the other, a list version, a subtype, or a'
    + ' combination of the former).', 'the field with mismatched types');
exports.hintInconsistentArgumentType = new HintID('InconsistentArgumentType', 'Indicates that an argument type (of a field/input field/directive definition) does not have the exact same types'
    + ' in all subgraphs, but that the types are "compatible" (2 types are compatible if one is a non-nullable'
    + ' version of the other, a list version, a subtype, or a combination of the former).', 'the argument with mismatched types');
exports.hintInconsistentDefaultValue = new HintID('InconsistentDefaultValuePresence', 'Indicates that an argument definition (of a field/input field/directive definition) has a default value in only'
    + ' some of the subgraphs that define the argument.', 'the argument with default values in only some subgraphs');
exports.hintInconsistentEntity = new HintID('InconsistentEntity', 'Indicates that an object is declared as an entity (has a `@key`) in only some of the subgraphs in which the object is defined', 'the object that is an entity in only some subgraphs');
exports.hintInconsistentObjectValueTypeField = new HintID('InconsistentObjectValueTypeField', 'Indicates that a field of an object "value type" (has no `@key` in any subgraph) is not defined in all the subgraphs that declare the type', 'the field that is inconsistently declared between subgraphs');
exports.hintInconsistentInterfaceValueTypeField = new HintID('InconsistentInterfaceValueTypeField', 'Indicates that a field of an interface "value type" (has no  `@key` in any subgraph) is not defined in all the subgraphs that declare the type', 'the field that is inconsistently declared between subgraphs');
exports.hintInconsistentInputObjectField = new HintID('InconsistentInputObjectField', 'Indicates that a field of an input object type definition is only defined in a subset of the subgraphs that declare the input object', 'the field that is inconsistently declared between subgraphs');
exports.hintInconsistentUnionMember = new HintID('InconsistentUnionMember', 'Indicates that a member of a union type definition is only defined in a subset of the subgraphs that declare the union', 'the union type which has an inconsistent member');
exports.hintInconsistentEnumValue = new HintID('InconsistentEnumValue', 'Indicates that a value of an enum type definition is defined in only a subset of the subgraphs that declare the enum', 'the union type which has an inconsistent member');
exports.hintInconsistentTypeSystemDirectiveRepeatable = new HintID('InconsistentTypeSystemDirectiveRepeatable', 'Indicates that a type system directive definition is marked repeatable in only a subset of the subgraphs that declare the directive (and will be repeatable in the supergraph)', 'the inconsistent directive');
exports.hintInconsistentTypeSystemDirectiveLocations = new HintID('InconsistentTypeSystemDirectiveLocations', 'Indicates that a type system directive definition is declared with inconsistent locations across subgraphs (and will use the union of all locations in the supergraph)', 'the inconsistent directive');
exports.hintInconsistentExecutionDirectivePresence = new HintID('InconsistentExecutionDirectivePresence', 'Indicates that an execution directive definition is declared in only some of the subgraphs', 'the inconsistent directive');
exports.hintNoExecutionDirectiveLocationsIntersection = new HintID('NoExecutionDirectiveIntersection', 'Indicates that, for an execution directive definition, no location for it appears in all subgraphs', 'the inconsistent directive');
exports.hintInconsistentExecutionDirectiveRepeatable = new HintID('InconsistentExecutionDirectiveRepeatable', 'Indicates that an execution directive definition is marked repeatable in only a subset of the subgraphs (and will not be repeatable in the supergraph)', 'the inconsistent directive');
exports.hintInconsistentExecutionDirectiveLocations = new HintID('InconsistentExecutionDirectiveLocations', 'Indicates that an execution directive definition is declared with inconsistent locations across subgraphs (and will use the intersection of all locations in the supergraph)', 'the inconsistent directive');
exports.hintInconsistentDescription = new HintID('InconsistentDescription', 'Indicates that an element has a description in more than one subgraph, and the descriptions are not equal', 'the element with inconsistent description');
exports.hintInconsistentArgumentPresence = new HintID('InconsistentArgumentPresence', 'Indicates that an argument of an execution directive definition is not present in all subgraphs '
    + 'and will not be part of the supergraph', 'the argument with mismatched types');
class CompositionHint {
    constructor(id, message, elementCoordinate, nodes) {
        this.id = id;
        this.message = message;
        this.elementCoordinate = elementCoordinate;
        this.nodes = nodes
            ? (Array.isArray(nodes) ? (nodes.length === 0 ? undefined : nodes) : [nodes])
            : undefined;
    }
    toString() {
        return `[${this.id.code}]: ${this.message}`;
    }
}
exports.CompositionHint = CompositionHint;
function printHint(hint) {
    let output = hint.toString();
    if (hint.nodes) {
        for (const node of hint.nodes) {
            if (node.loc) {
                output += '\n\n' + (0, graphql_1.printLocation)(node.loc);
            }
        }
    }
    return output;
}
exports.printHint = printHint;
//# sourceMappingURL=hints.js.map