"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFeatureElements = exports.CORE_VERSIONS = exports.FeatureUrl = exports.FeatureVersion = exports.FeatureDefinitions = exports.CoreSpecDefinition = exports.isCoreSpecDirectiveApplication = exports.FeatureDefinition = exports.corePurposes = exports.ErrCoreCheckFailed = exports.coreIdentity = void 0;
const graphql_1 = require("graphql");
const url_1 = require("url");
const definitions_1 = require("./definitions");
const types_1 = require("./types");
const core_schema_1 = require("@apollo/core-schema");
const utils_1 = require("./utils");
exports.coreIdentity = 'https://specs.apollo.dev/core';
const ErrCoreCheckFailed = (causes) => (0, core_schema_1.err)('CheckFailed', {
    message: 'one or more checks failed',
    causes
});
exports.ErrCoreCheckFailed = ErrCoreCheckFailed;
function buildError(message) {
    return new Error(message);
}
exports.corePurposes = [
    'SECURITY',
    'EXECUTION',
];
function purposesDescription(purpose) {
    switch (purpose) {
        case 'SECURITY': return "`SECURITY` features provide metadata necessary to securely resolve fields.";
        case 'EXECUTION': return "`EXECUTION` features provide metadata necessary for operation execution.";
    }
}
class FeatureDefinition {
    constructor(url) {
        this.url = typeof url === 'string' ? FeatureUrl.parse(url) : url;
    }
    get identity() {
        return this.url.identity;
    }
    get version() {
        return this.url.version;
    }
    isSpecType(type) {
        const nameInSchema = this.nameInSchema(type.schema());
        return nameInSchema !== undefined && type.name.startsWith(`${nameInSchema}__`);
    }
    isSpecDirective(directive) {
        const nameInSchema = this.nameInSchema(directive.schema());
        return nameInSchema != undefined && (directive.name === nameInSchema || directive.name.startsWith(`${nameInSchema}__`));
    }
    nameInSchema(schema) {
        const feature = this.featureInSchema(schema);
        return feature === null || feature === void 0 ? void 0 : feature.nameInSchema;
    }
    elementNameInSchema(schema, elementName) {
        const nameInSchema = this.nameInSchema(schema);
        return nameInSchema
            ? (elementName === nameInSchema ? nameInSchema : `${nameInSchema}__${elementName}`)
            : undefined;
    }
    rootDirective(schema) {
        const name = this.nameInSchema(schema);
        return name ? schema.directive(name) : undefined;
    }
    directive(schema, elementName) {
        const name = this.elementNameInSchema(schema, elementName);
        return name ? schema.directive(name) : undefined;
    }
    type(schema, elementName) {
        const name = this.elementNameInSchema(schema, elementName);
        return name ? schema.type(name) : undefined;
    }
    addRootDirective(schema) {
        return schema.addDirectiveDefinition(this.nameInSchema(schema));
    }
    addDirective(schema, name) {
        return schema.addDirectiveDefinition(this.elementNameInSchema(schema, name));
    }
    addScalarType(schema, name) {
        return schema.addType(new definitions_1.ScalarType(this.elementNameInSchema(schema, name)));
    }
    addEnumType(schema, name) {
        return schema.addType(new definitions_1.EnumType(this.elementNameInSchema(schema, name)));
    }
    featureInSchema(schema) {
        const features = schema.coreFeatures;
        if (!features) {
            throw buildError(`Schema is not a core schema (add @core first)`);
        }
        return features.getByIdentity(this.identity);
    }
    toString() {
        return `${this.identity}/${this.version}`;
    }
}
exports.FeatureDefinition = FeatureDefinition;
function isCoreSpecDirectiveApplication(directive) {
    var _a;
    const definition = directive.definition;
    if (!definition) {
        return false;
    }
    const featureArg = definition.argument('feature');
    if (!featureArg || !(0, types_1.sameType)(featureArg.type, new definitions_1.NonNullType(directive.schema().stringType()))) {
        return false;
    }
    const asArg = definition.argument('as');
    if (asArg && !(0, types_1.sameType)(asArg.type, directive.schema().stringType())) {
        return false;
    }
    if (!definition.repeatable || definition.locations.length !== 1 || definition.locations[0] !== graphql_1.DirectiveLocation.SCHEMA) {
        return false;
    }
    const args = directive.arguments();
    try {
        const url = FeatureUrl.parse(args.feature);
        return url.identity === exports.coreIdentity && directive.name === ((_a = args.as) !== null && _a !== void 0 ? _a : 'core');
    }
    catch (err) {
        return false;
    }
}
exports.isCoreSpecDirectiveApplication = isCoreSpecDirectiveApplication;
class CoreSpecDefinition extends FeatureDefinition {
    constructor(version) {
        super(new FeatureUrl(exports.coreIdentity, 'core', version));
    }
    addElementsToSchema(_) {
    }
    addToSchema(schema, as) {
        const existing = schema.coreFeatures;
        if (existing) {
            if (existing.coreItself.url.identity === this.identity) {
                return;
            }
            else {
                throw buildError(`Cannot add feature ${this} to the schema, it already uses ${existing.coreItself.url}`);
            }
        }
        const nameInSchema = as !== null && as !== void 0 ? as : this.url.name;
        const core = schema.addDirectiveDefinition(nameInSchema).addLocations(graphql_1.DirectiveLocation.SCHEMA);
        core.repeatable = true;
        core.addArgument('feature', new definitions_1.NonNullType(schema.stringType()));
        core.addArgument('as', schema.stringType());
        if (this.supportPurposes()) {
            const purposeEnum = schema.addType(new definitions_1.EnumType(`${nameInSchema}__Purpose`));
            for (const purpose of exports.corePurposes) {
                purposeEnum.addValue(purpose).description = purposesDescription(purpose);
            }
            core.addArgument('for', purposeEnum);
        }
        const args = { feature: this.toString() };
        if (as) {
            args.as = as;
        }
        schema.schemaDefinition.applyDirective(nameInSchema, args);
    }
    supportPurposes() {
        return this.version.strictlyGreaterThan(new FeatureVersion(0, 1));
    }
    extractFeature(schema) {
        const features = schema.coreFeatures;
        if (!features) {
            throw buildError(`Schema is not a core schema (add @core first)`);
        }
        if (!features.coreItself.url.version.equals(this.version)) {
            throw buildError(`Cannot use this version of @core (${this.version}), the schema uses version ${features.coreItself.url.version}`);
        }
        return features.coreItself;
    }
    coreDirective(schema) {
        const feature = this.extractFeature(schema);
        const directive = schema.directive(feature.nameInSchema);
        return directive;
    }
    coreVersion(schema) {
        const feature = this.extractFeature(schema);
        return feature.url.version;
    }
    applyFeatureToSchema(schema, feature, as, purpose) {
        const coreDirective = this.coreDirective(schema);
        const args = {
            feature: feature.toString(),
            as,
        };
        if (this.supportPurposes() && purpose) {
            args.for = purpose;
        }
        schema.schemaDefinition.applyDirective(coreDirective, args);
        feature.addElementsToSchema(schema);
    }
}
exports.CoreSpecDefinition = CoreSpecDefinition;
class FeatureDefinitions {
    constructor(identity) {
        this.identity = identity;
        this._definitions = [];
    }
    add(definition) {
        if (definition.identity !== this.identity) {
            throw buildError(`Cannot add definition for ${definition} to the versions of definitions for ${this.identity}`);
        }
        if (this._definitions.find(def => definition.version.equals(def.version))) {
            return this;
        }
        this._definitions.push(definition);
        this._definitions.sort((def1, def2) => -def1.version.compareTo(def2.version));
        return this;
    }
    find(requested) {
        return this._definitions.find(def => def.version.satisfies(requested));
    }
    versions() {
        return this._definitions.map(def => def.version);
    }
    latest() {
        (0, utils_1.assert)(this._definitions.length > 0, 'Trying to get latest when no definitions exist');
        return this._definitions[0];
    }
}
exports.FeatureDefinitions = FeatureDefinitions;
class FeatureVersion {
    constructor(major, minor) {
        this.major = major;
        this.minor = minor;
    }
    static parse(input) {
        const match = input.match(this.VERSION_RE);
        if (!match) {
            throw new graphql_1.GraphQLError(`Expected a version string (of the form v1.2), got ${input}`);
        }
        return new this(+match[1], +match[2]);
    }
    satisfies(required) {
        const { major, minor } = this;
        const { major: rMajor, minor: rMinor } = required;
        return rMajor == major && (major == 0
            ? rMinor == minor
            : rMinor <= minor);
    }
    get series() {
        const { major } = this;
        return major > 0 ? `${major}.x` : String(this);
    }
    compareTo(other) {
        if (this.major > other.major) {
            return 1;
        }
        if (this.major < other.major) {
            return -1;
        }
        if (this.minor > other.minor) {
            return 1;
        }
        if (this.minor < other.minor) {
            return -1;
        }
        return 0;
    }
    strictlyGreaterThan(version) {
        return this.compareTo(version) > 0;
    }
    toString() {
        return `v${this.major}.${this.minor}`;
    }
    equals(other) {
        return this.major === other.major && this.minor === other.minor;
    }
}
exports.FeatureVersion = FeatureVersion;
FeatureVersion.VERSION_RE = /^v(\d+)\.(\d+)$/;
class FeatureUrl {
    constructor(identity, name, version, element) {
        this.identity = identity;
        this.name = name;
        this.version = version;
        this.element = element;
    }
    static parse(input, node) {
        const url = new url_1.URL(input);
        if (!url.pathname || url.pathname === '/') {
            throw new graphql_1.GraphQLError(`Missing path in feature url '${url}'`, node);
        }
        const path = url.pathname.split('/');
        const verStr = path.pop();
        if (!verStr) {
            throw new graphql_1.GraphQLError(`Missing version component in feature url '${url}'`, node);
        }
        const version = FeatureVersion.parse(verStr);
        const name = path[path.length - 1];
        if (!name) {
            throw new graphql_1.GraphQLError(`Missing feature name component in feature url '${url}'`, node);
        }
        const element = url.hash ? url.hash.slice(1) : undefined;
        url.hash = '';
        url.search = '';
        url.password = '';
        url.username = '';
        url.pathname = path.join('/');
        return new FeatureUrl(url.toString(), name, version, element);
    }
    static decode(node) {
        return this.parse(node.value, node);
    }
    satisfies(requested) {
        return requested.identity === this.identity &&
            this.version.satisfies(requested.version);
    }
    equals(other) {
        return this.identity === other.identity &&
            this.version.equals(other.version);
    }
    get url() {
        return this.element ?
            `${this.identity}/${this.version}#${this.element}`
            : `${this.identity}/${this.version}`;
    }
    get isDirective() {
        var _a;
        return (_a = this.element) === null || _a === void 0 ? void 0 : _a.startsWith('@');
    }
    get elementName() {
        var _a;
        return this.isDirective ? (_a = this.element) === null || _a === void 0 ? void 0 : _a.slice(1) : this.element;
    }
    get base() {
        if (!this.element)
            return this;
        return new FeatureUrl(this.identity, this.name, this.version);
    }
    toString() {
        return this.url;
    }
}
exports.FeatureUrl = FeatureUrl;
exports.CORE_VERSIONS = new FeatureDefinitions(exports.coreIdentity)
    .add(new CoreSpecDefinition(new FeatureVersion(0, 1)))
    .add(new CoreSpecDefinition(new FeatureVersion(0, 2)));
function removeFeatureElements(schema, feature) {
    const featureDirectives = schema.directives().filter(d => feature.isFeatureDefinition(d));
    featureDirectives.forEach(d => d.remove().forEach(application => application.remove()));
    const featureTypes = schema.types().filter(t => feature.isFeatureDefinition(t));
    featureTypes.forEach(type => {
        const references = type.remove();
        if (references.length > 0) {
            throw new graphql_1.GraphQLError(`Cannot remove elements of feature ${feature} as feature type ${type} is referenced by elements: ${references.join(', ')}`, references.map(r => r.sourceAST).filter(n => n !== undefined));
        }
    });
}
exports.removeFeatureElements = removeFeatureElements;
//# sourceMappingURL=coreSpec.js.map