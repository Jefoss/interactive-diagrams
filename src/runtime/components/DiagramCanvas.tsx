import {
  Background,
  BackgroundVariant,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";

import type { FlowDocument } from "../../flow-document/index.js";
import { computeDiagramLayout } from "../layout.js";
import { FlowEdgeComponent } from "./FlowEdgeComponent.js";
import { FlowNodeComponent } from "./FlowNodeComponent.js";
import type { EdgeRoute, RuntimeEdgeData, RuntimeNodeData } from "./flowTypes.js";

interface DiagramCanvasProps {
  document: FlowDocument;
  activeNodeIds: Set<string>;
  activeEdgeIds: Set<string>;
  interactiveMode: boolean;
}

const GRID_GAP = 96;
const FIT_VIEW_PADDING = 0.16;
const MAX_BODY_LINES = 2;
const MAX_BODY_LINE_LENGTH = 26;

const edgeTypes = {
  flowEdge: FlowEdgeComponent,
};

const nodeTypes = {
  flowNode: FlowNodeComponent,
};

export function DiagramCanvas({
  document,
  activeNodeIds,
  activeEdgeIds,
  interactiveMode,
}: DiagramCanvasProps) {
  const layout = computeDiagramLayout(document);
  const nodes = buildNodes(document, layout.nodes, activeNodeIds, interactiveMode);
  const edges = buildEdges(document, layout.nodes, activeEdgeIds, interactiveMode);

  return (
    <div className="diagram-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: FIT_VIEW_PADDING }}
        maxZoom={1.4}
        minZoom={0.4}
        nodesConnectable={false}
        nodesDraggable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="rgba(85, 61, 44, 0.06)"
          gap={GRID_GAP}
          size={1}
          variant={BackgroundVariant.Lines}
        />
      </ReactFlow>
    </div>
  );
}

function buildNodes(
  document: FlowDocument,
  frames: Record<string, { x: number; y: number; width: number; height: number }>,
  activeNodeIds: Set<string>,
  interactiveMode: boolean,
): Array<Node<RuntimeNodeData>> {
  return document.nodes.map((node) => {
    const frame = frames[node.id];
    const isActive = activeNodeIds.has(node.id);

    return {
      id: node.id,
      type: "flowNode",
      position: { x: frame.x, y: frame.y },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      draggable: false,
      selectable: false,
      data: {
        bodyLines: wrapNodeBody(node.body),
        isActive,
        isDimmed: interactiveMode && !isActive,
        kind: node.kind,
        tone: node.tone,
        title: node.title,
      },
      style: {
        height: frame.height,
        width: frame.width,
      },
    };
  });
}

function buildEdges(
  document: FlowDocument,
  frames: Record<string, { x: number; y: number; width: number; height: number }>,
  activeEdgeIds: Set<string>,
  interactiveMode: boolean,
): Array<Edge<RuntimeEdgeData>> {
  return document.edges.map((edge) => {
    const isActive = activeEdgeIds.has(edge.id);
    const handleAssignment = getHandleAssignment(edge.source, edge.target, frames);

    return {
      id: edge.id,
      type: "flowEdge",
      source: edge.source,
      target: edge.target,
      sourceHandle: handleAssignment.sourceHandle,
      targetHandle: handleAssignment.targetHandle,
      label: edge.label,
      animated: false,
      selectable: false,
      focusable: false,
      data: {
        isActive,
        isDimmed: interactiveMode && !isActive,
        route: getEdgeRoute(edge.source, edge.target, frames),
      },
    };
  });
}

function getHandleAssignment(
  sourceId: string,
  targetId: string,
  frames: Record<string, { x: number; y: number; width: number; height: number }>,
): { sourceHandle: string; targetHandle: string } {
  const source = frames[sourceId];
  const target = frames[targetId];
  const targetIsAbove = target.y + target.height < source.y + source.height / 2;
  const targetIsBelow = target.y > source.y + source.height / 2;

  if (targetIsAbove) {
    return { sourceHandle: "source-top", targetHandle: "target-left" };
  }

  if (targetIsBelow) {
    return { sourceHandle: "source-bottom", targetHandle: "target-left" };
  }

  return { sourceHandle: "source-right", targetHandle: "target-left" };
}

function getEdgeRoute(
  sourceId: string,
  targetId: string,
  frames: Record<string, { x: number; y: number; width: number; height: number }>,
): EdgeRoute {
  const source = frames[sourceId];
  const target = frames[targetId];
  const horizontalGap = target.x - (source.x + source.width);

  if (horizontalGap < 220) {
    return "default";
  }

  if (target.y <= source.y) {
    return "upper";
  }

  return "lower";
}

function wrapNodeBody(value: string): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine.length > 0 ? `${currentLine} ${word}` : word;

    if (nextLine.length <= MAX_BODY_LINE_LENGTH) {
      currentLine = nextLine;
      return;
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    currentLine = word;
  });

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.slice(0, MAX_BODY_LINES);
}
