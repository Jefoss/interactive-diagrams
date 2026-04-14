import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { RuntimeNodeData } from "./flowTypes.js";

export function FlowNodeComponent({ data }: NodeProps<RuntimeNodeData>) {
  return (
    <div
      className={[
        "flow-node",
        `kind-${data.kind}`,
        data.tone ? `tone-${data.tone}` : "",
        data.isActive ? "is-active" : "",
        data.isDimmed ? "is-dimmed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Handle
        className="flow-handle"
        id="target-left"
        isConnectable={false}
        position={Position.Left}
        type="target"
      />
      <Handle
        className="flow-handle"
        id="target-top"
        isConnectable={false}
        position={Position.Top}
        type="target"
      />
      <Handle
        className="flow-handle"
        id="target-bottom"
        isConnectable={false}
        position={Position.Bottom}
        type="target"
      />
      <div className="flow-node-shell">
        <div className="flow-node-content">
          <div className="flow-node-title">{data.title}</div>
          <div className="flow-node-body">
            {data.bodyLines.map((line, index) => (
              <div key={`${data.title}-${index}`}>{line}</div>
            ))}
          </div>
        </div>
      </div>
      <Handle
        className="flow-handle"
        id="source-right"
        isConnectable={false}
        position={Position.Right}
        type="source"
      />
      <Handle
        className="flow-handle"
        id="source-top"
        isConnectable={false}
        position={Position.Top}
        type="source"
      />
      <Handle
        className="flow-handle"
        id="source-bottom"
        isConnectable={false}
        position={Position.Bottom}
        type="source"
      />
    </div>
  );
}
