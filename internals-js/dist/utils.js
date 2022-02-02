"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinStrings = exports.validateStringContainsBoolean = exports.copyWitNewLength = exports.MapWithCachedArrays = exports.setValues = exports.mapEntries = exports.mapKeys = exports.mapValues = exports.firstOf = exports.arrayEquals = exports.OrderedMap = exports.MultiMap = exports.assertUnreachable = exports.assert = void 0;
function assert(condition, message) {
    if (!condition) {
        throw new Error(typeof message === 'string' ? message : message());
    }
}
exports.assert = assert;
function assertUnreachable(_) {
    throw new Error("Didn't expect to get here");
}
exports.assertUnreachable = assertUnreachable;
class MultiMap extends Map {
    add(key, value) {
        const values = this.get(key);
        if (values) {
            values.push(value);
        }
        else {
            this.set(key, [value]);
        }
        return this;
    }
}
exports.MultiMap = MultiMap;
class OrderedMap {
    constructor(compareFn = OrderedMap.defaultCompareFn) {
        this._keys = [];
        this._values = new Map();
        this._compareFn = compareFn;
    }
    static defaultCompareFn(a, b) {
        if (a < b) {
            return -1;
        }
        else if (b < a) {
            return 1;
        }
        return 0;
    }
    add(key, value) {
        if (!this._values.has(key)) {
            this.insertKeyInOrder(key);
        }
        this._values.set(key, value);
    }
    get(key) {
        return this._values.get(key);
    }
    has(key) {
        return this._values.has(key);
    }
    get size() {
        return this._keys.length;
    }
    keys() {
        return this._keys;
    }
    values() {
        return this._keys.map(key => {
            const v = this._values.get(key);
            assert(v, 'value for known key not found in OrderedMap');
            return v;
        });
    }
    insertKeyInOrder(key) {
        let lower = 0;
        let upper = this._keys.length - 1;
        while (lower <= upper) {
            const middle = Math.floor((upper + lower) / 2);
            if (this._compareFn(this._keys[middle], key) < 0) {
                lower = middle + 1;
            }
            else {
                upper = middle - 1;
            }
        }
        this._keys = this._keys.slice(0, lower).concat(key).concat(this._keys.slice(lower));
    }
    *[Symbol.iterator]() {
        for (let i = 0; i < this._keys.length; i += 1) {
            const v = this._values.get(this._keys[i]);
            assert(v, 'value for known key not found in OrderedMap');
            yield v;
        }
    }
}
exports.OrderedMap = OrderedMap;
function arrayEquals(a, b, equalFct) {
    if (a === b) {
        return true;
    }
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; ++i) {
        const eltEqual = equalFct ? equalFct(a[i], b[i]) : a[i] === b[i];
        if (!eltEqual) {
            return false;
        }
    }
    return true;
}
exports.arrayEquals = arrayEquals;
function firstOf(iterable) {
    const res = iterable[Symbol.iterator]().next();
    return res.done ? undefined : res.value;
}
exports.firstOf = firstOf;
function mapValues(map) {
    const array = new Array(map.size);
    let i = 0;
    for (const v of map.values()) {
        array[i++] = v;
    }
    return array;
}
exports.mapValues = mapValues;
function mapKeys(map) {
    const array = new Array(map.size);
    let i = 0;
    for (const k of map.keys()) {
        array[i++] = k;
    }
    return array;
}
exports.mapKeys = mapKeys;
function mapEntries(map) {
    const array = new Array(map.size);
    let i = 0;
    for (const entry of map.entries()) {
        array[i++] = entry;
    }
    return array;
}
exports.mapEntries = mapEntries;
function setValues(set) {
    const array = new Array(set.size);
    let i = 0;
    for (const v of set.values()) {
        array[i++] = v;
    }
    return array;
}
exports.setValues = setValues;
class MapWithCachedArrays {
    constructor() {
        this.map = new Map();
    }
    clearCaches() {
        this.cachedKeys = undefined;
        this.cachedValues = undefined;
    }
    get size() {
        return this.map.size;
    }
    has(key) {
        return this.map.has(key);
    }
    get(key) {
        return this.map.get(key);
    }
    set(key, value) {
        this.map.set(key, value);
        this.clearCaches();
        return this;
    }
    delete(key) {
        const deleted = this.map.delete(key);
        if (deleted) {
            this.clearCaches();
        }
        return deleted;
    }
    clear() {
        this.map.clear();
        this.clearCaches();
    }
    keys() {
        if (!this.cachedKeys) {
            this.cachedKeys = mapKeys(this.map);
        }
        return this.cachedKeys;
    }
    values() {
        if (!this.cachedValues) {
            this.cachedValues = mapValues(this.map);
        }
        return this.cachedValues;
    }
}
exports.MapWithCachedArrays = MapWithCachedArrays;
function copyWitNewLength(arr, newLength) {
    assert(newLength >= arr.length, () => `${newLength} < ${arr.length}`);
    const copy = new Array(newLength);
    for (let i = 0; i < arr.length; i++) {
        copy[i] = arr[i];
    }
    return copy;
}
exports.copyWitNewLength = copyWitNewLength;
function validateStringContainsBoolean(str) {
    if (!str) {
        return false;
    }
    switch (str.toLocaleLowerCase()) {
        case "true":
        case "yes":
        case "1":
            return true;
        case "false":
        case "no":
        case "0":
            return false;
        default:
            return undefined;
    }
}
exports.validateStringContainsBoolean = validateStringContainsBoolean;
function joinStrings(toJoin, sep = ', ', firstSep, lastSep = ' and ') {
    if (toJoin.length == 0) {
        return '';
    }
    const first = toJoin[0];
    if (toJoin.length == 1) {
        return first;
    }
    const last = toJoin[toJoin.length - 1];
    if (toJoin.length == 2) {
        return first + (firstSep ? firstSep : lastSep) + last;
    }
    return first + (firstSep ? firstSep : sep) + toJoin.slice(1, toJoin.length - 1) + lastSep + last;
}
exports.joinStrings = joinStrings;
//# sourceMappingURL=utils.js.map