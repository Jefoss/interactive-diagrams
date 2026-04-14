import { Value } from "@sinclair/typebox/value";

import {
  FlowDocumentSchema,
  type FlowDocument,
  type FlowHighlight,
  type FlowScenario,
} from "./schema.js";

export type ValidationIssueCode =
  | "schema"
  | "duplicate-id"
  | "missing-reference"
  | "invalid-highlight";

export interface ValidationIssue {
  code: ValidationIssueCode;
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  document?: FlowDocument;
}

export function validateFlowDocument(input: unknown): ValidationResult {
  if (!Value.Check(FlowDocumentSchema, input)) {
    return {
      valid: false,
      issues: [...Value.Errors(FlowDocumentSchema, input)].map((error) => ({
        code: "schema",
        path: error.path || "/",
        message: error.message || "Schema validation failed",
      })),
    };
  }

  const document: FlowDocument = input;
  const issues: ValidationIssue[] = [];
  const seenIds = new Map<string, string>();
  const nodeIds = new Set(document.nodes.map((node) => node.id));
  const edgeIds = new Set(document.edges.map((edge) => edge.id));
  const viewIds = new Set((document.views ?? []).map((view) => view.id));
  const nodesById = new Map<string, FlowDocument["nodes"][number]>(
    document.nodes.map((node) => [node.id, node]),
  );

  (document.views ?? []).forEach((view, index) => {
    collectDuplicateId(view.id, `/views/${index}/id`, seenIds, issues);
  });

  document.nodes.forEach((node, index) => {
    collectDuplicateId(node.id, `/nodes/${index}/id`, seenIds, issues);
  });

  document.edges.forEach((edge, index) => {
    collectDuplicateId(edge.id, `/edges/${index}/id`, seenIds, issues);

    if (!nodeIds.has(edge.source)) {
      issues.push({
        code: "missing-reference",
        path: `/edges/${index}/source`,
        message: `Edge source "${edge.source}" does not match any node id`,
      });
    }

    if (!nodeIds.has(edge.target)) {
      issues.push({
        code: "missing-reference",
        path: `/edges/${index}/target`,
        message: `Edge target "${edge.target}" does not match any node id`,
      });
    }
  });

  (document.highlights ?? []).forEach((highlight, index) => {
    collectDuplicateId(highlight.id, `/highlights/${index}/id`, seenIds, issues);
    validateHighlight(highlight, index, nodesById, issues);
  });

  (document.scenarios ?? []).forEach((scenario, index) => {
    collectDuplicateId(scenario.id, `/scenarios/${index}/id`, seenIds, issues);
    validateScenario(scenario, index, viewIds, nodeIds, edgeIds, seenIds, issues);
  });

  return issues.length === 0
    ? { valid: true, issues: [], document }
    : { valid: false, issues, document };
}

function collectDuplicateId(
  id: string,
  path: string,
  seenIds: Map<string, string>,
  issues: ValidationIssue[],
): void {
  const existingPath = seenIds.get(id);

  if (existingPath) {
    issues.push({
      code: "duplicate-id",
      path,
      message: `Duplicate id "${id}" already used at ${existingPath}`,
    });
    return;
  }

  seenIds.set(id, path);
}

function validateHighlight(
  highlight: FlowHighlight,
  index: number,
  nodesById: Map<string, FlowDocument["nodes"][number]>,
  issues: ValidationIssue[],
): void {
  const node = nodesById.get(highlight.nodeId);

  if (!node) {
    issues.push({
      code: "missing-reference",
      path: `/highlights/${index}/nodeId`,
      message: `Highlight nodeId "${highlight.nodeId}" does not match any node id`,
    });
    return;
  }

  const bodyLength = node.body.length;

  if (highlight.startOffset >= highlight.endOffset) {
    issues.push({
      code: "invalid-highlight",
      path: `/highlights/${index}`,
      message: "Highlight range must have startOffset < endOffset",
    });
  }

  if (highlight.endOffset > bodyLength) {
    issues.push({
      code: "invalid-highlight",
      path: `/highlights/${index}`,
      message: `Highlight range ends at ${highlight.endOffset}, beyond body length ${bodyLength}`,
    });
  }
}

function validateScenario(
  scenario: FlowScenario,
  scenarioIndex: number,
  viewIds: Set<string>,
  nodeIds: Set<string>,
  edgeIds: Set<string>,
  seenIds: Map<string, string>,
  issues: ValidationIssue[],
): void {
  if (scenario.viewId && !viewIds.has(scenario.viewId)) {
    issues.push({
      code: "missing-reference",
      path: `/scenarios/${scenarioIndex}/viewId`,
      message: `Scenario viewId "${scenario.viewId}" does not match any view id`,
    });
  }

  scenario.steps.forEach((step, stepIndex) => {
    collectDuplicateId(
      step.id,
      `/scenarios/${scenarioIndex}/steps/${stepIndex}/id`,
      seenIds,
      issues,
    );

    step.activeNodeIds.forEach((nodeId, nodeIndex) => {
      if (!nodeIds.has(nodeId)) {
        issues.push({
          code: "missing-reference",
          path: `/scenarios/${scenarioIndex}/steps/${stepIndex}/activeNodeIds/${nodeIndex}`,
          message: `Scenario step node "${nodeId}" does not match any node id`,
        });
      }
    });

    step.activeEdgeIds.forEach((edgeId, edgeIndex) => {
      if (!edgeIds.has(edgeId)) {
        issues.push({
          code: "missing-reference",
          path: `/scenarios/${scenarioIndex}/steps/${stepIndex}/activeEdgeIds/${edgeIndex}`,
          message: `Scenario step edge "${edgeId}" does not match any edge id`,
        });
      }
    });
  });
}
