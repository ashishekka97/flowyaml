"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DecisionIcon, TerminatorIcon } from '@/components/icons';
import { Separator } from '@/components/ui/separator';

interface NodePaletteProps {
  onAddNode: (type: 'decision' | 'terminator') => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  return (
    <Card className="w-64 h-full border-r rounded-none shadow-none">
      <CardHeader>
        <CardTitle>Nodes</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">Drag or click to add nodes.</p>
        <Button
          variant="outline"
          className="w-full h-20 flex flex-col items-center justify-center gap-2"
          onClick={() => onAddNode('decision')}
        >
          <DecisionIcon className="w-8 h-8 fill-current text-primary" />
          <span className="text-sm font-medium">Decision</span>
        </Button>
        <Button
          variant="outline"
          className="w-full h-20 flex flex-col items-center justify-center gap-2"
          onClick={() => onAddNode('terminator')}
        >
          <TerminatorIcon className="w-12 h-8 fill-current text-primary" />
          <span className="text-sm font-medium">Terminator</span>
        </Button>
      </CardContent>
    </Card>
  );
}
