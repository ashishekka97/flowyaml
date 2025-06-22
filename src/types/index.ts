export interface Input {
  name: string;
  type: 'Boolean' | 'Double' | 'String';
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface BaseNode {
  id: string;
  position: NodePosition;
}

export interface DecisionNodeData {
  condition: string;
  positivePath: string;
  negativePath: string;
}

export interface TerminatorNodeData {
  output: Record<string, any>;
}

export interface DecisionNode extends BaseNode {
  type: 'decision';
  data: DecisionNodeData;
}

export interface TerminatorNode extends BaseNode {
  type: 'terminator';
  data: TerminatorNodeData;
}

export type FlowNode = DecisionNode | TerminatorNode;
