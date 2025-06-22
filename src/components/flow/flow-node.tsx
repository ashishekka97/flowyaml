"use client";

import React from 'react';
import { type FlowNode } from '@/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DecisionIcon, TerminatorIcon } from '@/components/icons';

interface FlowNodeProps extends React.HTMLAttributes<HTMLDivElement> {
  node: FlowNode;
  isStart: boolean;
  isSelected: boolean;
}

const NodeWrapper = ({ node, isSelected, children, ...props }: { node: FlowNode; isSelected: boolean; children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) => (
  <div
    style={{
      transform: `translate(${node.position.x}px, ${node.position.y}px)`,
    }}
    className={cn(
      "absolute select-none transition-all duration-100 ease-in-out",
      "w-[200px] cursor-grab",
      isSelected && "z-10",
    )}
    {...props}
  >
    <div className={cn(isSelected ? 'scale-105' : 'scale-100', 'transition-transform duration-200')}>
      {children}
    </div>
  </div>
);


export function FlowNodeComponent({ node, isStart, isSelected, ...props }: FlowNodeProps) {
  const renderContent = () => {
    switch (node.type) {
      case 'decision':
        return (
          <div className={cn("relative w-full aspect-[2/1]", isSelected ? "drop-shadow-2xl" : "drop-shadow-lg")}>
            <DecisionIcon
              className={cn(
                "w-full h-full fill-card stroke-2",
                isSelected ? "stroke-primary" : "stroke-border"
              )}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
              <p className="text-xs font-bold text-foreground truncate">{node.id}</p>
              <p className="text-xs text-muted-foreground truncate" title={node.data.condition}>
                {node.data.condition}
              </p>
            </div>
          </div>
        );
      case 'terminator':
        return (
          <Card className={cn("w-full h-[80px] rounded-[40px] border-2 flex items-center justify-center", isSelected ? 'border-primary shadow-2xl' : 'shadow-lg')}>
              <div className="flex flex-col items-center justify-center text-center p-2">
                 <p className="text-xs font-bold text-foreground truncate">{node.id}</p>
                 <p className="text-xs text-muted-foreground truncate" title={JSON.stringify(node.data.output)}>
                    Output: {JSON.stringify(node.data.output)}
                 </p>
              </div>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <NodeWrapper node={node} isSelected={isSelected} {...props}>
      {isStart && (
        <Badge variant="secondary" className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 bg-accent text-accent-foreground">
          START
        </Badge>
      )}
      {renderContent()}
    </NodeWrapper>
  );
}
