import { ASTNode, StringValueNode } from "graphql";
import { CoreFeature, Directive, DirectiveDefinition, EnumType, NamedType, ScalarType, Schema, SchemaDefinition } from "./definitions";
export declare const coreIdentity = "https://specs.apollo.dev/core";
export declare const ErrCoreCheckFailed: (causes: Error[]) => import("@apollo/core-schema/dist/error").GraphQLErrorExt<"CheckFailed"> & {
    message: string;
    causes: Error[];
};
export declare const corePurposes: ("SECURITY" | "EXECUTION")[];
export declare type CorePurpose = typeof corePurposes[number];
export declare abstract class FeatureDefinition {
    readonly url: FeatureUrl;
    constructor(url: FeatureUrl | string);
    get identity(): string;
    get version(): FeatureVersion;
    isSpecType(type: NamedType): boolean;
    isSpecDirective(directive: DirectiveDefinition): boolean;
    abstract addElementsToSchema(schema: Schema): void;
    protected nameInSchema(schema: Schema): string | undefined;
    protected elementNameInSchema(schema: Schema, elementName: string): string | undefined;
    protected rootDirective<TApplicationArgs extends {
        [key: string]: any;
    }>(schema: Schema): DirectiveDefinition<TApplicationArgs> | undefined;
    protected directive<TApplicationArgs extends {
        [key: string]: any;
    }>(schema: Schema, elementName: string): DirectiveDefinition<TApplicationArgs> | undefined;
    protected type<T extends NamedType>(schema: Schema, elementName: string): T | undefined;
    protected addRootDirective(schema: Schema): DirectiveDefinition;
    protected addDirective(schema: Schema, name: string): DirectiveDefinition;
    protected addScalarType(schema: Schema, name: string): ScalarType;
    protected addEnumType(schema: Schema, name: string): EnumType;
    protected featureInSchema(schema: Schema): CoreFeature | undefined;
    toString(): string;
}
export declare type CoreDirectiveArgs = {
    feature: string;
    as?: string;
    for?: string;
};
export declare function isCoreSpecDirectiveApplication(directive: Directive<SchemaDefinition, any>): directive is Directive<SchemaDefinition, CoreDirectiveArgs>;
export declare class CoreSpecDefinition extends FeatureDefinition {
    constructor(version: FeatureVersion);
    addElementsToSchema(_: Schema): void;
    addToSchema(schema: Schema, as?: string): void;
    private supportPurposes;
    private extractFeature;
    coreDirective(schema: Schema): DirectiveDefinition<CoreDirectiveArgs>;
    coreVersion(schema: Schema): FeatureVersion;
    applyFeatureToSchema(schema: Schema, feature: FeatureDefinition, as?: string, purpose?: CorePurpose): void;
}
export declare class FeatureDefinitions<T extends FeatureDefinition = FeatureDefinition> {
    readonly identity: string;
    private readonly _definitions;
    constructor(identity: string);
    add(definition: T): FeatureDefinitions<T>;
    find(requested: FeatureVersion): T | undefined;
    versions(): FeatureVersion[];
    latest(): T;
}
export declare class FeatureVersion {
    readonly major: number;
    readonly minor: number;
    constructor(major: number, minor: number);
    static parse(input: string): FeatureVersion;
    satisfies(required: FeatureVersion): boolean;
    get series(): string;
    compareTo(other: FeatureVersion): number;
    strictlyGreaterThan(version: FeatureVersion): boolean;
    toString(): string;
    equals(other: FeatureVersion): boolean;
    private static VERSION_RE;
}
export declare class FeatureUrl {
    readonly identity: string;
    readonly name: string;
    readonly version: FeatureVersion;
    readonly element?: string | undefined;
    constructor(identity: string, name: string, version: FeatureVersion, element?: string | undefined);
    static parse(input: string, node?: ASTNode): FeatureUrl;
    static decode(node: StringValueNode): FeatureUrl;
    satisfies(requested: FeatureUrl): boolean;
    equals(other: FeatureUrl): boolean;
    get url(): string;
    get isDirective(): boolean | undefined;
    get elementName(): string | undefined;
    get base(): FeatureUrl;
    toString(): string;
}
export declare const CORE_VERSIONS: FeatureDefinitions<CoreSpecDefinition>;
export declare function removeFeatureElements(schema: Schema, feature: CoreFeature): void;
//# sourceMappingURL=coreSpec.d.ts.map