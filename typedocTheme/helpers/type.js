"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Handlebars = require("handlebars");
const types_1 = require("typedoc/dist/lib/models/types");
function type() {
    if (this instanceof types_1.ReferenceType && (this.reflection || (this.name && this.typeArguments))) {
        return getReferenceType(this);
    }
    if (this instanceof types_1.ArrayType && this.elementType) {
        return getArrayType(this);
    }
    if (this instanceof types_1.UnionType && this.types) {
        return getUnionType(this);
    }
    if (this instanceof types_1.IntersectionType && this.types) {
        return getIntersectionType(this);
    }
    if (this instanceof types_1.TupleType && this.elements) {
        return getTupleType(this);
    }
    if (this instanceof types_1.IntrinsicType && this.name) {
        return getIntrinsicType(this);
    }
    if (this instanceof types_1.StringLiteralType && this.value) {
        return getStringLiteralType(this);
    }
    if (this instanceof types_1.TypeOperatorType || this instanceof types_1.ReflectionType) {
        return this;
    }
    return this;
}
exports.type = type;
function getReferenceType(model) {
    const reflection = model.reflection
        ? [`[${model.reflection.name}](${Handlebars.helpers.relativeURL.call(this, model.reflection.url)})`]
        : [model.name];
    if (model.typeArguments) {
        reflection.push(`‹${model.typeArguments.map(typeArgument => `${type.call(typeArgument)}`).join(', ')}›`);
    }
    return reflection.join('');
}
function getArrayType(model) {
    return `${type.call(model.elementType)}[]`;
}
function getUnionType(model) {
    return model.types.map(unionType => type.call(unionType)).join(' | ');
}
function getIntersectionType(model) {
    return model.types.map(intersectionType => type.call(intersectionType)).join(' & ');
}
function getTupleType(model) {
    return `[${model.elements.map(element => type.call(element)).join(', ')}]`;
}
function getIntrinsicType(model) {
    return model.name;
}
function getStringLiteralType(model) {
    return `"${model.value}"`;
}
