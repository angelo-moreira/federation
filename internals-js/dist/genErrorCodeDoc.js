"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const error_1 = require("./error");
const header = `---
title: Federation error codes
sidebar_title: Error codes
---

When Apollo Gateway attempts to **compose** the schemas provided by your [subgraphs](./subgraphs/) into a **supergraph schema**, it confirms that:

* The subgraphs are valid
* The resulting supergraph schema is valid
* The gateway has all of the information it needs to execute operations against the resulting schema

If Apollo Gateway encounters an error, composition fails. This document lists subgraphs and composition error codes and their root causes.
`;
function makeMardownArray(headers, rows) {
    const columns = headers.length;
    let out = '| ' + headers.join(' | ') + ' |\n';
    out += '|' + headers.map(_ => '---').join('|') + '|\n';
    for (const row of rows) {
        (0, utils_1.assert)(row.length <= columns, `Row [${row}] has too columns (expect ${columns} but got ${row.length})`);
        const frow = row.length === columns
            ? row
            : row.concat(new Array(columns - row.length).fill(''));
        out += '| ' + frow.join(' | ') + ' |\n';
    }
    return out;
}
const rows = Object.values(error_1.ERRORS).map(def => [
    '`' + def.code + '`',
    def.description,
    def.metadata.addedIn,
    def.metadata.replaces ? `Replaces: ${def.metadata.replaces.map(c => '`' + c + '`').join(', ')}` : ''
]);
const sortRowsByCode = (r1, r2) => r1[0].localeCompare(r2[0]);
rows.sort(sortRowsByCode);
const errorsSection = `## Errors

The following errors may be raised by composition:

` + makeMardownArray(['Code', 'Description', 'Since', 'Comment'], rows);
const removedErrors = error_1.REMOVED_ERRORS
    .map(([code, comment]) => ['`' + code + '`', comment])
    .sort(sortRowsByCode);
const removedSection = `## Removed codes

The following section lists code that have been removed and are not longer generated by the gateway version this is the documentation for.

` + makeMardownArray(['Removed Code', 'Comment'], removedErrors);
console.log(header + '\n\n'
    + errorsSection + '\n\n'
    + removedSection);
//# sourceMappingURL=genErrorCodeDoc.js.map