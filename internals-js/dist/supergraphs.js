"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFed1Supergraph = exports.validateSupergraph = exports.buildSupergraphSchema = exports.ErrForUnsupported = exports.ErrUnsupportedFeature = void 0;
const graphql_1 = require("graphql");
const core_schema_1 = require("@apollo/core-schema");
const coreSpec_1 = require("./coreSpec");
const definitions_1 = require("./definitions");
const joinSpec_1 = require("./joinSpec");
const buildSchema_1 = require("./buildSchema");
const extractSubgraphsFromSupergraph_1 = require("./extractSubgraphsFromSupergraph");
const SUPPORTED_FEATURES = new Set([
    'https://specs.apollo.dev/core/v0.1',
    'https://specs.apollo.dev/core/v0.2',
    'https://specs.apollo.dev/join/v0.1',
    'https://specs.apollo.dev/join/v0.2',
    'https://specs.apollo.dev/tag/v0.1',
    'https://specs.apollo.dev/inaccessible/v0.1',
]);
function ErrUnsupportedFeature(feature) {
    return (0, core_schema_1.err)('UnsupportedFeature', {
        message: `feature ${feature.url} is for: ${feature.purpose} but is unsupported`,
        feature,
        nodes: feature.directive.sourceAST,
    });
}
exports.ErrUnsupportedFeature = ErrUnsupportedFeature;
function ErrForUnsupported(core, ...features) {
    return (0, core_schema_1.err)('ForUnsupported', {
        message: `the \`for:\` argument is unsupported by version ${core.url.version} ` +
            `of the core spec. Please upgrade to at least @core v0.2 (https://specs.apollo.dev/core/v0.2).`,
        features,
        nodes: [core.directive.sourceAST, ...features.map(f => f.directive.sourceAST)].filter(n => !!n)
    });
}
exports.ErrForUnsupported = ErrForUnsupported;
const coreVersionZeroDotOneUrl = coreSpec_1.FeatureUrl.parse('https://specs.apollo.dev/core/v0.1');
function buildSupergraphSchema(supergraphSdl) {
    const schema = typeof supergraphSdl === 'string'
        ? (0, buildSchema_1.buildSchema)(supergraphSdl, definitions_1.graphQLBuiltIns, false)
        : (0, buildSchema_1.buildSchemaFromAST)(supergraphSdl, definitions_1.graphQLBuiltIns, false);
    const [coreFeatures] = validateSupergraph(schema);
    checkFeatureSupport(coreFeatures);
    schema.validate();
    return [schema, (0, extractSubgraphsFromSupergraph_1.extractSubgraphsNamesAndUrlsFromSupergraph)(schema)];
}
exports.buildSupergraphSchema = buildSupergraphSchema;
function checkFeatureSupport(coreFeatures) {
    const errors = [];
    if (coreFeatures.coreItself.url.equals(coreVersionZeroDotOneUrl)) {
        const purposefulFeatures = [...coreFeatures.allFeatures()].filter(f => f.purpose);
        if (purposefulFeatures.length > 0) {
            errors.push(ErrForUnsupported(coreFeatures.coreItself, ...purposefulFeatures));
        }
    }
    for (const feature of coreFeatures.allFeatures()) {
        if (feature.url.equals(coreVersionZeroDotOneUrl) || feature.purpose === 'EXECUTION' || feature.purpose === 'SECURITY') {
            if (!SUPPORTED_FEATURES.has(feature.url.base.toString())) {
                errors.push(ErrUnsupportedFeature(feature));
            }
        }
    }
    if (errors.length > 0) {
        throw (0, coreSpec_1.ErrCoreCheckFailed)(errors);
    }
}
function validateSupergraph(supergraph) {
    const coreFeatures = supergraph.coreFeatures;
    if (!coreFeatures) {
        throw new graphql_1.GraphQLError("Invalid supergraph: must be a core schema");
    }
    const joinFeature = coreFeatures.getByIdentity(joinSpec_1.joinIdentity);
    if (!joinFeature) {
        throw new graphql_1.GraphQLError("Invalid supergraph: must use the join spec");
    }
    const joinSpec = joinSpec_1.JOIN_VERSIONS.find(joinFeature.url.version);
    if (!joinSpec) {
        throw new graphql_1.GraphQLError(`Invalid supergraph: uses unsupported join spec version ${joinFeature.url.version} (supported versions: ${joinSpec_1.JOIN_VERSIONS.versions().join(', ')})`);
    }
    return [coreFeatures, joinSpec];
}
exports.validateSupergraph = validateSupergraph;
function isFed1Supergraph(supergraph) {
    return validateSupergraph(supergraph)[1].version.equals(new coreSpec_1.FeatureVersion(0, 1));
}
exports.isFed1Supergraph = isFed1Supergraph;
//# sourceMappingURL=supergraphs.js.map