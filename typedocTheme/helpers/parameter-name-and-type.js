"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const type_1 = require("./type");
function parameterNameAndType(displaySymbol = true) {
    const md = [];
    if (displaySymbol) {
        md.push('▪');
    }
    if (this.flags && !this.flags.isRest) {
        md.push(this.flags.map(flag => `\`${flag}\` `));
    }
    md.push(`${this.flags.isRest ? '...' : ''} **${this.name}**`);
    if (this.type) {
        md.push(`: *${type_1.type.call(this.type)}*`);
    }
    if (this.defaultValue) {
        md.push(`= ${this.defaultValue}`);
    }
    return md.join('');
}
exports.parameterNameAndType = parameterNameAndType;
