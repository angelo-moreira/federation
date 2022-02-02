"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnownTypeNamesInFederationRule = void 0;
const graphql_1 = require("graphql");
const federation_1 = require("../federation");
const suggestions_1 = require("../suggestions");
function KnownTypeNamesInFederationRule(context) {
    const schema = context.getSchema();
    const existingTypesMap = schema ? schema.getTypeMap() : Object.create(null);
    const definedTypes = Object.create(null);
    for (const def of context.getDocument().definitions) {
        if ((0, graphql_1.isTypeDefinitionNode)(def) || (0, graphql_1.isTypeExtensionNode)(def)) {
            definedTypes[def.name.value] = true;
        }
    }
    const typeNames = Object.keys(existingTypesMap).concat(Object.keys(definedTypes));
    return {
        NamedType(node, _1, parent, _2, ancestors) {
            var _a;
            const typeName = node.name.value;
            if (!existingTypesMap[typeName] && !definedTypes[typeName]) {
                const definitionNode = (_a = ancestors[2]) !== null && _a !== void 0 ? _a : parent;
                const isSDL = definitionNode != null && isSDLNode(definitionNode);
                if (isSDL && isStandardTypeName(typeName)) {
                    return;
                }
                const suggestedTypes = (0, suggestions_1.suggestionList)(typeName, isSDL ? standardTypeNames.concat(typeNames) : typeNames);
                context.reportError(new graphql_1.GraphQLError(`Unknown type "${typeName}".` + (0, suggestions_1.didYouMean)(suggestedTypes), node));
            }
        },
    };
}
exports.KnownTypeNamesInFederationRule = KnownTypeNamesInFederationRule;
const standardTypeNames = [...graphql_1.specifiedScalarTypes, ...graphql_1.introspectionTypes].map((type) => type.name);
function isStandardTypeName(typeName) {
    return standardTypeNames.indexOf(typeName) !== -1 || (0, federation_1.isFederationTypeName)(typeName);
}
function isSDLNode(value) {
    return (!Array.isArray(value) &&
        ((0, graphql_1.isTypeSystemDefinitionNode)(value) || (0, graphql_1.isTypeSystemExtensionNode)(value)));
}
//# sourceMappingURL=KnownTypeNamesInFederationRule.js.map