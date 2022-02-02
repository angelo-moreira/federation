"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStructuralFieldSubtype = exports.isStructuralInputSubType = void 0;
const federation_internals_1 = require("@apollo/federation-internals");
function typeComparison(t1, t2, typeTest, test) {
    if (typeTest(t1)) {
        return typeTest(t2) ? test(t1, t2) : false;
    }
    return typeTest(t2) ? false : undefined;
}
function isSubset(set, maybeSubset) {
    return maybeSubset.every(v => set.includes(v));
}
function isAccessible(element) {
    return element.hasAppliedDirective('inaccessible');
}
function accessibleEnumValues(enumType) {
    return enumType
        .values
        .filter(v => isAccessible(v))
        .map(v => v.name);
}
function isEnumInputSubtype(enumType, maybeSubType) {
    if (enumType.name != maybeSubType.name) {
        return false;
    }
    return isSubset(accessibleEnumValues(maybeSubType), accessibleEnumValues(enumType));
}
function isObjectInputSubtype(objectInputType, maybeSubType) {
    if (objectInputType.name != maybeSubType.name) {
        return false;
    }
    return maybeSubType.fields()
        .filter(isAccessible)
        .every(subtypeField => {
        const field = objectInputType.field(subtypeField.name);
        return field && isAccessible(field) ? isStructuralInputSubType(field.type, subtypeField.type) : false;
    });
}
function isStructuralInputSubType(inputType, maybeSubType) {
    if ((0, federation_internals_1.isNonNullType)(inputType)) {
        return (0, federation_internals_1.isNonNullType)(maybeSubType) ? isStructuralInputSubType(inputType.ofType, maybeSubType.ofType) : false;
    }
    if ((0, federation_internals_1.isNonNullType)(maybeSubType)) {
        return isStructuralInputSubType(inputType, maybeSubType.ofType);
    }
    let c = typeComparison(inputType, maybeSubType, federation_internals_1.isListType, (l1, l2) => isStructuralInputSubType(l1.ofType, l2.ofType));
    if (c != undefined) {
        return c;
    }
    c = typeComparison(inputType, maybeSubType, federation_internals_1.isScalarType, (l1, l2) => l1.name == l2.name);
    if (c != undefined) {
        return c;
    }
    c = typeComparison(inputType, maybeSubType, federation_internals_1.isEnumType, (l1, l2) => isEnumInputSubtype(l1, l2));
    if (c != undefined) {
        return c;
    }
    c = typeComparison(inputType, maybeSubType, federation_internals_1.isInputObjectType, (l1, l2) => isObjectInputSubtype(l1, l2));
    return c !== null && c !== void 0 ? c : false;
}
exports.isStructuralInputSubType = isStructuralInputSubType;
function getArg(field, argName) {
    const arg = field.argument(argName);
    return arg && isAccessible(arg) ? arg : undefined;
}
function isStructuralFieldSubtype(fieldDef, maybeSubType, allowedRules = federation_internals_1.DEFAULT_SUBTYPING_RULES, unionMembershipTester = (u, m) => u.hasTypeMember(m), implementsInterfaceTester = (m, i) => m.implementsInterface(i)) {
    if (fieldDef.name !== maybeSubType.name) {
        return false;
    }
    if (!(0, federation_internals_1.isSubtype)(maybeSubType.type, fieldDef.type, allowedRules, unionMembershipTester, implementsInterfaceTester)) {
        return false;
    }
    for (const argDef of maybeSubType.arguments().filter(isAccessible)) {
        const providedArgDef = getArg(fieldDef, argDef.name);
        if (!providedArgDef || !isStructuralInputSubType(providedArgDef.type, argDef.type)) {
            return false;
        }
    }
    return true;
}
exports.isStructuralFieldSubtype = isStructuralFieldSubtype;
//# sourceMappingURL=structuralSubtyping.js.map