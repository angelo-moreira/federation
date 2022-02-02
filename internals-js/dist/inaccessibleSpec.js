"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeInaccessibleElements = exports.INACCESSIBLE_VERSIONS = exports.InaccessibleSpecDefinition = exports.inaccessibleIdentity = void 0;
const coreSpec_1 = require("./coreSpec");
const definitions_1 = require("./definitions");
const graphql_1 = require("graphql");
exports.inaccessibleIdentity = 'https://specs.apollo.dev/inaccessible';
class InaccessibleSpecDefinition extends coreSpec_1.FeatureDefinition {
    constructor(version) {
        super(new coreSpec_1.FeatureUrl(exports.inaccessibleIdentity, 'inaccessible', version));
    }
    addElementsToSchema(schema) {
        this.addDirective(schema, 'inaccessible').addLocations(graphql_1.DirectiveLocation.FIELD_DEFINITION, graphql_1.DirectiveLocation.OBJECT, graphql_1.DirectiveLocation.INTERFACE, graphql_1.DirectiveLocation.UNION);
    }
    inaccessibleDirective(schema) {
        return this.directive(schema, 'inaccessible');
    }
}
exports.InaccessibleSpecDefinition = InaccessibleSpecDefinition;
exports.INACCESSIBLE_VERSIONS = new coreSpec_1.FeatureDefinitions(exports.inaccessibleIdentity)
    .add(new InaccessibleSpecDefinition(new coreSpec_1.FeatureVersion(0, 1)));
function removeInaccessibleElements(schema) {
    const coreFeatures = schema.coreFeatures;
    if (!coreFeatures) {
        return;
    }
    const inaccessibleFeature = coreFeatures.getByIdentity(exports.inaccessibleIdentity);
    if (!inaccessibleFeature) {
        return;
    }
    const inaccessibleSpec = exports.INACCESSIBLE_VERSIONS.find(inaccessibleFeature.url.version);
    if (!inaccessibleSpec) {
        throw new graphql_1.GraphQLError(`Cannot remove inaccessible elements: the schema uses unsupported inaccessible spec version ${inaccessibleFeature.url.version} (supported versions: ${exports.INACCESSIBLE_VERSIONS.versions().join(', ')})`);
    }
    const inaccessibleDirective = inaccessibleSpec.inaccessibleDirective(schema);
    if (!inaccessibleDirective) {
        throw new graphql_1.GraphQLError(`Invalid schema: declares ${inaccessibleSpec.url} spec but does not define a @inaccessible directive`);
    }
    for (const type of schema.types()) {
        if (!(0, definitions_1.isCompositeType)(type)) {
            continue;
        }
        if (type.hasAppliedDirective(inaccessibleDirective)) {
            const references = type.remove();
            for (const reference of references) {
                if (reference.kind === 'FieldDefinition') {
                    if (!reference.hasAppliedDirective(inaccessibleDirective)) {
                        throw new graphql_1.GraphQLError(`Field ${reference.coordinate} returns an @inaccessible type without being marked @inaccessible itself.`, reference.sourceAST);
                    }
                }
            }
        }
        else if ((0, definitions_1.isObjectType)(type) || (0, definitions_1.isInterfaceType)(type)) {
            const toRemove = type.fields().filter(f => f.hasAppliedDirective(inaccessibleDirective));
            toRemove.forEach(f => f.remove());
        }
    }
}
exports.removeInaccessibleElements = removeInaccessibleElements;
//# sourceMappingURL=inaccessibleSpec.js.map