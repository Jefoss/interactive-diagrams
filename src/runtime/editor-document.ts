import {
  validateFlowDocument,
  type FlowDocument,
  type FlowEdge,
  type FlowNode,
  type ValidationIssue,
} from "../flow-document/index.js";

export type NodeToneValue = FlowNode["tone"] | "";

export interface NodeFormValues {
  body: string;
  id: string;
  kind: FlowNode["kind"];
  title: string;
  tone: NodeToneValue;
}

export interface EdgeFormValues {
  id: string;
  label: string;
  source: string;
  target: string;
}

export type DocumentEditResult =
  | {
      document: FlowDocument;
      id: string;
      ok: true;
    }
  | {
      issues: ValidationIssue[];
      ok: false;
    };

export function createNodeFormValues(node: FlowNode): NodeFormValues {
  return {
    body: node.body,
    id: node.id,
    kind: node.kind,
    title: node.title,
    tone: node.tone ?? "",
  };
}

export function createEdgeFormValues(edge: FlowEdge): EdgeFormValues {
  return {
    id: edge.id,
    label: edge.label ?? "",
    source: edge.source,
    target: edge.target,
  };
}

export function createEmptyNodeFormValues(
  document: FlowDocument,
  originalId: string | null = null,
): NodeFormValues {
  return {
    body: "",
    id: buildSuggestedNodeId(
      {
        kind: "process",
        title: "",
      },
      collectReservedIds(document, originalId),
    ),
    kind: "process",
    title: "",
    tone: "",
  };
}

export function createEmptyEdgeFormValues(
  document: FlowDocument,
  originalId: string | null = null,
): EdgeFormValues {
  const source = document.nodes[0]?.id ?? "";
  const target = document.nodes[1]?.id ?? document.nodes[0]?.id ?? "";

  return {
    id: buildSuggestedEdgeId(
      { label: "", source, target },
      collectReservedIds(document, originalId),
    ),
    label: "",
    source,
    target,
  };
}

