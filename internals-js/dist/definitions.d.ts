import { ConstArgumentNode, ASTNode, DirectiveLocation, ConstDirectiveNode, DocumentNode, GraphQLError, GraphQLSchema, TypeNode, VariableDefinitionNode, VariableNode } from "graphql";
import { CoreSpecDefinition, FeatureUrl } from "./coreSpec";
import { MapWithCachedArrays } from "./utils";
import { GraphQLErrorExt } from "@apollo/core-schema/dist/error";
import { SDLValidationRule } from "graphql/validation/ValidationContext";
export declare const ErrGraphQLValidationFailed: (causes: GraphQLError[]) => GraphQLErrorExt<"GraphQLValidationFailed"> & {
    message: string;
    causes: GraphQLError[];
};
export declare function errorCauses(e: Error): GraphQLError[] | undefined;
export declare function printGraphQLErrorsOrRethrow(e: Error): string;
export declare function printErrors(errors: GraphQLError[]): string;
export declare const typenameFieldName = "__typename";
export declare type QueryRootKind = 'query';
export declare type MutationRootKind = 'mutation';
export declare type SubscriptionRootKind = 'subscription';
export declare type SchemaRootKind = QueryRootKind | MutationRootKind | SubscriptionRootKind;
export declare const allSchemaRootKinds: SchemaRootKind[];
export declare function defaultRootName(rootKind: SchemaRootKind): string;
export declare type Type = NamedType | WrapperType;
export declare type NamedType = ScalarType | ObjectType | InterfaceType | UnionType | EnumType | InputObjectType;
export declare type OutputType = ScalarType | ObjectType | InterfaceType | UnionType | EnumType | ListType<any> | NonNullType<any>;
export declare type InputType = ScalarType | EnumType | InputObjectType | ListType<any> | NonNullType<any>;
export declare type WrapperType = ListType<any> | NonNullType<any>;
export declare type AbstractType = InterfaceType | UnionType;
export declare type CompositeType = ObjectType | InterfaceType | UnionType;
export declare type OutputTypeReferencer = FieldDefinition<any>;
export declare type InputTypeReferencer = InputFieldDefinition | ArgumentDefinition<any>;
export declare type ObjectTypeReferencer = OutputTypeReferencer | UnionType | SchemaDefinition;
export declare type InterfaceTypeReferencer = OutputTypeReferencer | ObjectType | InterfaceType;
export declare type NullableType = NamedType | ListType<any>;
export declare type NamedTypeKind = NamedType['kind'];
export declare function isNamedType(type: Type): type is NamedType;
export declare function isWrapperType(type: Type): type is WrapperType;
export declare function isListType(type: Type): type is ListType<any>;
export declare function isNonNullType(type: Type): type is NonNullType<any>;
export declare function isScalarType(type: Type): type is ScalarType;
export declare function isCustomScalarType(type: Type): boolean;
export declare function isIntType(type: Type): boolean;
export declare function isStringType(type: Type): boolean;
export declare function isFloatType(type: Type): boolean;
export declare function isBooleanType(type: Type): boolean;
export declare function isIDType(type: Type): boolean;
export declare function isObjectType(type: Type): type is ObjectType;
export declare function isInterfaceType(type: Type): type is InterfaceType;
export declare function isEnumType(type: Type): type is EnumType;
export declare function isUnionType(type: Type): type is UnionType;
export declare function isInputObjectType(type: Type): type is InputObjectType;
export declare function isOutputType(type: Type): type is OutputType;
export declare function isInputType(type: Type): type is InputType;
export declare function baseType(type: Type): NamedType;
export declare function isNullableType(type: Type): boolean;
export declare function isAbstractType(type: Type): type is AbstractType;
export declare function isCompositeType(type: Type): type is CompositeType;
export declare function possibleRuntimeTypes(type: CompositeType): readonly ObjectType[];
export declare function runtimeTypesIntersects(t1: CompositeType, t2: CompositeType): boolean;
export declare const executableDirectiveLocations: DirectiveLocation[];
export declare function typeToAST(type: Type): TypeNode;
export declare function typeFromAST(schema: Schema, node: TypeNode): Type;
export declare type LeafType = ScalarType | EnumType;
export declare function isLeafType(type: Type): type is LeafType;
export interface Named {
    readonly name: string;
}
export declare type ExtendableElement = SchemaDefinition | NamedType;
export declare class DirectiveTargetElement<T extends DirectiveTargetElement<T>> {
    private readonly _schema;
    readonly appliedDirectives: Directive<T>[];
    constructor(_schema: Schema);
    schema(): Schema;
    appliedDirectivesOf(name: string): Directive<T>[];
    appliedDirectivesOf<TApplicationArgs extends {
        [key: string]: any;
    } = {
        [key: string]: any;
    }>(definition: DirectiveDefinition<TApplicationArgs>): Directive<T, TApplicationArgs>[];
    hasAppliedDirective(nameOrDefinition: string | DirectiveDefinition): boolean;
    applyDirective<TApplicationArgs extends {
        [key: string]: any;
    } = {
        [key: string]: any;
    }>(defOrDirective: Directive<T, TApplicationArgs> | DirectiveDefinition<TApplicationArgs>, args?: TApplicationArgs): Directive<T, TApplicationArgs>;
    appliedDirectivesToDirectiveNodes(): ConstDirectiveNode[] | undefined;
    appliedDirectivesToString(): string;
    variablesInAppliedDirectives(): Variables;
}
export declare function sourceASTs(...elts: ({
    sourceAST?: ASTNode;
} | undefined)[]): ASTNode[];
declare abstract class Element<TParent extends SchemaElement<any, any> | Schema | DirectiveTargetElement<any>> {
    protected _parent?: TParent;
    sourceAST?: ASTNode;
    schema(): Schema;
    protected schemaInternal(): Schema | undefined;
    get parent(): TParent;
    isAttached(): boolean;
    private setParent;
    protected onAttached(): void;
    protected checkUpdate(): void;
}
export declare class Extension<TElement extends ExtendableElement> {
    protected _extendedElement?: TElement;
    sourceAST?: ASTNode;
    get extendedElement(): TElement | undefined;
    private setExtendedElement;
}
export declare abstract class SchemaElement<TOwnType extends SchemaElement<any, TParent>, TParent extends SchemaElement<any, any> | Schema> extends Element<TParent> {
    protected readonly _appliedDirectives: Directive<TOwnType>[];
    description?: string;
    get appliedDirectives(): readonly Directive<TOwnType>[];
    appliedDirectivesOf<TApplicationArgs extends {
        [key: string]: any;
    } = {
        [key: string]: any;
    }>(nameOrDefinition: string | DirectiveDefinition<TApplicationArgs>): Directive<TOwnType, TApplicationArgs>[];
    hasAppliedDirective(nameOrDefinition: string | DirectiveDefinition<any>): boolean;
    applyDirective<TApplicationArgs extends {
        [key: string]: any;
    } = {
        [key: string]: any;
    }>(nameOrDefOrDirective: Directive<TOwnType, TApplicationArgs> | DirectiveDefinition<TApplicationArgs> | string, args?: TApplicationArgs): Directive<TOwnType, TApplicationArgs>;
    protected removeAppliedDirectives(): void;
    protected onModification(): void;
    protected isElementBuiltIn(): boolean;
    protected removeTypeReferenceInternal(type: BaseNamedType<any, any>): void;
    protected abstract removeTypeReference(type: NamedType): void;
    protected checkRemoval(): void;
    protected checkUpdate(addedElement?: {
        schema(): Schema;
        isAttached(): boolean;
    }): void;
}
export declare abstract class NamedSchemaElement<TOwnType extends NamedSchemaElement<TOwnType, TParent, TReferencer>, TParent extends NamedSchemaElement<any, any, any> | Schema, TReferencer> extends SchemaElement<TOwnType, TParent> implements Named {
    protected _name: string;
    constructor(name: string);
    get name(): string;
    abstract coordinate: string;
    abstract remove(): TReferencer[];
}
declare abstract class BaseNamedType<TReferencer, TOwnType extends NamedType & NamedSchemaElement<TOwnType, Schema, TReferencer>> extends NamedSchemaElement<TOwnType, Schema, TReferencer> {
    readonly isBuiltIn: boolean;
    protected readonly _referencers: Set<TReferencer>;
    protected readonly _extensions: Set<Extension<TOwnType>>;
    constructor(name: string, isBuiltIn?: boolean);
    private addReferencer;
    private removeReferencer;
    get coordinate(): string;
    allChildElements(): Generator<NamedSchemaElement<any, TOwnType, any>, void, undefined>;
    extensions(): ReadonlySet<Extension<TOwnType>>;
    newExtension(): Extension<TOwnType>;
    addExtension(extension: Extension<TOwnType>): Extension<TOwnType>;
    isIntrospectionType(): boolean;
    hasExtensionElements(): boolean;
    hasNonExtensionElements(): boolean;
    protected abstract hasNonExtensionInnerElements(): boolean;
    protected isElementBuiltIn(): boolean;
    rename(newName: string): void;
    remove(): TReferencer[];
    removeRecursive(): void;
    protected abstract removeReferenceRecursive(ref: TReferencer): void;
    referencers(): readonly TReferencer[];
    isReferenced(): boolean;
    protected abstract removeInnerElements(): void;
    toString(): string;
}
export declare abstract class NamedSchemaElementWithType<TType extends Type, TOwnType extends NamedSchemaElementWithType<TType, TOwnType, P, Referencer>, P extends NamedSchemaElement<any, any, any> | Schema, Referencer> extends NamedSchemaElement<TOwnType, P, Referencer> {
    private _type?;
    get type(): TType | undefined;
    set type(type: TType | undefined);
    protected removeTypeReference(type: NamedType): void;
}
declare abstract class BaseExtensionMember<TExtended extends ExtendableElement> extends Element<TExtended> {
    private _extension?;
    ofExtension(): Extension<TExtended> | undefined;
    setOfExtension(extension: Extension<TExtended> | undefined): void;
    remove(): void;
    protected abstract removeInner(): void;
}
export declare class BuiltIns {
    readonly defaultGraphQLBuiltInTypes: readonly string[];
    private readonly defaultGraphQLBuiltInDirectives;
    addBuiltInTypes(schema: Schema): void;
    addBuiltInDirectives(schema: Schema): void;
    isGraphQLBuiltIn(element: NamedType | DirectiveDefinition | FieldDefinition<any>): boolean;
    prepareValidation(_: Schema): void;
    onValidation(schema: Schema, unvalidatedDirectives?: string[]): GraphQLError[];
    validationRules(): readonly SDLValidationRule[];
    maybeUpdateSubgraphDocument(_: Schema, document: DocumentNode): DocumentNode;
    private ensureSameDirectiveStructure;
    private ensureSameArguments;
    private ensureSameTypeStructure;
    protected addBuiltInScalar(schema: Schema, name: string): ScalarType;
    protected addBuiltInObject(schema: Schema, name: string): ObjectType;
    protected addBuiltInUnion(schema: Schema, name: string): UnionType;
    protected addBuiltInDirective(schema: Schema, name: string): DirectiveDefinition;
    protected addBuiltInField(parentType: ObjectType, name: string, type: OutputType): FieldDefinition<ObjectType>;
    protected getTypedDirective<TApplicationArgs extends {
        [key: string]: any;
    }>(schema: Schema, name: string): DirectiveDefinition<TApplicationArgs>;
    includeDirective(schema: Schema): DirectiveDefinition<{
        if: boolean;
    }>;
    skipDirective(schema: Schema): DirectiveDefinition<{
        if: boolean;
    }>;
    deprecatedDirective(schema: Schema): DirectiveDefinition<{
        reason?: string;
    }>;
    specifiedByDirective(schema: Schema): DirectiveDefinition<{
        url: string;
    }>;
}
export declare class CoreFeature {
    readonly url: FeatureUrl;
    readonly nameInSchema: string;
    readonly directive: Directive<SchemaDefinition>;
    readonly purpose?: string | undefined;
    constructor(url: FeatureUrl, nameInSchema: string, directive: Directive<SchemaDefinition>, purpose?: string | undefined);
    isFeatureDefinition(element: NamedType | DirectiveDefinition): boolean;
}
export declare class CoreFeatures {
    readonly coreItself: CoreFeature;
    readonly coreDefinition: CoreSpecDefinition;
    private readonly byAlias;
    private readonly byIdentity;
    constructor(coreItself: CoreFeature);
    getByIdentity(identity: string): CoreFeature | undefined;
    allFeatures(): IterableIterator<CoreFeature>;
    private removeFeature;
    private maybeAddFeature;
    private add;
}
export declare class Schema {
    readonly builtIns: BuiltIns;
    private _schemaDefinition;
    private readonly _builtInTypes;
    private readonly _types;
    private readonly _builtInDirectives;
    private readonly _directives;
    private _coreFeatures?;
    private isConstructed;
    private isValidated;
    private cachedDocument?;
    private apiSchema?;
    constructor(builtIns?: BuiltIns);
    private canModifyBuiltIn;
    private runWithBuiltInModificationAllowed;
    private renameTypeInternal;
    private removeTypeInternal;
    private removeDirectiveInternal;
    private markAsCoreSchema;
    private unmarkAsCoreSchema;
    private onModification;
    private forceSetCachedDocument;
    isCoreSchema(): boolean;
    get coreFeatures(): CoreFeatures | undefined;
    toAST(): DocumentNode;
    toAPISchema(): Schema;
    toGraphQLJSSchema(isSubgraph?: boolean): GraphQLSchema;
    get schemaDefinition(): SchemaDefinition;
    types<T extends NamedType>(kind?: T['kind'], includeNonGraphQLBuiltIns?: boolean): readonly T[];
    builtInTypes<T extends NamedType>(kind?: T['kind'], includeShadowed?: boolean): readonly T[];
    private isShadowedBuiltInType;
    allTypes<T extends NamedType>(kind?: T['kind']): readonly T[];
    type(name: string): NamedType | undefined;
    typeOfKind<T extends NamedType>(name: string, kind: T['kind']): T | undefined;
    intType(): ScalarType;
    floatType(): ScalarType;
    stringType(): ScalarType;
    booleanType(): ScalarType;
    idType(): ScalarType;
    addType<T extends NamedType>(type: T): T;
    directives(includeNonGraphQLBuiltIns?: boolean): readonly DirectiveDefinition[];
    builtInDirectives(includeShadowed?: boolean): readonly DirectiveDefinition[];
    allDirectives(): readonly DirectiveDefinition[];
    private isShadowedBuiltInDirective;
    directive(name: string): DirectiveDefinition | undefined;
    allNamedSchemaElement(): Generator<NamedSchemaElement<any, any, any>, void, undefined>;
    allSchemaElement(): Generator<SchemaElement<any, any>, void, undefined>;
    addDirectiveDefinition(name: string): DirectiveDefinition;
    addDirectiveDefinition(directive: DirectiveDefinition): DirectiveDefinition;
    invalidate(): void;
    validate(): void;
    clone(builtIns?: BuiltIns): Schema;
}
export declare class RootType extends BaseExtensionMember<SchemaDefinition> {
    readonly rootKind: SchemaRootKind;
    readonly type: ObjectType;
    constructor(rootKind: SchemaRootKind, type: ObjectType);
    isDefaultRootName(): boolean;
    protected removeInner(): void;
}
export declare class SchemaDefinition extends SchemaElement<SchemaDefinition, Schema> {
    readonly kind: "SchemaDefinition";
    protected readonly _roots: MapWithCachedArrays<SchemaRootKind, RootType>;
    protected readonly _extensions: Set<Extension<SchemaDefinition>>;
    roots(): readonly RootType[];
    applyDirective<TApplicationArgs extends {
        [key: string]: any;
    } = {
        [key: string]: any;
    }>(nameOrDefOrDirective: Directive<SchemaDefinition, TApplicationArgs> | DirectiveDefinition<TApplicationArgs> | string, args?: TApplicationArgs): Directive<SchemaDefinition, TApplicationArgs>;
    root(rootKind: SchemaRootKind): RootType | undefined;
    rootType(rootKind: SchemaRootKind): ObjectType | undefined;
    setRoot(rootKind: SchemaRootKind, nameOrType: ObjectType | string): RootType;
    extensions(): ReadonlySet<Extension<SchemaDefinition>>;
    newExtension(): Extension<SchemaDefinition>;
    addExtension(extension: Extension<SchemaDefinition>): Extension<SchemaDefinition>;
    private removeRootType;
    protected removeTypeReference(toRemove: NamedType): void;
    toString(): string;
}
export declare class ScalarType extends BaseNamedType<OutputTypeReferencer | InputTypeReferencer, ScalarType> {
    readonly kind: "ScalarType";
    protected removeTypeReference(type: NamedType): void;
    protected hasNonExtensionInnerElements(): boolean;
    protected removeInnerElements(): void;
    protected removeReferenceRecursive(ref: OutputTypeReferencer | InputTypeReferencer): void;
}
export declare class InterfaceImplementation<T extends ObjectType | InterfaceType> extends BaseExtensionMember<T> {
    readonly interface: InterfaceType;
    constructor(itf: InterfaceType);
    protected removeInner(): void;
    toString(): string;
}
declare abstract class FieldBasedType<T extends (ObjectType | InterfaceType) & NamedSchemaElement<T, Schema, R>, R> extends BaseNamedType<R, T> {
    private readonly _interfaceImplementations;
    private readonly _fields;
    private _cachedNonBuiltInFields?;
    protected onAttached(): void;
    private removeFieldInternal;
    interfaceImplementations(): readonly InterfaceImplementation<T>[];
    interfaceImplementation(type: string | InterfaceType): InterfaceImplementation<T> | undefined;
    interfaces(): readonly InterfaceType[];
    implementsInterface(type: string | InterfaceType): boolean;
    addImplementedInterface(nameOrItfOrItfImpl: InterfaceImplementation<T> | InterfaceType | string): InterfaceImplementation<T>;
    fields(includeNonGraphQLBuiltIns?: boolean): readonly FieldDefinition<T>[];
    hasFields(includeNonGraphQLBuiltIns?: boolean): boolean;
    builtInFields(): FieldDefinition<T>[];
    allFields(): readonly FieldDefinition<T>[];
    field(name: string): FieldDefinition<T> | undefined;
    typenameField(): FieldDefinition<T> | undefined;
    addField(nameOrField: string | FieldDefinition<T>, type?: Type): FieldDefinition<T>;
    allChildElements(): Generator<NamedSchemaElement<any, any, any>, void, undefined>;
    private removeInterfaceImplementation;
    protected removeTypeReference(type: NamedType): void;
    protected removeInnerElements(): void;
    protected hasNonExtensionInnerElements(): boolean;
}
export declare class ObjectType extends FieldBasedType<ObjectType, ObjectTypeReferencer> {
    readonly kind: "ObjectType";
    isRootType(): boolean;
    isQueryRootType(): boolean;
    protected removeReferenceRecursive(ref: ObjectTypeReferencer): void;
}
export declare class InterfaceType extends FieldBasedType<InterfaceType, InterfaceTypeReferencer> {
    readonly kind: "InterfaceType";
    allImplementations(): (ObjectType | InterfaceType)[];
    possibleRuntimeTypes(): readonly ObjectType[];
    isPossibleRuntimeType(type: string | NamedType): boolean;
    protected removeReferenceRecursive(ref: InterfaceTypeReferencer): void;
}
export declare class UnionMember extends BaseExtensionMember<UnionType> {
    readonly type: ObjectType;
    constructor(type: ObjectType);
    protected removeInner(): void;
}
export declare class UnionType extends BaseNamedType<OutputTypeReferencer, UnionType> {
    readonly kind: "UnionType";
    protected readonly _members: MapWithCachedArrays<string, UnionMember>;
    private _typenameField?;
    protected onAttached(): void;
    types(): ObjectType[];
    members(): readonly UnionMember[];
    membersCount(): number;
    hasTypeMember(type: string | ObjectType): boolean;
    addType(nameOrTypeOrMember: ObjectType | string | UnionMember): UnionMember;
    clearTypes(): void;
    field(name: string): FieldDefinition<UnionType> | undefined;
    typenameField(): FieldDefinition<UnionType> | undefined;
    private removeMember;
    protected removeTypeReference(type: NamedType): void;
    protected removeInnerElements(): void;
    protected hasNonExtensionInnerElements(): boolean;
    protected removeReferenceRecursive(ref: OutputTypeReferencer): void;
}
export declare class EnumType extends BaseNamedType<OutputTypeReferencer, EnumType> {
    readonly kind: "EnumType";
    protected readonly _values: EnumValue[];
    get values(): readonly EnumValue[];
    value(name: string): EnumValue | undefined;
    addValue(value: EnumValue): EnumValue;
    addValue(name: string): EnumValue;
    protected removeTypeReference(type: NamedType): void;
    private removeValueInternal;
    protected removeInnerElements(): void;
    protected hasNonExtensionInnerElements(): boolean;
    protected removeReferenceRecursive(ref: OutputTypeReferencer): void;
}
export declare class InputObjectType extends BaseNamedType<InputTypeReferencer, InputObjectType> {
    readonly kind: "InputObjectType";
    private readonly _fields;
    private _cachedFieldsArray?;
    fields(): InputFieldDefinition[];
    field(name: string): InputFieldDefinition | undefined;
    addField(field: InputFieldDefinition): InputFieldDefinition;
    addField(name: string, type?: Type): InputFieldDefinition;
    hasFields(): boolean;
    allChildElements(): Generator<NamedSchemaElement<any, any, any>, void, undefined>;
    protected removeTypeReference(type: NamedType): void;
    protected removeInnerElements(): void;
    private removeFieldInternal;
    protected hasNonExtensionInnerElements(): boolean;
    protected removeReferenceRecursive(ref: InputTypeReferencer): void;
}
declare class BaseWrapperType<T extends Type> {
    protected _type: T;
    protected constructor(_type: T);
    schema(): Schema;
    isAttached(): boolean;
    get ofType(): T;
    baseType(): NamedType;
}
export declare class ListType<T extends Type> extends BaseWrapperType<T> {
    readonly kind: "ListType";
    constructor(type: T);
    toString(): string;
}
export declare class NonNullType<T extends NullableType> extends BaseWrapperType<T> {
    readonly kind: "NonNullType";
    constructor(type: T);
    toString(): string;
}
export declare class FieldDefinition<TParent extends CompositeType> extends NamedSchemaElementWithType<OutputType, FieldDefinition<TParent>, TParent, never> {
    readonly isBuiltIn: boolean;
    readonly kind: "FieldDefinition";
    private readonly _args;
    private _extension?;
    constructor(name: string, isBuiltIn?: boolean);
    protected isElementBuiltIn(): boolean;
    get coordinate(): string;
    hasArguments(): boolean;
    arguments(): readonly ArgumentDefinition<FieldDefinition<TParent>>[];
    argument(name: string): ArgumentDefinition<FieldDefinition<TParent>> | undefined;
    addArgument(arg: ArgumentDefinition<FieldDefinition<TParent>>): ArgumentDefinition<FieldDefinition<TParent>>;
    addArgument(name: string, type?: Type, defaultValue?: any): ArgumentDefinition<FieldDefinition<TParent>>;
    ofExtension(): Extension<TParent> | undefined;
    setOfExtension(extension: Extension<TParent> | undefined): void;
    isIntrospectionField(): boolean;
    isSchemaIntrospectionField(): boolean;
    private removeArgumentInternal;
    private removeParent;
    isDeprecated(): boolean;
    remove(): never[];
    removeRecursive(): void;
    toString(): string;
}
export declare class InputFieldDefinition extends NamedSchemaElementWithType<InputType, InputFieldDefinition, InputObjectType, never> {
    readonly kind: "InputFieldDefinition";
    private _extension?;
    defaultValue?: any;
    get coordinate(): string;
    isRequired(): boolean;
    ofExtension(): Extension<InputObjectType> | undefined;
    setOfExtension(extension: Extension<InputObjectType> | undefined): void;
    isDeprecated(): boolean;
    remove(): never[];
    removeRecursive(): void;
    toString(): string;
}
export declare class ArgumentDefinition<TParent extends FieldDefinition<any> | DirectiveDefinition> extends NamedSchemaElementWithType<InputType, ArgumentDefinition<TParent>, TParent, never> {
    readonly kind: "ArgumentDefinition";
    defaultValue?: any;
    constructor(name: string);
    get coordinate(): string;
    isRequired(): boolean;
    isDeprecated(): boolean;
    remove(): never[];
    toString(): string;
}
export declare class EnumValue extends NamedSchemaElement<EnumValue, EnumType, never> {
    readonly kind: "EnumValue";
    private _extension?;
    get coordinate(): string;
    ofExtension(): Extension<EnumType> | undefined;
    setOfExtension(extension: Extension<EnumType> | undefined): void;
    isDeprecated(): boolean;
    remove(): never[];
    protected removeTypeReference(type: NamedType): void;
    toString(): string;
}
export declare class DirectiveDefinition<TApplicationArgs extends {
    [key: string]: any;
} = {
    [key: string]: any;
}> extends NamedSchemaElement<DirectiveDefinition<TApplicationArgs>, Schema, Directive> {
    readonly isBuiltIn: boolean;
    readonly kind: "DirectiveDefinition";
    private readonly _args;
    repeatable: boolean;
    private readonly _locations;
    private readonly _referencers;
    constructor(name: string, isBuiltIn?: boolean);
    get coordinate(): string;
    arguments(): readonly ArgumentDefinition<DirectiveDefinition>[];
    argument(name: string): ArgumentDefinition<DirectiveDefinition> | undefined;
    addArgument(arg: ArgumentDefinition<DirectiveDefinition>): ArgumentDefinition<DirectiveDefinition>;
    addArgument(name: string, type?: InputType, defaultValue?: any): ArgumentDefinition<DirectiveDefinition>;
    private removeArgumentInternal;
    get locations(): readonly DirectiveLocation[];
    addLocations(...locations: DirectiveLocation[]): DirectiveDefinition;
    addAllLocations(): DirectiveDefinition;
    addAllTypeLocations(): DirectiveDefinition;
    removeLocations(...locations: DirectiveLocation[]): DirectiveDefinition;
    applications(): readonly Directive<SchemaElement<any, any>, TApplicationArgs>[];
    private addReferencer;
    private removeReferencer;
    protected removeTypeReference(type: NamedType): void;
    remove(): Directive[];
    removeRecursive(): void;
    toString(): string;
}
export declare class Directive<TParent extends SchemaElement<any, any> | DirectiveTargetElement<any> = SchemaElement<any, any>, TArgs extends {
    [key: string]: any;
} = {
    [key: string]: any;
}> extends Element<TParent> implements Named {
    readonly name: string;
    private _args;
    private _extension?;
    constructor(name: string, _args: TArgs);
    schema(): Schema;
    get definition(): DirectiveDefinition | undefined;
    arguments(includeDefaultValues?: boolean): Readonly<TArgs>;
    private onModification;
    private isAttachedToSchemaElement;
    setArguments(args: TArgs): void;
    argumentType(name: string): InputType | undefined;
    matchArguments(expectedArgs: Record<string, any>): boolean;
    ofExtension(): Extension<any> | undefined;
    setOfExtension(extension: Extension<any> | undefined): void;
    argumentsToAST(): ConstArgumentNode[] | undefined;
    remove(): boolean;
    private removeInternal;
    toString(): string;
}
export declare class Variable {
    readonly name: string;
    constructor(name: string);
    toVariableNode(): VariableNode;
    toString(): string;
}
export declare type Variables = readonly Variable[];
export declare function mergeVariables(v1s: Variables, v2s: Variables): Variables;
export declare function containsVariable(variables: Variables, toCheck: Variable): boolean;
export declare function isVariable(v: any): v is Variable;
export declare function variablesInArguments(args: {
    [key: string]: any;
}): Variables;
export declare class VariableDefinition extends DirectiveTargetElement<VariableDefinition> {
    readonly variable: Variable;
    readonly type: InputType;
    readonly defaultValue?: any;
    constructor(schema: Schema, variable: Variable, type: InputType, defaultValue?: any);
    toVariableDefinitionNode(): VariableDefinitionNode;
    toString(): string;
}
export declare class VariableDefinitions {
    private readonly _definitions;
    add(definition: VariableDefinition): boolean;
    addAll(definitions: VariableDefinitions): void;
    definition(variable: Variable | string): VariableDefinition | undefined;
    isEmpty(): boolean;
    definitions(): readonly VariableDefinition[];
    filter(variables: Variables): VariableDefinitions;
    toVariableDefinitionNodes(): readonly VariableDefinitionNode[] | undefined;
    toString(): string;
}
export declare function variableDefinitionsFromAST(schema: Schema, definitionNodes: readonly VariableDefinitionNode[]): VariableDefinitions;
export declare function variableDefinitionFromAST(schema: Schema, definitionNode: VariableDefinitionNode): VariableDefinition;
export declare const graphQLBuiltIns: BuiltIns;
export declare function newNamedType(kind: NamedTypeKind, name: string): NamedType;
export {};
//# sourceMappingURL=definitions.d.ts.map