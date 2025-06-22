import { type FlowNode, type Input, type DecisionNode, type TerminatorNode } from '@/types';
import {- Indent, dump } from 'js-yaml';

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
    let nodeData: any = {};
    if (node.type === 'decision') {
      const decisionNode = node as DecisionNode;
      nodeData = {
        '!<decision>': {
          condition: decisionNode.data.condition,
          positivePath: decisionNode.data.positivePath,
          negativePath: decisionNode.data.negativePath,
        }
      };
    } else if (node.type === 'terminator') {
      const terminatorNode = node as TerminatorNode;
      nodeData = {
        '!<terminator>': {
          output: terminatorNode.data.output,
        }
      };
    }
    yamlObject.nodes[node.id] = nodeData;
  });
  
  // A bit of a hack to get the !!map and !<tags> formatting right with js-yaml
  let yamlString = dump(yamlObject, {
    noRefs: true,
  });

  yamlString = yamlString.replace(/!<([^>]+)>:/g, '!<$1>');
  yamlString = yamlString.replace("nodes: {}", "nodes: !!map");
  
  return yamlString;
}
