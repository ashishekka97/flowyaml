"use client";

import React from 'react';
import { type FlowNode, type DecisionNodeData, type TerminatorNodeData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface InspectorProps {
  node: FlowNode;
  allNodes: FlowNode[];
  onUpdate: (nodeId: string, data: any) => void;
}

export function Inspector({ node, allNodes, onUpdate }: InspectorProps) {
  const [formData, setFormData] = React.useState(node.data);

  React.useEffect(() => {
    setFormData(node.data);
  }, [node]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onUpdate(node.id, formData);
  };
  
  const otherNodes = allNodes.filter(n => n.id !== node.id);

  const renderDecisionForm = (data: DecisionNodeData) => (
    <>
      <div className="space-y-2">
        <Label htmlFor="condition">Condition</Label>
        <Textarea id="condition" name="condition" value={data.condition} onChange={handleInputChange} placeholder="e.g., input.purchaseAmount > 100" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="positivePath">Positive Path (if true)</Label>
        <Select name="positivePath" value={data.positivePath} onValueChange={(value) => handleSelectChange('positivePath', value)}>
          <SelectTrigger><SelectValue placeholder="Select target node..." /></SelectTrigger>
          <SelectContent>
            {otherNodes.map(n => <SelectItem key={n.id} value={n.id}>{n.id}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="negativePath">Negative Path (if false)</Label>
        <Select name="negativePath" value={data.negativePath} onValueChange={(value) => handleSelectChange('negativePath', value)}>
          <SelectTrigger><SelectValue placeholder="Select target node..." /></SelectTrigger>
          <SelectContent>
            {otherNodes.map(n => <SelectItem key={n.id} value={n.id}>{n.id}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </>
  );

  const renderTerminatorForm = (data: TerminatorNodeData) => (
    <div className="space-y-2">
      <Label htmlFor="output">Output (JSON)</Label>
      <Textarea
        id="output"
        name="output"
        value={JSON.stringify(data.output, null, 2)}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value);
            setFormData({ output: parsed });
          } catch (err) {
            // Ignore invalid JSON while typing
          }
        }}
        rows={4}
      />
    </div>
  );

  return (
    <Card className="h-full border-none shadow-none rounded-none">
      <CardHeader>
        <CardTitle>Inspector</CardTitle>
        <CardDescription>Editing node: <span className="font-bold text-primary">{node.id}</span></CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {node.type === 'decision' && renderDecisionForm(formData as DecisionNodeData)}
        {node.type === 'terminator' && renderTerminatorForm(formData as TerminatorNodeData)}
        <Button onClick={handleSave} className="w-full">Save Changes</Button>
      </CardContent>
    </Card>
  );
}