export function slugifyIdentifier(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function buildUniqueIdentifier(
  input: string,
  reservedIds: Iterable<string>,
  fallbackPrefix: string,
): string {
  const base = slugifyIdentifier(input) || fallbackPrefix;
  const used = new Set(reservedIds);

  if (!used.has(base)) {
    return base;
  }

  let suffix = 2;

  while (used.has(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}

export function buildSuggestedNodeId(
  values: Pick<NodeFormValues, "kind" | "title">,
  reservedIds: Iterable<string>,
): string {
  return buildUniqueIdentifier(values.title || values.kind, reservedIds, "node");
}

export function buildSuggestedEdgeId(
  values: Pick<EdgeFormValues, "label" | "source" | "target">,
  reservedIds: Iterable<string>,
): string {
  const basis = [values.source && values.target ? `${values.source} to ${values.target}` : "", values.label]
    .filter(Boolean)
    .join(" ");

  return buildUniqueIdentifier(basis, reservedIds, "edge");
}

export function applyNodeForm(
  document: FlowDocument,
  originalId: string | null,
  values: NodeFormValues,
): DocumentEditResult {
  const normalizedId = values.id.trim();
  const normalizedTitle = values.title.trim();
  const normalizedNode: FlowNode = {
    body: values.body,
    id: normalizedId,
    kind: values.kind,
    title: normalizedTitle,
    ...(values.tone ? { tone: values.tone } : {}),
  };
  const hasExistingNode =
    originalId === null ? false : document.nodes.some((node) => node.id === originalId);

  if (originalId !== null && !hasExistingNode) {
    return {
      ok: false,
      issues: [
        {
          code: "missing-reference",
          path: "/nodes",
          message: `Node "${originalId}" no longer exists in the document.`,
        },
      ],
    };
  }

  const renamed = originalId !== null && originalId !== normalizedId;
  const nextDocument: FlowDocument = {
    ...document,
    nodes:
      originalId === null
        ? [...document.nodes, normalizedNode]
        : document.nodes.map((node) => (node.id === originalId ? normalizedNode : node)),
    edges: renamed
      ? document.edges.map((edge) => ({
          ...edge,
          source: edge.source === originalId ? normalizedId : edge.source,
          target: edge.target === originalId ? normalizedId : edge.target,
        }))
      : document.edges,
    highlights: renamed
      ? document.highlights?.map((highlight) => ({
          ...highlight,
          nodeId: highlight.nodeId === originalId ? normalizedId : highlight.nodeId,
        }))
      : document.highlights,
    scenarios: renamed
      ? document.scenarios?.map((scenario) => ({
          ...scenario,
          steps: scenario.steps.map((step) => ({
            ...step,
            activeNodeIds: step.activeNodeIds.map((nodeId) =>
              nodeId === originalId ? normalizedId : nodeId,
            ),
          })),
        }))
      : document.scenarios,
  };

  return validateEditedDocument(nextDocument, normalizedId);
}

export function applyEdgeForm(
  document: FlowDocument,
  originalId: string | null,
  values: EdgeFormValues,
): DocumentEditResult {
  const normalizedId = values.id.trim();
  const normalizedLabel = values.label.trim();
  const normalizedEdge: FlowEdge = {
    id: normalizedId,
    source: values.source,
    target: values.target,
    ...(normalizedLabel ? { label: normalizedLabel } : {}),
  };
  const hasExistingEdge =
    originalId === null ? false : document.edges.some((edge) => edge.id === originalId);

  if (originalId !== null && !hasExistingEdge) {
    return {
      ok: false,
      issues: [
        {
          code: "missing-reference",
          path: "/edges",
          message: `Edge "${originalId}" no longer exists in the document.`,
        },
      ],
    };
  }

  const renamed = originalId !== null && originalId !== normalizedId;
  const nextDocument: FlowDocument = {
    ...document,
    edges:
      originalId === null
        ? [...document.edges, normalizedEdge]
        : document.edges.map((edge) => (edge.id === originalId ? normalizedEdge : edge)),
    scenarios: renamed
      ? document.scenarios?.map((scenario) => ({
          ...scenario,
          steps: scenario.steps.map((step) => ({
            ...step,
            activeEdgeIds: step.activeEdgeIds.map((edgeId) =>
              edgeId === originalId ? normalizedId : edgeId,
            ),
          })),
        }))
      : document.scenarios,
  };

  return validateEditedDocument(nextDocument, normalizedId);
}

export function deleteNode(document: FlowDocument, nodeId: string): FlowDocument {
  return {
    ...document,
    nodes: document.nodes.filter((node) => node.id !== nodeId),
  };
}

export function deleteEdge(document: FlowDocument, edgeId: string): FlowDocument {
  return {
    ...document,
    edges: document.edges.filter((edge) => edge.id !== edgeId),
  };
}

export function getNodeDeleteBlockers(document: FlowDocument, nodeId: string): string[] {
  const edgeMessages = document.edges
    .filter((edge) => edge.source === nodeId || edge.target === nodeId)
    .map((edge) => `Edge "${edge.id}" still points to this node.`);
  const highlightMessages =
    document.highlights
      ?.filter((highlight) => highlight.nodeId === nodeId)
      .map((highlight) => `Highlight "${highlight.id}" still references this node.`) ?? [];
  const scenarioMessages =
    document.scenarios?.flatMap((scenario) =>
      scenario.steps.flatMap((step) =>
        step.activeNodeIds.includes(nodeId)
          ? [`Scenario step "${step.id}" in "${scenario.id}" still highlights this node.`]
          : [],
      ),
    ) ?? [];

  return [...edgeMessages, ...highlightMessages, ...scenarioMessages];
}

export function getEdgeDeleteBlockers(document: FlowDocument, edgeId: string): string[] {
  return (
    document.scenarios?.flatMap((scenario) =>
      scenario.steps.flatMap((step) =>
        step.activeEdgeIds.includes(edgeId)
          ? [`Scenario step "${step.id}" in "${scenario.id}" still highlights this edge.`]
          : [],
      ),
    ) ?? []
  );
}

export function collectReservedIds(
  document: FlowDocument,
  omittedId: string | null = null,
): Set<string> {
  const ids = new Set<string>();

  for (const view of document.views ?? []) {
    if (view.id !== omittedId) {
      ids.add(view.id);
    }
  }

  for (const node of document.nodes) {
    if (node.id !== omittedId) {
      ids.add(node.id);
    }
  }

  for (const edge of document.edges) {
    if (edge.id !== omittedId) {
      ids.add(edge.id);
    }
  }

  for (const highlight of document.highlights ?? []) {
    if (highlight.id !== omittedId) {
      ids.add(highlight.id);
    }
  }

  for (const scenario of document.scenarios ?? []) {
    if (scenario.id !== omittedId) {
      ids.add(scenario.id);
    }

    for (const step of scenario.steps) {
      if (step.id !== omittedId) {
        ids.add(step.id);
      }
    }
  }

  return ids;
}

function validateEditedDocument(document: FlowDocument, id: string): DocumentEditResult {
  const validation = validateFlowDocument(document);

  if (!validation.valid || !validation.document) {
    return {
      ok: false,
      issues: validation.issues,
    };
  }

  return {
    document: validation.document,
    id,
    ok: true,
  };
}
