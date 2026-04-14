import type { FlowDocument, FlowNode } from "../flow-document/index.js";

export interface NodeFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DiagramLayout {
  width: number;
  height: number;
  nodes: Record<string, NodeFrame>;
}

const HORIZONTAL_GAP = 132;
const VERTICAL_GAP = 56;
const PADDING_X = 96;
const PADDING_Y = 72;
const NODE_WIDTH = 224;
const NODE_HEIGHT = 118;

export function computeDiagramLayout(document: FlowDocument): DiagramLayout {
  const depths = assignDepths(document);
  const columns = new Map<number, FlowNode[]>();

  document.nodes.forEach((node) => {
    const depth = depths.get(node.id) ?? 0;
    const bucket = columns.get(depth);

    if (bucket) {
      bucket.push(node);
      return;
    }

    columns.set(depth, [node]);
  });

  const orderedColumns = [...columns.entries()].sort(([left], [right]) => left - right);
  const nodes: DiagramLayout["nodes"] = {};
  let contentWidth = 0;
  let contentHeight = 0;

  orderedColumns.forEach(([columnIndex, columnNodes]) => {
    let cursorY = PADDING_Y;
    const maxWidth = columnNodes.reduce(
      (columnWidth, node) => Math.max(columnWidth, getNodeSize(node).width),
      0,
    );

    columnNodes.forEach((node) => {
      const size = getNodeSize(node);
      const x = PADDING_X + columnIndex * (maxWidth + HORIZONTAL_GAP);
      const y = cursorY;

      nodes[node.id] = { x, y, width: size.width, height: size.height };
      cursorY += size.height + VERTICAL_GAP;
      contentHeight = Math.max(contentHeight, y + size.height);
      contentWidth = Math.max(contentWidth, x + size.width);
    });
  });

  return {
    width: contentWidth + PADDING_X,
    height: contentHeight + PADDING_Y,
    nodes,
  };
}

function assignDepths(document: FlowDocument): Map<string, number> {
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  const depths = new Map<string, number>();

  document.nodes.forEach((node) => {
    incoming.set(node.id, 0);
    outgoing.set(node.id, []);
  });

  document.edges.forEach((edge) => {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    outgoing.get(edge.source)?.push(edge.target);
  });

  const queue = document.nodes
    .filter((node) => (incoming.get(node.id) ?? 0) === 0)
    .map((node) => node.id);

  if (queue.length === 0) {
    document.nodes.forEach((node, index) => {
      depths.set(node.id, index);
    });
    return depths;
  }

  queue.forEach((id) => depths.set(id, 0));

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depths.get(current) ?? 0;

    outgoing.get(current)?.forEach((target) => {
      depths.set(target, Math.max(depths.get(target) ?? 0, currentDepth + 1));
      incoming.set(target, (incoming.get(target) ?? 1) - 1);

      if ((incoming.get(target) ?? 0) === 0) {
        queue.push(target);
      }
    });
  }

  document.nodes.forEach((node) => {
    if (!depths.has(node.id)) {
      depths.set(node.id, depths.size);
    }
  });

  return depths;
}

export function getNodeSize(node: FlowNode): { width: number; height: number } {
  void node;
  return { width: NODE_WIDTH, height: NODE_HEIGHT };
}
