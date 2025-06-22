import React from 'react';
import { cn } from '@/lib/utils';
import { type NodePosition } from '@/types';

interface ConnectorLineProps {
  from: NodePosition;
  to: NodePosition;
  isPositive?: boolean;
}

export function ConnectorLine({ from, to, isPositive }: ConnectorLineProps) {
  const pathData = `M${from.x},${from.y} C${from.x},${(from.y + to.y) / 2} ${to.x},${(from.y + to.y) / 2} ${to.x},${to.y}`;

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
      <circle cx={to.x} cy={to.y} r="4" fill="currentColor" className="text-gray-400" />
    </g>
  );
}
