"use client";

import React from 'react';
import { type Input as FlowInput } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface InputConfiguratorProps {
  inputs: FlowInput[];
  onUpdateInputs: (inputs: FlowInput[]) => void;
}

export function InputConfigurator({ inputs, onUpdateInputs }: InputConfiguratorProps) {
  const [newInputName, setNewInputName] = React.useState('');
  const [newInputType, setNewInputType] = React.useState<'Boolean' | 'Double' | 'String'>('String');

  const handleAddInput = () => {
    if (newInputName.trim() && !inputs.some(input => input.name === newInputName.trim())) {
      onUpdateInputs([...inputs, { name: newInputName.trim(), type: newInputType }]);
      setNewInputName('');
      setNewInputType('String');
    }
  };

  const handleRemoveInput = (inputName: string) => {
    onUpdateInputs(inputs.filter(input => input.name !== inputName));
  };

  return (
    <Card className="border-none shadow-none rounded-none">
      <CardHeader>
        <CardTitle>Configure Inputs</CardTitle>
        <CardDescription>Define the inputs for your flowchart.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Current Inputs</h3>
          <div className="space-y-2">
            {inputs.length > 0 ? (
              inputs.map((input) => (
                <div key={input.name} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <div>
                    <p className="font-medium">{input.name}</p>
                    <p className="text-xs text-muted-foreground">{input.type}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveInput(input.name)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-center text-muted-foreground py-4">No inputs defined.</p>
            )}
          </div>
        </div>
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-medium text-muted-foreground">Add New Input</h3>
          <div className="space-y-2">
            <Label htmlFor="new-input-name">Name</Label>
            <Input
              id="new-input-name"
              value={newInputName}
              onChange={(e) => setNewInputName(e.target.value)}
              placeholder="e.g., customerAge"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-input-type">Type</Label>
            <Select value={newInputType} onValueChange={(value: 'Boolean' | 'Double' | 'String') => setNewInputType(value)}>
              <SelectTrigger id="new-input-type">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="String">String</SelectItem>
                <SelectItem value="Boolean">Boolean</SelectItem>
                <SelectItem value="Double">Double</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAddInput} className="w-full">Add Input</Button>
        </div>
      </CardContent>
    </Card>
  );
}
