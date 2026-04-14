import { Static, Type } from "@sinclair/typebox";

export const FlowNodeSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    kind: Type.Union([
      Type.Literal("start"),
      Type.Literal("process"),
      Type.Literal("decision"),
      Type.Literal("end"),
    ]),
    tone: Type.Optional(
      Type.Union([
        Type.Literal("neutral"),
        Type.Literal("info"),
        Type.Literal("success"),
        Type.Literal("warning"),
        Type.Literal("danger"),
      ]),
    ),
    title: Type.String({ minLength: 1 }),
    body: Type.String(),
  },
  { additionalProperties: false },
);

export const FlowEdgeSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    source: Type.String({ minLength: 1 }),
    target: Type.String({ minLength: 1 }),
    label: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export const FlowHighlightSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    nodeId: Type.String({ minLength: 1 }),
    field: Type.Literal("body"),
    startOffset: Type.Integer({ minimum: 0 }),
    endOffset: Type.Integer({ minimum: 0 }),
    tone: Type.Union([
      Type.Literal("info"),
      Type.Literal("success"),
      Type.Literal("warning"),
      Type.Literal("danger"),
    ]),
    note: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export const FlowViewSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    title: Type.String({ minLength: 1 }),
    description: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export const FlowScenarioStepSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    title: Type.String({ minLength: 1 }),
    body: Type.String({ minLength: 1 }),
    activeNodeIds: Type.Array(Type.String({ minLength: 1 })),
    activeEdgeIds: Type.Array(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export const FlowScenarioSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    title: Type.String({ minLength: 1 }),
    description: Type.Optional(Type.String({ minLength: 1 })),
    viewId: Type.Optional(Type.String({ minLength: 1 })),
    steps: Type.Array(FlowScenarioStepSchema, { minItems: 1 }),
  },
  { additionalProperties: false },
);

export const FlowDocumentSchema = Type.Object(
  {
    version: Type.Literal("1.0"),
    title: Type.String({ minLength: 1 }),
    views: Type.Optional(Type.Array(FlowViewSchema, { minItems: 1 })),
    nodes: Type.Array(FlowNodeSchema),
    edges: Type.Array(FlowEdgeSchema),
    highlights: Type.Optional(Type.Array(FlowHighlightSchema)),
    scenarios: Type.Optional(Type.Array(FlowScenarioSchema)),
  },
  {
    $id: "https://interactive-diagrams.dev/schemas/flow-document.schema.json",
    additionalProperties: false,
  },
);

export type FlowNode = Static<typeof FlowNodeSchema>;
export type FlowEdge = Static<typeof FlowEdgeSchema>;
export type FlowHighlight = Static<typeof FlowHighlightSchema>;
export type FlowView = Static<typeof FlowViewSchema>;
export type FlowScenarioStep = Static<typeof FlowScenarioStepSchema>;
export type FlowScenario = Static<typeof FlowScenarioSchema>;
export type FlowDocument = Static<typeof FlowDocumentSchema>;
