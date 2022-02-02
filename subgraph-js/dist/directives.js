"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.directiveDefinitionsAreCompatible = exports.typeIncludesDirective = exports.gatherDirectives = exports.isKnownSubgraphDirective = exports.knownSubgraphDirectives = exports.otherKnownDirectives = exports.isFederationDirective = exports.federationDirectives = exports.TagDirective = exports.ProvidesDirective = exports.RequiresDirective = exports.ExternalDirective = exports.ExtendsDirective = exports.KeyDirective = void 0;
const graphql_1 = require("graphql");
exports.KeyDirective = new graphql_1.GraphQLDirective({
    name: 'key',
    locations: [graphql_1.DirectiveLocation.OBJECT, graphql_1.DirectiveLocation.INTERFACE],
    args: {
        fields: {
            type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
        },
    },
});
exports.ExtendsDirective = new graphql_1.GraphQLDirective({
    name: 'extends',
    locations: [graphql_1.DirectiveLocation.OBJECT, graphql_1.DirectiveLocation.INTERFACE],
});
exports.ExternalDirective = new graphql_1.GraphQLDirective({
    name: 'external',
    locations: [graphql_1.DirectiveLocation.OBJECT, graphql_1.DirectiveLocation.FIELD_DEFINITION],
});
exports.RequiresDirective = new graphql_1.GraphQLDirective({
    name: 'requires',
    locations: [graphql_1.DirectiveLocation.FIELD_DEFINITION],
    args: {
        fields: {
            type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
        },
    },
});
exports.ProvidesDirective = new graphql_1.GraphQLDirective({
    name: 'provides',
    locations: [graphql_1.DirectiveLocation.FIELD_DEFINITION],
    args: {
        fields: {
            type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
        },
    },
});
exports.TagDirective = new graphql_1.GraphQLDirective({
    name: 'tag',
    locations: [
        graphql_1.DirectiveLocation.FIELD_DEFINITION,
        graphql_1.DirectiveLocation.OBJECT,
        graphql_1.DirectiveLocation.INTERFACE,
        graphql_1.DirectiveLocation.UNION,
    ],
    isRepeatable: true,
    args: {
        name: {
            type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
        },
    },
});
exports.federationDirectives = [
    exports.KeyDirective,
    exports.ExtendsDirective,
    exports.ExternalDirective,
    exports.RequiresDirective,
    exports.ProvidesDirective,
];
function isFederationDirective(directive) {
    return exports.federationDirectives.some(({ name }) => name === directive.name);
}
exports.isFederationDirective = isFederationDirective;
exports.otherKnownDirectives = [exports.TagDirective];
exports.knownSubgraphDirectives = [
    ...exports.federationDirectives,
    ...exports.otherKnownDirectives,
];
function isKnownSubgraphDirective(directive) {
    return exports.knownSubgraphDirectives.some(({ name }) => name === directive.name);
}
exports.isKnownSubgraphDirective = isKnownSubgraphDirective;
function hasDirectives(node) {
    return Boolean('directives' in node && node.directives);
}
function gatherDirectives(type) {
    let directives = [];
    if ('extensionASTNodes' in type && type.extensionASTNodes) {
        for (const node of type.extensionASTNodes) {
            if (hasDirectives(node)) {
                directives = directives.concat(node.directives);
            }
        }
    }
    if (type.astNode && hasDirectives(type.astNode))
        directives = directives.concat(type.astNode.directives);
    return directives;
}
exports.gatherDirectives = gatherDirectives;
function typeIncludesDirective(type, directiveName) {
    if ((0, graphql_1.isInputObjectType)(type))
        return false;
    const directives = gatherDirectives(type);
    return directives.some((directive) => directive.name.value === directiveName);
}
exports.typeIncludesDirective = typeIncludesDirective;
function directiveDefinitionsAreCompatible(baseDefinition, toCompare) {
    var _a, _b, _c, _d;
    if (baseDefinition.name.value !== toCompare.name.value)
        return false;
    if (((_a = baseDefinition.arguments) === null || _a === void 0 ? void 0 : _a.length) !== ((_b = toCompare.arguments) === null || _b === void 0 ? void 0 : _b.length)) {
        return false;
    }
    for (const arg of (_c = baseDefinition.arguments) !== null && _c !== void 0 ? _c : []) {
        const toCompareArg = (_d = toCompare.arguments) === null || _d === void 0 ? void 0 : _d.find((a) => a.name.value === arg.name.value);
        if (!toCompareArg)
            return false;
        if ((0, graphql_1.print)(stripDescriptions(arg)) !== (0, graphql_1.print)(stripDescriptions(toCompareArg))) {
            return false;
        }
    }
    if (toCompare.locations.some((location) => !baseDefinition.locations.find((baseLocation) => baseLocation.value === location.value))) {
        return false;
    }
    return true;
}
exports.directiveDefinitionsAreCompatible = directiveDefinitionsAreCompatible;
function stripDescriptions(astNode) {
    return (0, graphql_1.visit)(astNode, {
        enter(node) {
            return 'description' in node ? { ...node, description: undefined } : node;
        },
    });
}
//# sourceMappingURL=directives.js.map