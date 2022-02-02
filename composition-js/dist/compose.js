"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeServices = exports.compose = void 0;
const federation_internals_1 = require("@apollo/federation-internals");
const query_graphs_1 = require("@apollo/query-graphs");
const merging_1 = require("./merging");
const validate_1 = require("./validate");
function compose(subgraphs) {
    const mergeResult = (0, merging_1.mergeSubgraphs)(subgraphs);
    if (mergeResult.errors) {
        return { errors: mergeResult.errors };
    }
    const supergraphSchema = mergeResult.supergraph;
    const supergraphQueryGraph = (0, query_graphs_1.buildSupergraphAPIQueryGraph)(supergraphSchema);
    const federatedQueryGraph = (0, query_graphs_1.buildFederatedQueryGraph)(supergraphSchema, false);
    const validationResult = (0, validate_1.validateGraphComposition)(supergraphQueryGraph, federatedQueryGraph);
    if (validationResult.errors) {
        return { errors: validationResult.errors.map(e => federation_internals_1.ERRORS.SATISFIABILITY_ERROR.err({ message: e.message })) };
    }
    let supergraphSdl;
    try {
        supergraphSdl = (0, federation_internals_1.printSchema)(supergraphSchema, (0, federation_internals_1.orderPrintedDefinitions)(federation_internals_1.defaultPrintOptions));
    }
    catch (err) {
        return { errors: [err] };
    }
    return {
        schema: supergraphSchema,
        supergraphSdl,
        hints: mergeResult.hints
    };
}
exports.compose = compose;
function composeServices(services) {
    const subgraphs = (0, federation_internals_1.subgraphsFromServiceList)(services);
    if (Array.isArray(subgraphs)) {
        return { errors: subgraphs };
    }
    return compose(subgraphs);
}
exports.composeServices = composeServices;
//# sourceMappingURL=compose.js.map