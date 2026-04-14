import {
  BaseEdge,
  EdgeLabelRenderer,
  MarkerType,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";

import type { RuntimeEdgeData } from "./flowTypes.js";

const EDGE_LABEL_OFFSET = 10;
const EDGE_ROUTE_OFFSET = 36;
const EDGE_ROUTE_LIFT = 58;
const ACTIVE_EDGE_COLOR = "rgba(191, 91, 44, 0.96)";
const DIMMED_EDGE_COLOR = "rgba(125, 94, 72, 0.08)";
const DEFAULT_EDGE_COLOR = "rgba(125, 94, 72, 0.72)";

export function FlowEdgeComponent({
  data,
  label,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
}: EdgeProps<RuntimeEdgeData>) {
  const [path, labelX, labelY] = getSmoothStepPath({
    borderRadius: 18,
    centerY: getCenterY(data?.route, sourceY, targetY),
    offset: EDGE_ROUTE_OFFSET,
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const edgeColor = getEdgeColor(data);
  const edgeWidth = data?.isActive ? 4.4 : 3;
  const resolvedLabelPosition = getLabelPosition({
    labelX,
    labelY,
    route: data?.route,
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={{
          color: edgeColor,
          height: 18,
          type: MarkerType.ArrowClosed,
          width: 18,
        }}
        style={{
          opacity: data?.isDimmed ? 0.12 : 1,
          stroke: edgeColor,
          strokeWidth: edgeWidth,
        }}
      />
      {label && !data?.isDimmed ? (
        <EdgeLabelRenderer>
          <div
            className={[
              "flow-edge-label",
              data?.isActive ? "is-active" : "",
              data?.isDimmed ? "is-dimmed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              transform: `translate(-50%, -50%) translate(${resolvedLabelPosition.x}px, ${resolvedLabelPosition.y}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

function getLabelPosition(input: {
  labelX: number;
  labelY: number;
  route: RuntimeEdgeData["route"] | undefined;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}): { x: number; y: number } {
  if (input.route === "upper") {
    return {
      x: (input.sourceX + input.targetX) / 2,
      y: Math.min(input.sourceY, input.targetY) - 18,
    };
  }

  if (input.route === "lower") {
    return {
      x: (input.sourceX + input.targetX) / 2,
      y: Math.max(input.sourceY, input.targetY) + 18,
    };
  }

  return {
    x: input.labelX,
    y: input.labelY + getLabelShiftY(input.route),
  };
}

function getLabelShiftY(route: RuntimeEdgeData["route"] | undefined): number {
  if (route === "upper") {
    return 6;
  }

  if (route === "lower") {
    return -8;
  }

  return -EDGE_LABEL_OFFSET;
}

function getCenterY(
  route: RuntimeEdgeData["route"] | undefined,
  sourceY: number,
  targetY: number,
): number | undefined {
  if (route === "upper") {
    return Math.min(sourceY, targetY) - EDGE_ROUTE_LIFT;
  }

  if (route === "lower") {
    return Math.max(sourceY, targetY) + EDGE_ROUTE_LIFT;
  }

  return undefined;
}

function getEdgeColor(data: RuntimeEdgeData | undefined): string {
  if (data?.isActive) {
    return ACTIVE_EDGE_COLOR;
  }

  if (data?.isDimmed) {
    return DIMMED_EDGE_COLOR;
  }

  return DEFAULT_EDGE_COLOR;
}
