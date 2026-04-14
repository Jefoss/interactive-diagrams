import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { FlowDocumentSchema } from "../src/flow-document/schema.js";

const outputPath = resolve("schema/flow-document.schema.json");

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(FlowDocumentSchema, null, 2)}\n`);
