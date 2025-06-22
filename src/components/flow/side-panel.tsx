"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Bot } from 'lucide-react';
import { type FlowNode, type Input } from '@/types';
import { Inspector } from './inspector';
import { InputConfigurator } from './input-configurator';

interface SidePanelProps {
  yamlCode: string;
  onValidate: () => void;
  selectedNode: FlowNode | undefined;
  allNodes: FlowNode[];
  onSaveNode: (oldId: string, newId: string, data: any) => void;
  onDeleteNode: (nodeId: string) => void;
  startNodeId: string;
  inputs: Input[];
  onUpdateInputs: (inputs: Input[]) => void;
}

export function SidePanel({ yamlCode, onValidate, selectedNode, allNodes, onSaveNode, onDeleteNode, startNodeId, inputs, onUpdateInputs }: SidePanelProps) {
  const [activeTab, setActiveTab] = React.useState('yaml');

  React.useEffect(() => {
    if (selectedNode) {
      setActiveTab('inspector');
    } else {
      if (activeTab === 'inspector') {
        setActiveTab('yaml');
      }
    }
  }, [selectedNode, activeTab]);

  const handleExport = () => {
    const blob = new Blob([yamlCode], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flowchart.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-96 h-full border-l rounded-none shadow-none flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
        <CardHeader className="flex-shrink-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="yaml">YAML</TabsTrigger>
            <TabsTrigger value="inputs">Inputs</TabsTrigger>
            <TabsTrigger value="inspector" disabled={!selectedNode}>Inspector</TabsTrigger>
          </TabsList>
        </CardHeader>
        
        <TabsContent value="yaml" className="flex-1 flex flex-col overflow-hidden m-0">
           <CardContent className="flex-1 overflow-auto p-0">
             <pre className="text-xs p-4 h-full bg-gray-900 text-white font-mono whitespace-pre-wrap break-all">
               <code>{yamlCode}</code>
             </pre>
           </CardContent>
        </TabsContent>

        <TabsContent value="inputs" className="flex-1 overflow-auto m-0">
          <InputConfigurator inputs={inputs} onUpdateInputs={onUpdateInputs} />
        </TabsContent>

        <TabsContent value="inspector" className="flex-1 overflow-auto m-0">
          {selectedNode ? (
            <Inspector 
              node={selectedNode} 
              allNodes={allNodes} 
              onSave={onSaveNode}
              onDelete={onDeleteNode}
              isStartNode={selectedNode.id === startNodeId}
            />
          ) : (
            <div className="p-4 text-center text-muted-foreground">Select a node to inspect its properties.</div>
          )}
        </TabsContent>
        
        <div className="p-4 border-t mt-auto flex-shrink-0 bg-card space-y-2">
            <Button onClick={onValidate} className="w-full" variant="secondary">
              <Bot className="mr-2 h-4 w-4" />
              Validate with AI
            </Button>
            <Button onClick={handleExport} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export YAML
            </Button>
        </div>
      </Tabs>
    </Card>
  );
}
