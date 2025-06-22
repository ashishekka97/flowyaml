import { type FlowNode, type Input, type DecisionNodeData, type TerminatorNodeData } from '@/types';
import * as yaml from 'js-yaml';

// Helper classes for YAML serialization
class DecisionFlowData {
  condition: string;
  positivePath: string;
  negativePath: string;
  constructor(data: DecisionNodeData) {
    this.condition = data.condition;
    this.positivePath = data.positivePath;
    this.negativePath = data.negativePath;
  }
}

class TerminatorFlowData {
  output: Record<string, any>;
  constructor(data: TerminatorNodeData) {
    this.output = data.output;
  }
}

// Define custom YAML types for js-yaml
const DecisionYamlType = new yaml.Type('!<decision>', {
  kind: 'mapping',
  instanceOf: DecisionFlowData,
  represent: (data: DecisionFlowData) => {
    return {
      condition: data.condition,
      positivePath: data.positivePath,
      negativePath: data.negativePath,
    };
  },
});

const TerminatorYamlType = new yaml.Type('!<terminator>', {
  kind: 'mapping',
  instanceOf: TerminatorFlowData,
  represent: (data: TerminatorFlowData) => {
    return {
      output: data.output,
    };
  },
});

const FLOW_SCHEMA = yaml.DEFAULT_SCHEMA.extend([DecisionYamlType, TerminatorYamlType]);


export const INITIAL_INPUTS: Input[] = [
  { name: 'isLoyalCustomer', type: 'Boolean' },
  { name: 'purchaseAmount', type: 'Double' },
];

export const INITIAL_START_NODE_ID = 'loyaltyCheck';

export const INITIAL_NODES: FlowNode[] = [
  {
    id: 'loyaltyCheck',
    type: 'decision',
    position: { x: 350, y: 50 },
    data: {
      condition: 'input.isLoyalCustomer == true',
      positivePath: 'highPurchaseCheck',
      negativePath: 'noDiscount',
    },
  },
  {
    id: 'highPurchaseCheck',
    type: 'decision',
    position: { x: 150, y: 250 },
    data: {
      condition: 'input.purchaseAmount > 100.0',
      positivePath: 'highDiscount',
      negativePath: 'standardDiscount',
    },
  },
  {
    id: 'noDiscount',
    type: 'terminator',
    position: { x: 550, y: 250 },
    data: {
      output: { discountPercentage: 0.0 },
    },
  },
  {
    id: 'highDiscount',
    type: 'terminator',
    position: { x: 50, y: 450 },
    data: {
      output: { discountPercentage: 20.0 },
    },
  },
  {
    id: 'standardDiscount',
    type: 'terminator',
    position: { x: 250, y: 450 },
    data: {
      output: { discountPercentage: 10.0 },
    },
  },
];


export function generateYaml(nodes: FlowNode[], inputs: Input[], startNodeId: string): string {
  const yamlObject: any = {
    inputs: inputs.map(input => ({ name: input.name, type: input.type })),
    startNode: startNodeId,
    nodes: {},
  };

  nodes.forEach(node => {
    if (node.type === 'decision') {
      yamlObject.nodes[node.id] = new DecisionFlowData(node.data);
    } else if (node.type === 'terminator') {
      yamlObject.nodes[node.id] = new TerminatorFlowData(node.data);
    }
  });
  
  let yamlString = yaml.dump(yamlObject, {
    schema: FLOW_SCHEMA,
    noRefs: true,
  });
  
  // The !!map part is still needed if nodes is empty
  yamlString = yamlString.replace("nodes: {}", "nodes: !!map");
  
  return yamlString;
}
