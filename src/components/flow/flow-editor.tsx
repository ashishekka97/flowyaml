"use client";

import React from 'react';
import { type FlowNode, type NodePosition } from '@/types';
import { FlowNodeComponent } from './flow-node';
import { ConnectorLine } from './connector-line';
import { cn } from '@/lib/utils';

interface FlowEditorProps {
  nodes: FlowNode[];
  startNodeId: string;
  selectedNodeId: string | null;
  onNodeClick: (id: string) => void;
  onNodeDragStart: (id:string, e: React.MouseEvent) => void;
}

export function FlowEditor({ nodes, startNodeId, selectedNodeId, onNodeClick, onNodeDragStart }: FlowEditorProps) {
  const nodeElements = React.useMemo(() => (
    nodes.map(node => (
      <FlowNodeComponent
        key={node.id}
        node={node}
        isStart={node.id === startNodeId}
        isSelected={node.id === selectedNodeId}
        onClick={() => onNodeClick(node.id)}
        onMouseDown={(e) => onNodeDragStart(node.id, e)}
      />
    ))
  ), [nodes, startNodeId, selectedNodeId, onNodeClick, onNodeDragStart]);
  
  const connectors = React.useMemo(() => {
    const lines: React.ReactNode[] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    for (const node of nodes) {
      if (node.type === 'decision') {
        const sourceNode = nodeMap.get(node.id);
        const positiveTargetNode = nodeMap.get(node.data.positivePath);
        const negativeTargetNode = nodeMap.get(node.data.negativePath);
        
        if (sourceNode && positiveTargetNode) {
          const fromPos: NodePosition = { x: sourceNode.position.x + 150, y: sourceNode.position.y + 40 };
          const toPos: NodePosition = { x: positiveTargetNode.position.x + 100, y: positiveTargetNode.position.y };
          lines.push(<ConnectorLine key={`${node.id}-pos`} from={fromPos} to={toPos} isPositive />);
        }
        
        if (sourceNode && negativeTargetNode) {
          const fromPos: NodePosition = { x: sourceNode.position.x, y: sourceNode.position.y + 40 };
          const toPos: NodePosition = { x: negativeTargetNode.position.x + 100, y: negativeTargetNode.position.y };
          lines.push(<ConnectorLine key={`${node.id}-neg`} from={fromPos} to={toPos} isPositive={false} />);
        }
      }
    }
    return lines;
  }, [nodes]);

  return (
    <div className="relative w-full h-full bg-background overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
      
      <svg className="absolute w-full h-full pointer-events-none">
        {connectors}
      </svg>
      
      <div className="relative w-full h-full">
        {nodeElements}
      </div>
    </div>
  );
}
