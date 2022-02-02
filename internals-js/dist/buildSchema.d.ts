import { DocumentNode, Source } from "graphql";
import { BuiltIns, Schema, Type } from "./definitions";
export declare function buildSchema(source: string | Source, builtIns?: BuiltIns, validate?: boolean): Schema;
export declare function buildSchemaFromAST(documentNode: DocumentNode, builtIns?: BuiltIns, validate?: boolean): Schema;
export declare function builtTypeReference(encodedType: string, schema: Schema): Type;
//# sourceMappingURL=buildSchema.d.ts.map