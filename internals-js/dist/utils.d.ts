export declare function assert(condition: any, message: string | (() => string)): asserts condition;
export declare function assertUnreachable(_: never): never;
export declare class MultiMap<K, V> extends Map<K, V[]> {
    add(key: K, value: V): this;
}
export declare class OrderedMap<K, V> {
    private _keys;
    private _values;
    private _compareFn;
    private static defaultCompareFn;
    constructor(compareFn?: (a: K, b: K) => number);
    add(key: K, value: V): void;
    get(key: K): V | undefined;
    has(key: K): boolean;
    get size(): number;
    keys(): K[];
    values(): V[];
    private insertKeyInOrder;
    [Symbol.iterator](): Generator<V, void, unknown>;
}
export declare function arrayEquals<T>(a: readonly T[], b: readonly T[], equalFct?: (e1: T, e2: T) => boolean): boolean;
export declare function firstOf<T>(iterable: Iterable<T>): T | undefined;
export declare function mapValues<V>(map: ReadonlyMap<any, V>): V[];
export declare function mapKeys<K>(map: ReadonlyMap<K, any>): K[];
export declare function mapEntries<K, V>(map: ReadonlyMap<K, V>): [K, V][];
export declare function setValues<V>(set: ReadonlySet<V>): V[];
export declare class MapWithCachedArrays<K, V> {
    private readonly map;
    private cachedKeys?;
    private cachedValues?;
    private clearCaches;
    get size(): number;
    has(key: K): boolean;
    get(key: K): V | undefined;
    set(key: K, value: V): this;
    delete(key: K): boolean;
    clear(): void;
    keys(): readonly K[];
    values(): readonly V[];
}
export declare function copyWitNewLength<T>(arr: T[], newLength: number): T[];
export declare function validateStringContainsBoolean(str?: string): boolean | undefined;
export declare function joinStrings(toJoin: string[], sep?: string, firstSep?: string, lastSep?: string): string;
//# sourceMappingURL=utils.d.ts.map