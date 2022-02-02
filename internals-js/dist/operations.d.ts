import { DocumentNode, FieldNode, FragmentDefinitionNode, SelectionNode, SelectionSetNode } from "graphql";
import { DirectiveTargetElement, FieldDefinition, InterfaceType, ObjectType, Schema, SchemaRootKind, Variables, VariableDefinitions, CompositeType, NamedType } from "./definitions";
declare abstract class AbstractOperationElement<T extends AbstractOperationElement<T>> extends DirectiveTargetElement<T> {
    private readonly variablesInElement;
    constructor(schema: Schema, variablesInElement: Variables);
    variables(): Variables;
    abstract updateForAddingTo(selection: SelectionSet): T;
}
export declare class Field<TArgs extends {
    [key: string]: any;
} = {
    [key: string]: any;
}> extends AbstractOperationElement<Field<TArgs>> {
    readonly definition: FieldDefinition<CompositeType>;
    readonly args: TArgs;
    readonly variableDefinitions: VariableDefinitions;
    readonly alias?: string | undefined;
    readonly kind: "Field";
    constructor(definition: FieldDefinition<CompositeType>, args?: TArgs, variableDefinitions?: VariableDefinitions, alias?: string | undefined);
    get name(): string;
    responseName(): string;
    get parentType(): CompositeType;
    withUpdatedDefinition(newDefinition: FieldDefinition<any>): Field<TArgs>;
    appliesTo(type: ObjectType | InterfaceType): boolean;
    selects(definition: FieldDefinition<any>, assumeValid?: boolean): boolean;
    private validate;
    updateForAddingTo(selectionSet: SelectionSet): Field<TArgs>;
    equals(that: OperationElement): boolean;
    toString(): string;
}
export declare class FragmentElement extends AbstractOperationElement<FragmentElement> {
    private readonly sourceType;
    readonly kind: "FragmentElement";
    readonly typeCondition?: CompositeType;
    constructor(sourceType: CompositeType, typeCondition?: string | CompositeType);
    get parentType(): CompositeType;
    withUpdatedSourceType(newSourceType: CompositeType): FragmentElement;
    updateForAddingTo(selectionSet: SelectionSet): FragmentElement;
    equals(that: OperationElement): boolean;
    toString(): string;
}
export declare type OperationElement = Field<any> | FragmentElement;
export declare type OperationPath = OperationElement[];
export declare function sameOperationPaths(p1: OperationPath, p2: OperationPath): boolean;
export declare type RootOperationPath = {
    rootKind: SchemaRootKind;
    path: OperationPath;
};
export declare class Operation {
    readonly rootKind: SchemaRootKind;
    readonly selectionSet: SelectionSet;
    readonly variableDefinitions: VariableDefinitions;
    readonly name?: string | undefined;
    constructor(rootKind: SchemaRootKind, selectionSet: SelectionSet, variableDefinitions: VariableDefinitions, name?: string | undefined);
    optimize(fragments?: NamedFragments, minUsagesToOptimize?: number): Operation;
    expandAllFragments(): Operation;
    toString(expandFragments?: boolean, prettyPrint?: boolean): string;
}
export declare function selectionSetOf(parentType: CompositeType, selection: Selection): SelectionSet;
export declare class NamedFragmentDefinition extends DirectiveTargetElement<NamedFragmentDefinition> {
    readonly name: string;
    readonly typeCondition: CompositeType;
    readonly selectionSet: SelectionSet;
    constructor(schema: Schema, name: string, typeCondition: CompositeType, selectionSet: SelectionSet);
    variables(): Variables;
    collectUsedFragmentNames(collector: Map<string, number>): void;
    toFragmentDefinitionNode(): FragmentDefinitionNode;
    toString(indent?: string): string;
}
export declare class NamedFragments {
    private readonly fragments;
    isEmpty(): boolean;
    variables(): Variables;
    names(): readonly string[];
    add(fragment: NamedFragmentDefinition): void;
    addIfNotExist(fragment: NamedFragmentDefinition): void;
    onType(type: NamedType): NamedFragmentDefinition[];
    without(names: string[]): NamedFragments;
    get(name: string): NamedFragmentDefinition | undefined;
    definitions(): readonly NamedFragmentDefinition[];
    validate(): void;
    toFragmentDefinitionNodes(): FragmentDefinitionNode[];
    toString(indent?: string): string;
}
export declare class SelectionSet {
    readonly parentType: CompositeType;
    readonly fragments?: NamedFragments | undefined;
    private readonly _selections;
    private _selectionCount;
    private _cachedSelections?;
    constructor(parentType: CompositeType, fragments?: NamedFragments | undefined);
    selections(reversedOrder?: boolean): readonly Selection[];
    usedVariables(): Variables;
    collectUsedFragmentNames(collector: Map<string, number>): void;
    optimize(fragments?: NamedFragments): SelectionSet;
    expandFragments(names?: string[], updateSelectionSetFragments?: boolean): SelectionSet;
    mergeIn(selectionSet: SelectionSet): void;
    addAll(selections: Selection[]): SelectionSet;
    add(selection: Selection): Selection;
    addPath(path: OperationPath): void;
    addSelectionSetNode(node: SelectionSetNode | undefined, variableDefinitions: VariableDefinitions, fieldAccessor?: (type: CompositeType, fieldName: string) => FieldDefinition<any> | undefined): void;
    addSelectionNode(node: SelectionNode, variableDefinitions: VariableDefinitions, fieldAccessor?: (type: CompositeType, fieldName: string) => FieldDefinition<any> | undefined): void;
    private nodeToSelection;
    equals(that: SelectionSet): boolean;
    contains(that: SelectionSet): boolean;
    validate(): void;
    isEmpty(): boolean;
    toSelectionSetNode(): SelectionSetNode;
    private selectionsInPrintOrder;
    toOperationPaths(): OperationPath[];
    private toOperationPathsInternal;
    clone(): SelectionSet;
    toOperationString(rootKind: SchemaRootKind, variableDefinitions: VariableDefinitions, operationName?: string, expandFragments?: boolean, prettyPrint?: boolean): string;
    toString(expandFragments?: boolean, includeExternalBrackets?: boolean, indent?: string): string;
}
export declare function selectionSetOfElement(element: OperationElement, subSelection?: SelectionSet): SelectionSet;
export declare function selectionOfElement(element: OperationElement, subSelection?: SelectionSet): Selection;
export declare function selectionSetOfPath(path: OperationPath, onPathEnd?: (finalSelectionSet: SelectionSet | undefined) => void): SelectionSet;
export declare type Selection = FieldSelection | FragmentSelection;
export declare class FieldSelection {
    readonly field: Field<any>;
    readonly kind: "FieldSelection";
    readonly selectionSet?: SelectionSet;
    constructor(field: Field<any>, initialSelectionSet?: SelectionSet);
    key(): string;
    element(): Field<any>;
    usedVariables(): Variables;
    collectUsedFragmentNames(collector: Map<string, number>): void;
    optimize(fragments: NamedFragments): FieldSelection;
    expandFragments(names?: string[], updateSelectionSetFragments?: boolean): FieldSelection;
    private fieldArgumentsToAST;
    validate(): void;
    updateForAddingTo(selectionSet: SelectionSet): FieldSelection;
    toSelectionNode(): FieldNode;
    equals(that: Selection): boolean;
    contains(that: Selection): boolean;
    namedFragments(): NamedFragments | undefined;
    clone(): FieldSelection;
    toString(expandFragments?: boolean, indent?: string): string;
}
export declare abstract class FragmentSelection {
    readonly kind: "FragmentSelection";
    abstract key(): string;
    abstract element(): FragmentElement;
    abstract get selectionSet(): SelectionSet;
    abstract collectUsedFragmentNames(collector: Map<string, number>): void;
    abstract namedFragments(): NamedFragments | undefined;
    abstract optimize(fragments: NamedFragments): FragmentSelection;
    abstract expandFragments(names?: string[]): FragmentSelection;
    abstract toSelectionNode(): SelectionNode;
    abstract validate(): void;
    usedVariables(): Variables;
    updateForAddingTo(selectionSet: SelectionSet): FragmentSelection;
    equals(that: Selection): boolean;
    contains(that: Selection): boolean;
    clone(): FragmentSelection;
}
export declare function operationFromDocument(schema: Schema, document: DocumentNode, operationName?: string): Operation;
export declare function parseOperation(schema: Schema, operation: string, operationName?: string): Operation;
export declare function parseSelectionSet(parentType: CompositeType, source: string | SelectionSetNode, variableDefinitions?: VariableDefinitions, fragments?: NamedFragments, fieldAccessor?: (type: CompositeType, fieldName: string) => FieldDefinition<any> | undefined): SelectionSet;
export declare function operationToDocument(operation: Operation): DocumentNode;
export {};
//# sourceMappingURL=operations.d.ts.map