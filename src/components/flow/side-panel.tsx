"use client";

import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Bot, Wand2, Upload } from 'lucide-react';
import { type FlowNode, type Input } from '@/types';
import { Inspector } from './inspector';
import { InputConfigurator } from './input-configurator';

interface SidePanelProps {
  yamlCode: string;
  onAutoLayout: () => void;
  onValidate: () => void;
  onLoadYaml: (yamlCode: string) => void;
  selectedNode: FlowNode | undefined;
  allNodes: FlowNode[];
  onSaveNode: (oldId: string, newId: string, data: any) => void;
  onDeleteNode: (nodeId: string) => void;
  startNodeId: string;
  inputs: Input[];
  onUpdateInputs: (inputs: Input[]) => void;
}

export function SidePanel({ yamlCode, onAutoLayout, onValidate, onLoadYaml, selectedNode, allNodes, onSaveNode, onDeleteNode, startNodeId, inputs, onUpdateInputs }: SidePanelProps) {
  const [activeTab, setActiveTab] = React.useState('yaml');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          onLoadYaml(event.target.result);
        }
      };
      reader.onerror = () => {
        // You might want to show a toast here
        console.error("Error reading file");
      };
      reader.readAsText(file);
    }
    // Reset file input to allow loading the same file again
    if (e.target) {
      e.target.value = "";
    }
  };

  return (
    <Card className="w-96 h-full border-l rounded-none shadow-none flex flex-col">
      <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".yaml,.yml"
          className="hidden"
      />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
        <CardHeader className="flex-shrink-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="yaml">YAML</TabsTrigger>
            <TabsTrigger value="inputs">Inputs</TabsTrigger>
            <TabsTrigger value="inspector" disabled={!selectedNode}>Inspector</TabsTrigger>
          </TabsList>
        </CardHeader>
        
        <TabsContent value="yaml" className="flex-1 m-0 overflow-y-auto">
           <div className="bg-gray-900 h-full">
            <pre className="text-xs p-4 text-white font-mono whitespace-pre-wrap break-all">
                <code>{yamlCode}</code>
            </pre>
           </div>
        </TabsContent>

        <TabsContent value="inputs" className="flex-1 m-0 overflow-y-auto">
          <InputConfigurator inputs={inputs} onUpdateInputs={onUpdateInputs} />
        </TabsContent>

        <TabsContent value="inspector" className="flex-1 m-0 overflow-y-auto">
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
        
        <div className="p-4 border-t flex-shrink-0 bg-card space-y-2">
            <Button onClick={onAutoLayout} className="w-full" variant="secondary">
              <Wand2 className="mr-2 h-4 w-4" />
              Auto-Layout
            </Button>
            <Button onClick={onValidate} className="w-full" variant="secondary">
              <Bot className="mr-2 h-4 w-4" />
              Validate with AI
            </Button>
            <Button onClick={handleLoadClick} className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Load YAML
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
