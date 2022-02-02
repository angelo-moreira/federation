import { FeatureDefinition, FeatureDefinitions, FeatureVersion } from "./coreSpec";
import { DirectiveDefinition, EnumType, ScalarType, Schema } from "./definitions";
import { Subgraphs } from "./federation";
export declare const joinIdentity = "https://specs.apollo.dev/join";
export declare class JoinSpecDefinition extends FeatureDefinition {
    constructor(version: FeatureVersion);
    private isV01;
    addElementsToSchema(schema: Schema): void;
    populateGraphEnum(schema: Schema, subgraphs: Subgraphs): Map<string, string>;
    fieldSetScalar(schema: Schema): ScalarType;
    graphEnum(schema: Schema): EnumType;
    graphDirective(schema: Schema): DirectiveDefinition<{
        name: string;
        url: string;
    }>;
    typeDirective(schema: Schema): DirectiveDefinition<{
        graph: string;
        key?: string;
        extension?: boolean;
    }>;
    implementsDirective(schema: Schema): DirectiveDefinition<{
        graph: string;
        interface: string;
    }> | undefined;
    fieldDirective(schema: Schema): DirectiveDefinition<{
        graph: string;
        requires?: string;
        provides?: string;
        type?: string;
        external?: boolean;
    }>;
    ownerDirective(schema: Schema): DirectiveDefinition<{
        graph: string;
    }> | undefined;
}
export declare const JOIN_VERSIONS: FeatureDefinitions<JoinSpecDefinition>;
//# sourceMappingURL=joinSpec.d.ts.map