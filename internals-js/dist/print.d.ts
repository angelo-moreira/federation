import { DirectiveDefinition, NamedType, Schema, SchemaRootKind } from "./definitions";
export declare type Options = {
    indentString: string;
    definitionsOrder: ('schema' | 'types' | 'directives')[];
    rootTypesOrder: SchemaRootKind[];
    typeCompareFn?: (t1: NamedType, t2: NamedType) => number;
    directiveCompareFn?: (d1: DirectiveDefinition, d2: DirectiveDefinition) => number;
    mergeTypesAndExtensions: boolean;
    showAllBuiltIns: boolean;
    showNonGraphQLBuiltIns: boolean;
    noDescriptions: boolean;
};
export declare const defaultPrintOptions: Options;
export declare function orderPrintedDefinitions(options: Options): Options;
export declare function printSchema(schema: Schema, options?: Options): string;
export declare function printType(type: NamedType, options?: Options): string;
export declare function printTypeDefinitionAndExtensions(type: NamedType, options?: Options): string[];
export declare function printDirectiveDefinition(directive: DirectiveDefinition, options: Options): string;
//# sourceMappingURL=print.d.ts.map