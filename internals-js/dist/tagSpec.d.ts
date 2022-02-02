import { DirectiveLocation, GraphQLError } from "graphql";
import { FeatureDefinition, FeatureDefinitions, FeatureVersion } from "./coreSpec";
import { DirectiveDefinition, Schema } from "./definitions";
export declare const tagIdentity = "https://specs.apollo.dev/tag";
export declare const tagLocations: DirectiveLocation[];
export declare class TagSpecDefinition extends FeatureDefinition {
    constructor(version: FeatureVersion);
    addElementsToSchema(schema: Schema): void;
    tagDirective(schema: Schema): DirectiveDefinition<{
        name: string;
    }>;
    checkCompatibleDirective(definition: DirectiveDefinition): GraphQLError | undefined;
}
export declare const TAG_VERSIONS: FeatureDefinitions<TagSpecDefinition>;
//# sourceMappingURL=tagSpec.d.ts.map