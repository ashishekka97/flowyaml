import React from 'react';
import { cn } from '@/lib/utils';
import { type NodePosition, type FlowNode } from '@/types';

interface ConnectorLineProps {
  from: NodePosition;
  to: NodePosition;
  isPositive?: boolean;
  allNodes: FlowNode[];
  sourceId: string;
  targetId: string;
}

const NODE_WIDTH = 200;
const NODE_HEIGHT_DECISION = 100;
const NODE_HEIGHT_TERMINATOR = 80;
const PADDING_Y = 20;

function getNodeBoundingBox(node: FlowNode) {
    const height = node.type === 'decision' ? NODE_HEIGHT_DECISION : NODE_HEIGHT_TERMINATOR;
    return {
        id: node.id,
        x1: node.position.x,
        y1: node.position.y,
        x2: node.position.x + NODE_WIDTH,
        y2: node.position.y + height,
    };
}

function getPath(
    from: NodePosition,
    to: NodePosition,
    allNodes: FlowNode[],
    sourceId: string,
    targetId: string,
    isPositive?: boolean,
): string {
    const obstacles = allNodes
        .filter(n => n.id !== sourceId && n.id !== targetId)
        .map(getNodeBoundingBox);

    // Initial Y for the horizontal segment, offset to avoid sibling path overlap
    const initialDrop = isPositive ? 60 : 40;
    let midY = from.y + initialDrop;

    // Check for collisions on the horizontal path and adjust midY if needed
    const xMin = Math.min(from.x, to.x);
    const xMax = Math.max(from.x, to.x);
    
    let clearPathFound = false;
    let attempts = 0;
    const maxAttempts = allNodes.length + 5; // Limit attempts to avoid infinite loops

    while(!clearPathFound && attempts < maxAttempts) {
        attempts++;
        clearPathFound = true;

        const collidingObstacles = obstacles.filter(obs => {
            // Is the obstacle horizontally between the start and end of the line?
            const horizOverlap = xMin < obs.x2 && xMax > obs.x1;
            // Is the obstacle vertically pierced by the horizontal line?
            const verticOverlap = midY >= obs.y1 && midY <= obs.y2;
            return horizOverlap && verticOverlap;
        });

        if (collidingObstacles.length > 0) {
            clearPathFound = false;
            // Find the bottom-most colliding obstacle to route under it
            const lowestObstacle = collidingObstacles.reduce((prev, curr) => (prev.y2 > curr.y2 ? prev : curr));
            midY = lowestObstacle.y2 + PADDING_Y; // Move the path below the obstacle
        }
    }
    
    // Final path using the calculated (or default) midY
    const pathData = `M${from.x},${from.y} V${midY} H${to.x} V${to.y}`;
    return pathData;
}

export function ConnectorLine({ from, to, isPositive, allNodes, sourceId, targetId }: ConnectorLineProps) {
  const pathData = getPath(from, to, allNodes, sourceId, targetId, isPositive);
  const pathMidPointY = parseFloat(pathData.split(' ')[1].substring(1));

  const labelText = isPositive === true ? 'True' : (isPositive === false ? 'False' : null);

  return (
    <g>
      <path
        d={pathData}
        strokeWidth="2"
        fill="none"
        className={cn(
          "stroke-gray-400 transition-all duration-300",
          isPositive === true && "stroke-green-500",
          isPositive === false && "stroke-red-500"
        )}
      />
      {labelText && (
        <text
          x={from.x + (isPositive ? 5 : -5)} // Offset label slightly for clarity
          y={pathMidPointY - 4}
          className={cn(
            "text-xs font-medium",
            isPositive ? "fill-green-700" : "fill-red-700"
          )}
          textAnchor={isPositive ? "start" : "end"}
        >
          {labelText}
        </text>
      )}
      <circle cx={to.x} cy={to.y} r="4" fill="currentColor" className="text-gray-400" />
    </g>
  );
}
