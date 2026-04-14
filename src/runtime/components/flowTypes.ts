import type { FlowNode } from "../../flow-document/index.js";

export interface RuntimeNodeData {
  bodyLines: string[];
  isActive: boolean;
  isDimmed: boolean;
  kind: FlowNode["kind"];
  tone?: FlowNode["tone"];
  title: string;
}

export type EdgeRoute = "default" | "upper" | "lower";

export interface RuntimeEdgeData {
  isActive: boolean;
  isDimmed: boolean;
  route: EdgeRoute;
}
