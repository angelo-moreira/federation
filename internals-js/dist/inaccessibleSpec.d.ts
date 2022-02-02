import { FeatureDefinition, FeatureDefinitions, FeatureVersion } from "./coreSpec";
import { DirectiveDefinition, Schema } from "./definitions";
export declare const inaccessibleIdentity = "https://specs.apollo.dev/inaccessible";
export declare class InaccessibleSpecDefinition extends FeatureDefinition {
    constructor(version: FeatureVersion);
    addElementsToSchema(schema: Schema): void;
    inaccessibleDirective(schema: Schema): DirectiveDefinition<Record<string, never>>;
}
export declare const INACCESSIBLE_VERSIONS: FeatureDefinitions<InaccessibleSpecDefinition>;
export declare function removeInaccessibleElements(schema: Schema): void;
//# sourceMappingURL=inaccessibleSpec.d.ts.map