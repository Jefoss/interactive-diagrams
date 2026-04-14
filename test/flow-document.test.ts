import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  FlowDocumentSchema,
  validateFlowDocument,
  type FlowDocument,
} from "../src/flow-document/index.js";

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), "fixtures", name), "utf8"));
}

const tests: Array<{ name: string; run: () => void }> = [
  {
    name: "checked-in JSON schema matches the canonical FlowDocument schema",
    run: () => {
      const checkedInSchema = JSON.parse(
        readFileSync(resolve(process.cwd(), "schema/flow-document.schema.json"), "utf8"),
      );
      const canonicalJsonSchema = JSON.parse(JSON.stringify(FlowDocumentSchema));

      assert.deepEqual(checkedInSchema, canonicalJsonSchema);
    },
  },
  {
    name: "valid fixture passes validation",
    run: () => {
      const result = validateFlowDocument(
        readFixture("valid-flow-document.json") as FlowDocument,
      );

      assert.equal(result.valid, true);
      assert.deepEqual(result.issues, []);
    },
  },
  {
    name: "duplicate ids are reported",
    run: () => {
      const result = validateFlowDocument(readFixture("duplicate-id-flow-document.json"));

      assert.equal(result.valid, false);
      assert.equal(result.issues.some((issue) => issue.code === "duplicate-id"), true);
    },
  },
  {
    name: "missing references are reported",
    run: () => {
      const result = validateFlowDocument(readFixture("missing-reference-flow-document.json"));

      assert.equal(result.valid, false);
      assert.equal(result.issues.some((issue) => issue.code === "missing-reference"), true);
    },
  },
  {
    name: "invalid highlight ranges are reported",
    run: () => {
      const result = validateFlowDocument(readFixture("invalid-highlight-flow-document.json"));

      assert.equal(result.valid, false);
      assert.equal(result.issues.some((issue) => issue.code === "invalid-highlight"), true);
    },
  },
];

let failures = 0;

for (const { name, run } of tests) {
  try {
    run();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok - ${name}`);
    console.error(error);
  }
}

if (failures > 0) {
  process.exitCode = 1;
}
