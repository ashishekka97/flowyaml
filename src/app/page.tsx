"use client";

import * as React from 'react';
import { type FlowNode, type Input, type NodePosition } from '@/types';
import { INITIAL_NODES, INITIAL_INPUTS, INITIAL_START_NODE_ID, generateYaml } from '@/lib/flow-utils';
import { Header } from '@/components/header';
import { NodePalette } from '@/components/flow/node-palette';
import { FlowEditor } from '@/components/flow/flow-editor';
import { SidePanel } from '@/components/flow/side-panel';
import { useToast } from "@/hooks/use-toast";
import { validateFlowchart } from '@/ai/flows/flowchart-validator';

export default function Home() {
  const { toast } = useToast();
  const [nodes, setNodes] = React.useState<FlowNode[]>(INITIAL_NODES);
  const [inputs, setInputs] = React.useState<Input[]>(INITIAL_INPUTS);
  const [startNodeId, setStartNodeId] = React.useState<string>(INITIAL_START_NODE_ID);

  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [draggedNode, setDraggedNode] = React.useState<{ id: string; offset: NodePosition } | null>(null);

  const yamlCode = React.useMemo(() => generateYaml(nodes, inputs, startNodeId), [nodes, inputs, startNodeId]);

  const handleNodeDragStart = React.useCallback((id: string, e: React.MouseEvent) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    document.body.style.cursor = 'grabbing';
    setDraggedNode({
      id,
      offset: {
        x: e.clientX - node.position.x,
        y: e.clientY - node.position.y,
      },
    });
  }, [nodes]);

  const handleNodeDrag = React.useCallback((e: React.MouseEvent) => {
    if (!draggedNode) return;
    const newPosition = {
      x: e.clientX - draggedNode.offset.x,
      y: e.clientY - draggedNode.offset.y,
    };
    setNodes(prevNodes =>
      prevNodes.map(n =>
        n.id === draggedNode.id ? { ...n, position: newPosition } : n
      )
    );
  }, [draggedNode]);

  const handleNodeDragEnd = React.useCallback(() => {
    document.body.style.cursor = 'default';
    setDraggedNode(null);
  }, []);

  const addNode = React.useCallback((type: 'decision' | 'terminator') => {
    const newNodeId = `${type}_${Date.now()}`;
    const newNode: FlowNode = {
      id: newNodeId,
      type,
      position: { x: 300, y: 150 },
      data: type === 'decision'
        ? { condition: 'true', positivePath: '', negativePath: '' }
        : { output: { result: 'new' } },
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNodeId);
  }, []);

  const updateNodeData = React.useCallback((nodeId: string, data: any) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data } : n));
  }, []);
  
  const handleValidation = React.useCallback(async () => {
    toast({
      title: "Validating Flowchart...",
      description: "AI is checking for loops, dead ends, and unreachable nodes.",
    });
    try {
      const result = await validateFlowchart({ yamlCode });
      toast({
        title: "Validation Complete",
        description: (
          <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
            <code className="text-white">{result.validationResult}</code>
          </pre>
        )
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Validation Failed",
        description: "An error occurred while validating the flowchart.",
      });
      console.error(error);
    }
  }, [yamlCode, toast]);

  const selectedNode = React.useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

  return (
    <div className="flex flex-col h-screen bg-background font-sans">
      <Header />
      <main className="flex flex-1 overflow-hidden">
        <NodePalette onAddNode={addNode} />
        <div className="flex-1 h-full" onMouseMove={handleNodeDrag} onMouseUp={handleNodeDragEnd}>
          <FlowEditor
            nodes={nodes}
            startNodeId={startNodeId}
            selectedNodeId={selectedNodeId}
            onNodeClick={setSelectedNodeId}
            onNodeDragStart={handleNodeDragStart}
          />
        </div>
        <SidePanel
          yamlCode={yamlCode}
          onValidate={handleValidation}
          selectedNode={selectedNode}
          allNodes={nodes}
          onUpdateNode={updateNodeData}
        />
      </main>
    </div>
  );
}
