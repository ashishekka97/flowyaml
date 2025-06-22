import React from 'react';
import { cn } from '@/lib/utils';
import { type NodePosition } from '@/types';

interface ConnectorLineProps {
  from: NodePosition;
  to: NodePosition;
  isPositive?: boolean;
}

export function ConnectorLine({ from, to, isPositive }: ConnectorLineProps) {
  // Use a VHV (Vertical-Horizontal-Vertical) polyline to avoid passing through other nodes.
  // This creates a path with 90-degree elbows. We offset positive and negative paths
  // to prevent horizontal overlap if they run parallel.
  const midY = from.y + (isPositive ? 40 : 20);
  const pathData = `M${from.x},${from.y} L${from.x},${midY} L${to.x},${midY} L${to.x},${to.y}`;
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
          x={from.x}
          y={from.y - 8}
          className={cn(
            "text-xs font-medium",
            isPositive ? "fill-green-700" : "fill-red-700"
          )}
          textAnchor={isPositive ? "start" : "end"}
          dx={isPositive ? 5 : -5}
        >
          {labelText}
        </text>
      )}
      <circle cx={to.x} cy={to.y} r="4" fill="currentColor" className="text-gray-400" />
    </g>
  );
}
