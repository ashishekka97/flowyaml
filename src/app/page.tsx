
"use client";

import * as React from 'react';
import { type FlowNode, type Input, type NodePosition } from '@/types';
import { INITIAL_NODES, INITIAL_INPUTS, INITIAL_START_NODE_ID, generateYaml, autoLayout, parseYaml } from '@/lib/flow-utils';
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
  const [zoom, setZoom] = React.useState(1);

  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [draggedNode, setDraggedNode] = React.useState<{ id: string; startPos: NodePosition; startMouse: NodePosition } | null>(null);
  
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = React.useState(false);
  const [panStart, setPanStart] = React.useState({ x: 0, y: 0 });
  const didPan = React.useRef(false);

  const yamlCode = React.useMemo(() => generateYaml(nodes, inputs, startNodeId), [nodes, inputs, startNodeId]);

  const handleNodeClick = React.useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNodeId(id);
  }, []);

  const handleNodeDragStart = React.useCallback((id: string, e: React.MouseEvent) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    e.stopPropagation();
    document.body.style.cursor = 'grabbing';
    setDraggedNode({
      id,
      startPos: node.position,
      startMouse: { x: e.clientX, y: e.clientY },
    });
  }, [nodes]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (draggedNode || e.button !== 0) return;
    
    // Check if the click is on the background, not a node.
    // The `onMouseDown` on nodes has `e.stopPropagation()`, so if the event
    // reaches here, it's a background click.
    setIsPanning(true);
    didPan.current = false;
    setPanStart({ x: e.clientX, y: e.clientY });
    document.body.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle node dragging
    if (draggedNode) {
      const dx = (e.clientX - draggedNode.startMouse.x) / zoom;
      const dy = (e.clientY - draggedNode.startMouse.y) / zoom;
      const newPosition = {
        x: draggedNode.startPos.x + dx,
        y: draggedNode.startPos.y + dy,
      };
      setNodes(prevNodes =>
        prevNodes.map(n =>
          n.id === draggedNode.id ? { ...n, position: newPosition } : n
        )
      );
      return;
    }

    // Handle canvas panning
    if (isPanning && scrollContainerRef.current) {
      if (!didPan.current && (Math.abs(e.clientX - panStart.x) > 3 || Math.abs(e.clientY - panStart.y) > 3)) {
        didPan.current = true;
      }
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      scrollContainerRef.current.scrollLeft -= dx;
      scrollContainerRef.current.scrollTop -= dy;
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    if (draggedNode) {
      document.body.style.cursor = 'default';
      setDraggedNode(null);
    }
    if (isPanning) {
      setIsPanning(false);
      document.body.style.cursor = 'default';
      // If we didn't pan, it was a click, so deselect the node.
      if (!didPan.current) {
        setSelectedNodeId(null);
      }
    }
  };

  const handleMouseLeave = () => {
    // Stop any dragging or panning when mouse leaves the container
    // This prevents the cursor from getting stuck in the 'grabbing' state
    if (draggedNode) {
        document.body.style.cursor = 'default';
        setDraggedNode(null);
    }
    if (isPanning) {
        setIsPanning(false);
        document.body.style.cursor = 'default';
    }
  };

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

  const handleNodeSave = React.useCallback((oldId: string, newId: string, data: any) => {
    if (newId.trim() === '') {
      toast({
        variant: "destructive",
        title: "Invalid ID",
        description: "Node ID cannot be empty.",
      });
      return;
    }

    if (newId !== oldId && nodes.some(n => n.id === newId)) {
      toast({
        variant: "destructive",
        title: "ID already in use",
        description: `A node with the ID "${newId}" already exists.`,
      });
      return;
    }

    setNodes(prevNodes => {
      let newNodes = prevNodes.map(n => {
        if (n.id === oldId) {
          return { ...n, id: newId, data };
        }
        return n;
      });

      if (newId !== oldId) {
        newNodes = newNodes.map(n => {
          if (n.type === 'decision') {
            const nodeData = { ...n.data };
            let changed = false;
            if (nodeData.positivePath === oldId) {
              nodeData.positivePath = newId;
              changed = true;
            }
            if (nodeData.negativePath === oldId) {
              nodeData.negativePath = newId;
              changed = true;
            }
            return changed ? { ...n, data: nodeData } : n;
          }
          return n;
        });
      }
      return newNodes;
    });

    if (startNodeId === oldId) {
      setStartNodeId(newId);
    }

    setSelectedNodeId(newId);

    toast({
      title: "Node Updated",
      description: `Node "${oldId}" has been updated successfully.`,
    });
  }, [nodes, startNodeId, toast]);
  
  const deleteNode = React.useCallback((nodeId: string) => {
    if (nodeId === startNodeId) {
      toast({
        variant: "destructive",
        title: "Cannot delete start node",
        description: "The start node is essential for the flowchart.",
      });
      return;
    }

    setNodes(prev => {
      const newNodes = prev.filter(n => n.id !== nodeId);
      return newNodes.map(n => {
        if (n.type === 'decision') {
          const data = { ...n.data };
          if (data.positivePath === nodeId) {
            data.positivePath = '';
          }
          if (data.negativePath === nodeId) {
            data.negativePath = '';
          }
          return { ...n, data };
        }
        return n;
      });
    });

    setSelectedNodeId(null);

    toast({
      title: "Node Deleted",
      description: `Node "${nodeId}" has been removed.`,
    });
  }, [startNodeId, toast]);

  const handleAutoLayout = React.useCallback(() => {
    try {
      const laidOutNodes = autoLayout(nodes, startNodeId);
      setNodes(laidOutNodes);
      toast({
        title: "Auto-Layout Complete",
        description: "Nodes have been rearranged automatically.",
      });
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred during auto-layout.";
        toast({
            variant: "destructive",
            title: "Auto-Layout Failed",
            description: message,
        });
        console.error(error);
    }
  }, [nodes, startNodeId, toast]);

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

  const handleZoomChange = React.useCallback((newZoom: number) => {
    setZoom(Math.min(Math.max(newZoom, 0.2), 2));
  }, []);

  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey) {
        e.preventDefault();
        const newZoom = zoom - e.deltaY * 0.001;
        handleZoomChange(newZoom);
    }
  }, [zoom, handleZoomChange]);

  const handleLoadYaml = React.useCallback((yamlString: string) => {
    try {
      const { nodes: loadedNodes, inputs: loadedInputs, startNodeId: loadedStartNodeId } = parseYaml(yamlString);

      if (!loadedNodes.some(n => n.id === loadedStartNodeId)) {
        throw new Error(`The specified start node "${loadedStartNodeId}" does not exist in the list of nodes.`);
      }

      const laidOutNodes = autoLayout(loadedNodes, loadedStartNodeId);

      setInputs(loadedInputs);
      setStartNodeId(loadedStartNodeId);
      setNodes(laidOutNodes);
      
      setSelectedNodeId(null);

      toast({
        title: "YAML Loaded",
        description: "Flowchart has been loaded onto the canvas.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred while parsing the YAML file.";
      toast({
        variant: "destructive",
        title: "Load Failed",
        description: message,
      });
      console.error(error);
    }
  }, [toast]);

  const selectedNode = React.useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

  return (
    <div className="flex flex-col h-screen bg-background font-sans">
      <Header />
      <main className="flex flex-1 overflow-hidden">
        <NodePalette onAddNode={addNode} />
        <div 
          className="flex-1 h-full min-w-0" 
          onMouseDown={handleCanvasMouseDown} 
          onMouseMove={handleMouseMove} 
          onMouseUp={handleMouseUp} 
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
        >
          <FlowEditor
            nodes={nodes}
            startNodeId={startNodeId}
            selectedNodeId={selectedNodeId}
            onNodeClick={handleNodeClick}
            onNodeDragStart={handleNodeDragStart}
            zoom={zoom}
            onZoomChange={handleZoomChange}
            scrollContainerRef={scrollContainerRef}
          />
        </div>
        <SidePanel
          yamlCode={yamlCode}
          onAutoLayout={handleAutoLayout}
          onValidate={handleValidation}
          onLoadYaml={handleLoadYaml}
          selectedNode={selectedNode}
          allNodes={nodes}
          onSaveNode={handleNodeSave}
          onDeleteNode={deleteNode}
          startNodeId={startNodeId}
          inputs={inputs}
          onUpdateInputs={setInputs}
        />
      </main>
    </div>
  );
}
