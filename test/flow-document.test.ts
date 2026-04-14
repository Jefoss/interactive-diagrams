import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  FlowDocumentSchema,
  validateFlowDocument,
  type FlowDocument,
} from "../src/flow-document/index.js";
import {
  buildEditorUrlSearchParams,
  buildViewerUrlSearchParams,
  readEditorUrlState,
  readViewerUrlState,
} from "../src/runtime/url-state.js";

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
    name: "valid fixture with scenarios passes validation",
    run: () => {
      const result = validateFlowDocument(
        readFixture("valid-flow-document.json") as FlowDocument,
      );

      assert.equal(result.valid, true);
      assert.deepEqual(result.issues, []);
    },
  },
  {
    name: "scenario references are validated",
    run: () => {
      const input = readFixture("valid-flow-document.json") as FlowDocument;

      input.scenarios?.[0]?.steps[0]?.activeNodeIds.push("missing-node");

      const result = validateFlowDocument(input);

      assert.equal(result.valid, false);
      assert.equal(result.issues.some((issue) => issue.code === "missing-reference"), true);
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
  {
    name: "viewer URL state loads the requested scenario and step",
    run: () => {
      const document = readFixture("valid-flow-document.json") as FlowDocument;
      const state = readViewerUrlState(
        document,
        "?view=overview&scenario=manual-review&mode=interactive&step=2",
      );

      assert.deepEqual(state, {
        mode: "interactive",
        scenarioId: "manual-review",
        step: 2,
        viewId: "overview",
      });
    },
  },
  {
    name: "viewer URL state falls back to the first scenario that matches the requested view",
    run: () => {
      const document = {
        ...(readFixture("valid-flow-document.json") as FlowDocument),
        views: [
          { id: "overview", title: "Overview" },
          { id: "operations", title: "Operations" },
        ],
        scenarios: [
          {
            id: "operations-review",
            title: "Operations review",
            viewId: "operations",
            steps: [
              {
                id: "operations-step",
                title: "Step",
                body: "Step body",
                activeNodeIds: ["start"],
                activeEdgeIds: [],
              },
            ],
          },
        ],
      } satisfies FlowDocument;
      const state = readViewerUrlState(document, "?view=operations&mode=interactive");

      assert.deepEqual(state, {
        mode: "interactive",
        scenarioId: "operations-review",
        step: 0,
        viewId: "operations",
      });
    },
  },
  {
    name: "viewer URL state uses the scenario view when the URL view conflicts",
    run: () => {
      const document = {
        ...(readFixture("valid-flow-document.json") as FlowDocument),
        views: [
          { id: "overview", title: "Overview" },
          { id: "operations", title: "Operations" },
        ],
        scenarios: [
          {
            id: "operations-review",
            title: "Operations review",
            viewId: "operations",
            steps: [
              {
                id: "operations-step",
                title: "Step",
                body: "Step body",
                activeNodeIds: ["start"],
                activeEdgeIds: [],
              },
            ],
          },
        ],
      } satisfies FlowDocument;
      const state = readViewerUrlState(
        document,
        "?view=overview&scenario=operations-review&mode=interactive",
      );

      assert.deepEqual(state, {
        mode: "interactive",
        scenarioId: "operations-review",
        step: 0,
        viewId: "operations",
      });
    },
  },
  {
    name: "viewer URL state ignores invalid views when the selected scenario has its own view",
    run: () => {
      const document = {
        ...(readFixture("valid-flow-document.json") as FlowDocument),
        views: [
          { id: "overview", title: "Overview" },
          { id: "operations", title: "Operations" },
        ],
        scenarios: [
          {
            id: "operations-review",
            title: "Operations review",
            viewId: "operations",
            steps: [
              {
                id: "operations-step",
                title: "Step",
                body: "Step body",
                activeNodeIds: ["start"],
                activeEdgeIds: [],
              },
            ],
          },
        ],
      } satisfies FlowDocument;
      const state = readViewerUrlState(
        document,
        "?view=missing&scenario=operations-review&mode=interactive",
      );

      assert.deepEqual(state, {
        mode: "interactive",
        scenarioId: "operations-review",
        step: 0,
        viewId: "operations",
      });
    },
  },
  {
    name: "viewer diagram mode keeps an explicit view even when a scenario is present",
    run: () => {
      const document = {
        ...(readFixture("valid-flow-document.json") as FlowDocument),
        views: [
          { id: "overview", title: "Overview" },
          { id: "operations", title: "Operations" },
        ],
        scenarios: [
          {
            id: "operations-review",
            title: "Operations review",
            viewId: "operations",
            steps: [
              {
                id: "operations-step",
                title: "Step",
                body: "Step body",
                activeNodeIds: ["start"],
                activeEdgeIds: [],
              },
            ],
          },
        ],
      } satisfies FlowDocument;
      const state = readViewerUrlState(
        document,
        "?view=overview&scenario=operations-review&mode=diagram",
      );

      assert.deepEqual(state, {
        mode: "diagram",
        scenarioId: "operations-review",
        step: 0,
        viewId: "overview",
      });
    },
  },
  {
    name: "editor URL state normalizes invalid views to the first available view",
    run: () => {
      const document = readFixture("valid-flow-document.json") as FlowDocument;
      const state = readEditorUrlState(document, "?view=missing");

      assert.deepEqual(state, {
        viewId: "overview",
      });
    },
  },
  {
    name: "runtime URL state serializers emit canonical query strings",
    run: () => {
      assert.equal(
        buildViewerUrlSearchParams({
          mode: "interactive",
          scenarioId: "manual-review",
          step: 1,
          viewId: "overview",
        }).toString(),
        "view=overview&scenario=manual-review&mode=interactive&step=1",
      );
      assert.equal(
        buildEditorUrlSearchParams({
          viewId: "overview",
        }).toString(),
        "view=overview",
      );
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
