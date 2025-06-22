"use client";

import React from 'react';
import { type FlowNode, type DecisionNodeData, type TerminatorNodeData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import * as yaml from 'js-yaml';

interface InspectorProps {
  node: FlowNode;
  allNodes: FlowNode[];
  onSave: (oldId: string, newId: string, data: any) => void;
  onDelete: (nodeId: string) => void;
  isStartNode: boolean;
}

export function Inspector({ node, allNodes, onSave, onDelete, isStartNode }: InspectorProps) {
  const [id, setId] = React.useState(node.id);
  const [formData, setFormData] = React.useState(node.data);
  const [terminatorOutputYaml, setTerminatorOutputYaml] = React.useState('');

  React.useEffect(() => {
    setId(node.id);
    setFormData(node.data);
    if (node.type === 'terminator') {
      setTerminatorOutputYaml(yaml.dump((node.data as TerminatorNodeData).output, { indent: 2 }));
    }
  }, [node]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    let dataToSave = formData;
    if (node.type === 'terminator') {
      try {
        const parsed = yaml.load(terminatorOutputYaml);
        if (typeof parsed === 'object' && parsed !== null) {
          dataToSave = { ...formData, output: parsed };
        } else {
          console.warn("Terminator output is not a valid YAML object. Changes not saved.");
          return;
        }
      } catch (err) {
        console.error("Invalid YAML format in terminator node. Changes not saved.", err);
        return;
      }
    }
    onSave(node.id, id, dataToSave);
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
      <Label htmlFor="output">Output (YAML)</Label>
      <Textarea
        id="output"
        name="output"
        value={terminatorOutputYaml}
        onChange={(e) => setTerminatorOutputYaml(e.target.value)}
        rows={4}
      />
    </div>
  );

  return (
    <Card className="border-none shadow-none rounded-none">
      <CardHeader>
        <CardTitle>Inspector</CardTitle>
        <CardDescription>Editing node: <span className="font-bold text-primary">{node.id}</span></CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pr-2">
        <div className="space-y-2">
          <Label htmlFor="node-id">Node ID</Label>
          <Input id="node-id" value={id} onChange={(e) => setId(e.target.value)} placeholder="Enter a unique node ID" />
        </div>
        {node.type === 'decision' && renderDecisionForm(formData as DecisionNodeData)}
        {node.type === 'terminator' && renderTerminatorForm(formData as TerminatorNodeData)}
      </CardContent>
      <div className="p-6 pt-0 space-y-2">
        <Button onClick={handleSave} className="w-full">Save Changes</Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full" disabled={isStartNode} title={isStartNode ? "Cannot delete the start node" : "Delete Node"}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Node
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the node "{node.id}" and remove any connections to it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(node.id)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}
