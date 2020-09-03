"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Handlebars = require("handlebars");
const typedoc_1 = require("typedoc");
const types_1 = require("typedoc/dist/lib/models/types");
function typeAndParent() {
    if (this instanceof types_1.ReferenceType && this.reflection) {
        const md = [];
        if (this.reflection instanceof typedoc_1.SignatureReflection) {
            if (this.reflection.parent.parent.url) {
                md.push(`[${this.reflection.parent.parent.name}](${Handlebars.helpers.relativeURL.call(this, this.reflection.parent.parent.url)})`);
            }
            else {
                md.push(this.reflection.parent.parent.name);
            }
        }
        else {
            if (this.reflection.parent.url) {
                md.push(`[${this.reflection.parent.name}](${Handlebars.helpers.relativeURL.call(this, this.reflection.parent.url)})`);
            }
            else {
                md.push(this.reflection.parent.name);
            }
            if (this.reflection.url) {
                md.push(`[${this.reflection.name}](${Handlebars.helpers.relativeURL.call(this, this.reflection.url)})`);
            }
            else {
                md.push(this.reflection.name);
            }
        }
        return md.join('.');
    }
    return 'void';
}
exports.typeAndParent = typeAndParent;
