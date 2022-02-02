import { ArgumentDefinition, InputType, VariableDefinitions, Variables } from './definitions';
import { ArgumentNode, ValueNode, ConstValueNode } from 'graphql';
export declare function valueToString(v: any, expectedType?: InputType): string;
export declare function valueEquals(a: any, b: any): boolean;
export declare function argumentsEquals(args1: {
    [key: string]: any;
}, args2: {
    [key: string]: any;
}): boolean;
export declare function withDefaultValues(value: any, argument: ArgumentDefinition<any>): any;
export declare function valueNodeToConstValueNode(value: ValueNode): ConstValueNode;
export declare function valueToAST(value: any, type: InputType): ValueNode | undefined;
export declare function isValidValue(value: any, argument: ArgumentDefinition<any>, variableDefinitions: VariableDefinitions): boolean;
export declare function valueFromAST(node: ValueNode, expectedType: InputType): any;
export declare function argumentsFromAST(context: string, args: readonly ArgumentNode[] | undefined, argsDefiner: {
    argument(name: string): ArgumentDefinition<any> | undefined;
}): {
    [key: string]: any;
};
export declare function variablesInValue(value: any): Variables;
//# sourceMappingURL=values.d.ts.map