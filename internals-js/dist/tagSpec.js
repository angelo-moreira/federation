"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TAG_VERSIONS = exports.TagSpecDefinition = exports.tagLocations = exports.tagIdentity = void 0;
const graphql_1 = require("graphql");
const coreSpec_1 = require("./coreSpec");
const definitions_1 = require("./definitions");
const error_1 = require("./error");
const types_1 = require("./types");
const utils_1 = require("./utils");
exports.tagIdentity = 'https://specs.apollo.dev/tag';
exports.tagLocations = [
    graphql_1.DirectiveLocation.FIELD_DEFINITION,
    graphql_1.DirectiveLocation.OBJECT,
    graphql_1.DirectiveLocation.INTERFACE,
    graphql_1.DirectiveLocation.UNION,
];
const printedTagDefinition = 'directive @tag(name: String!) repeatable on FIELD_DEFINITION | INTERFACE | OBJECT | UNION';
class TagSpecDefinition extends coreSpec_1.FeatureDefinition {
    constructor(version) {
        super(new coreSpec_1.FeatureUrl(exports.tagIdentity, 'tag', version));
    }
    addElementsToSchema(schema) {
        const directive = this.addDirective(schema, 'tag').addLocations(...exports.tagLocations);
        directive.addArgument("name", new definitions_1.NonNullType(schema.stringType()));
    }
    tagDirective(schema) {
        return this.directive(schema, 'tag');
    }
    checkCompatibleDirective(definition) {
        (0, utils_1.assert)(definition.name === 'tag', () => `This method should not have been called on directive named ${definition.name}`);
        const hasUnknownArguments = Object.keys(definition.arguments()).length > 1;
        const nameArg = definition.argument('name');
        const hasValidNameArg = nameArg && (0, types_1.sameType)(nameArg.type, new definitions_1.NonNullType(definition.schema().stringType()));
        const hasValidLocations = definition.locations.every(loc => exports.tagLocations.includes(loc));
        if (hasUnknownArguments || !hasValidNameArg || !hasValidLocations) {
            return error_1.ERRORS.TAG_DEFINITION_INVALID.err({
                message: `Found invalid @tag directive definition. Please ensure the directive definition in your schema's definitions matches the following:\n\t${printedTagDefinition}`,
            });
        }
        return undefined;
    }
}
exports.TagSpecDefinition = TagSpecDefinition;
exports.TAG_VERSIONS = new coreSpec_1.FeatureDefinitions(exports.tagIdentity)
    .add(new TagSpecDefinition(new coreSpec_1.FeatureVersion(0, 1)));
//# sourceMappingURL=tagSpec.js.map