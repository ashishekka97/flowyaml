"use client";

import React from 'react';
import { type FlowNode, type NodePosition } from '@/types';
import { FlowNodeComponent } from './flow-node';
import { ConnectorLine } from './connector-line';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';

interface FlowEditorProps {
  nodes: FlowNode[];
  startNodeId: string;
  selectedNodeId: string | null;
  onNodeClick: (id: string, e: React.MouseEvent) => void;
  onNodeDragStart: (id:string, e: React.MouseEvent) => void;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
}

export function FlowEditor({ nodes, startNodeId, selectedNodeId, onNodeClick, onNodeDragStart, zoom, onZoomChange }: FlowEditorProps) {
  const nodeElements = React.useMemo(() => (
    nodes.map(node => (
      <FlowNodeComponent
        key={node.id}
        node={node}
        isStart={node.id === startNodeId}
        isSelected={node.id === selectedNodeId}
        onClick={(e) => onNodeClick(node.id, e)}
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
        const negativeTargetNode = nodeMap.get(node.data.negativePath);
        const positiveTargetNode = nodeMap.get(node.data.positivePath);
        
        if (sourceNode && negativeTargetNode) {
          const fromPos: NodePosition = { x: sourceNode.position.x, y: sourceNode.position.y + 50 };
          
          let toPos: NodePosition;
          toPos = { x: negativeTargetNode.position.x + 100, y: negativeTargetNode.position.y };
          
          lines.push(<ConnectorLine key={`${node.id}-neg`} from={fromPos} to={toPos} isPositive={false} />);
        }

        if (sourceNode && positiveTargetNode) {
          const fromPos: NodePosition = { x: sourceNode.position.x + 200, y: sourceNode.position.y + 50 };

          let toPos: NodePosition;
          toPos = { x: positiveTargetNode.position.x + 100, y: positiveTargetNode.position.y };

          lines.push(<ConnectorLine key={`${node.id}-pos`} from={fromPos} to={toPos} isPositive />);
        }
      }
    }
    return lines;
  }, [nodes]);

  const canvasWidth = 4000;
  const canvasHeight = 4000;

  return (
    <div className="relative w-full h-full">
      <div className="w-full h-full bg-background overflow-auto">
        <div
          className="relative"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          
          <svg
            className="absolute w-full h-full pointer-events-none"
          >
            {connectors}
          </svg>
          
          <div className="relative w-full h-full">
            {nodeElements}
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
        <Button size="icon" variant="outline" onClick={() => onZoomChange(zoom - 0.1)}>
            <Minus className="h-4 w-4" />
        </Button>
        <div className="bg-card border w-20 text-center text-sm font-medium rounded-md py-1.5 tabular-nums">
            {Math.round(zoom * 100)}%
        </div>
        <Button size="icon" variant="outline" onClick={() => onZoomChange(zoom + 0.1)}>
            <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
