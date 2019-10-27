"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function reflectionTitle() {
    const title = [];
    if (this.model.kindString) {
        title.push(`${this.model.kindString}:`);
    }
    title.push(this.model.name);
    if (this.model.typeParameters) {
        const typeParameters = this.model.typeParameters.map(typeParameter => typeParameter.name).join(', ');
        title.push(`<**${typeParameters}**>`);
    }
    if (title[0] === "accessible-pipeline") {
        title[0] = "Type-related documentation"
    }
    if (title[0] === "External module:") {
        title.shift();
    }
    return title.join(' ');
}
exports.reflectionTitle = reflectionTitle;
