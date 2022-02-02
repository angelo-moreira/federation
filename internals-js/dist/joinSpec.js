"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOIN_VERSIONS = exports.JoinSpecDefinition = exports.joinIdentity = void 0;
const graphql_1 = require("graphql");
const coreSpec_1 = require("./coreSpec");
const definitions_1 = require("./definitions");
const utils_1 = require("./utils");
exports.joinIdentity = 'https://specs.apollo.dev/join';
function sanitizeGraphQLName(name) {
    const alphaNumericUnderscoreOnly = name.replace(/[\W]/g, '_');
    const noNumericFirstChar = alphaNumericUnderscoreOnly.match(/^\d/)
        ? '_' + alphaNumericUnderscoreOnly
        : alphaNumericUnderscoreOnly;
    const noUnderscoreNumericEnding = noNumericFirstChar.match(/_\d+$/)
        ? noNumericFirstChar + '_'
        : noNumericFirstChar;
    const toUpper = noUnderscoreNumericEnding.toLocaleUpperCase();
    return toUpper;
}
class JoinSpecDefinition extends coreSpec_1.FeatureDefinition {
    constructor(version) {
        super(new coreSpec_1.FeatureUrl(exports.joinIdentity, 'join', version));
    }
    isV01() {
        return this.version.equals(new coreSpec_1.FeatureVersion(0, 1));
    }
    addElementsToSchema(schema) {
        const joinGraph = this.addDirective(schema, 'graph').addLocations(graphql_1.DirectiveLocation.ENUM_VALUE);
        joinGraph.addArgument('name', new definitions_1.NonNullType(schema.stringType()));
        joinGraph.addArgument('url', new definitions_1.NonNullType(schema.stringType()));
        const graphEnum = this.addEnumType(schema, 'Graph');
        const joinFieldSet = this.addScalarType(schema, 'FieldSet');
        const joinType = this.addDirective(schema, 'type').addLocations(graphql_1.DirectiveLocation.OBJECT, graphql_1.DirectiveLocation.INTERFACE, graphql_1.DirectiveLocation.UNION, graphql_1.DirectiveLocation.ENUM, graphql_1.DirectiveLocation.INPUT_OBJECT, graphql_1.DirectiveLocation.SCALAR);
        if (!this.isV01()) {
            joinType.repeatable = true;
        }
        joinType.addArgument('graph', new definitions_1.NonNullType(graphEnum));
        joinType.addArgument('key', joinFieldSet);
        if (!this.isV01()) {
            joinType.addArgument('extension', new definitions_1.NonNullType(schema.booleanType()), false);
        }
        const joinField = this.addDirective(schema, 'field').addLocations(graphql_1.DirectiveLocation.FIELD_DEFINITION, graphql_1.DirectiveLocation.INPUT_FIELD_DEFINITION);
        joinField.repeatable = true;
        joinField.addArgument('graph', new definitions_1.NonNullType(graphEnum));
        joinField.addArgument('requires', joinFieldSet);
        joinField.addArgument('provides', joinFieldSet);
        if (!this.isV01()) {
            joinField.addArgument('type', schema.stringType());
            joinField.addArgument('external', schema.booleanType());
        }
        if (!this.isV01()) {
            const joinImplements = this.addDirective(schema, 'implements').addLocations(graphql_1.DirectiveLocation.OBJECT, graphql_1.DirectiveLocation.INTERFACE);
            joinImplements.repeatable = true;
            joinImplements.addArgument('graph', new definitions_1.NonNullType(graphEnum));
            joinImplements.addArgument('interface', new definitions_1.NonNullType(schema.stringType()));
        }
        if (this.isV01()) {
            const joinOwner = this.addDirective(schema, 'owner').addLocations(graphql_1.DirectiveLocation.OBJECT);
            joinOwner.addArgument('graph', new definitions_1.NonNullType(graphEnum));
        }
    }
    populateGraphEnum(schema, subgraphs) {
        const sanitizedNameToSubgraphs = new utils_1.MultiMap();
        for (const subgraph of subgraphs) {
            const sanitized = sanitizeGraphQLName(subgraph.name);
            sanitizedNameToSubgraphs.add(sanitized, subgraph);
        }
        const subgraphToEnumName = new Map();
        for (const [sanitizedName, subgraphsForName] of sanitizedNameToSubgraphs) {
            if (subgraphsForName.length === 1) {
                subgraphToEnumName.set(subgraphsForName[0].name, sanitizedName);
            }
            else {
                for (const [index, subgraph] of subgraphsForName.entries()) {
                    subgraphToEnumName.set(subgraph.name, `${sanitizedName}_${index + 1}`);
                }
            }
        }
        const graphEnum = this.graphEnum(schema);
        const graphDirective = this.graphDirective(schema);
        for (const subgraph of subgraphs) {
            const enumValue = graphEnum.addValue(subgraphToEnumName.get(subgraph.name));
            enumValue.applyDirective(graphDirective, { name: subgraph.name, url: subgraph.url });
        }
        return subgraphToEnumName;
    }
    fieldSetScalar(schema) {
        return this.type(schema, 'FieldSet');
    }
    graphEnum(schema) {
        return this.type(schema, 'Graph');
    }
    graphDirective(schema) {
        return this.directive(schema, 'graph');
    }
    typeDirective(schema) {
        return this.directive(schema, 'type');
    }
    implementsDirective(schema) {
        return this.directive(schema, 'implements');
    }
    fieldDirective(schema) {
        return this.directive(schema, 'field');
    }
    ownerDirective(schema) {
        return this.directive(schema, 'owner');
    }
}
exports.JoinSpecDefinition = JoinSpecDefinition;
exports.JOIN_VERSIONS = new coreSpec_1.FeatureDefinitions(exports.joinIdentity)
    .add(new JoinSpecDefinition(new coreSpec_1.FeatureVersion(0, 1)))
    .add(new JoinSpecDefinition(new coreSpec_1.FeatureVersion(0, 2)));
//# sourceMappingURL=joinSpec.js.map