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
const DecisionYamlType = new yaml.Type('!decision', {
  kind: 'mapping',
  instanceOf: DecisionFlowData,
  construct: (data: any): DecisionFlowData => {
    const d = data || {};
    return new DecisionFlowData({
        condition: d.condition || '',
        positivePath: d.positivePath || '',
        negativePath: d.negativePath || '',
    });
  },
  represent: (data: DecisionFlowData) => {
    return {
      condition: data.condition,
      positivePath: data.positivePath,
      negativePath: data.negativePath,
    };
  },
});

const TerminatorYamlType = new yaml.Type('!terminator', {
  kind: 'mapping',
  instanceOf: TerminatorFlowData,
  construct: (data: any): TerminatorFlowData => {
    const d = data || {};
    return new TerminatorFlowData({ output: d.output || {} });
  },
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
  
  // The dumper can sometimes URL-encode special characters.
  // We can decode them for display purposes.
  return decodeURI(yamlString);
}

export function parseYaml(yamlString: string): { nodes: FlowNode[], inputs: Input[], startNodeId: string } {
    const parsed: any = yaml.load(yamlString, { schema: FLOW_SCHEMA });
  
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid YAML format: root should be an object.');
    }
    if (!parsed.startNode || typeof parsed.startNode !== 'string') {
      throw new Error('Invalid YAML format: missing or invalid startNode.');
    }
    if (parsed.nodes === undefined || parsed.nodes === null || typeof parsed.nodes !== 'object') {
      throw new Error('Invalid YAML format: missing or invalid nodes map.');
    }
  
    const inputs: Input[] = parsed.inputs || [];
    const startNodeId: string = parsed.startNode;
    const nodes: FlowNode[] = [];
  
    for (const nodeId in parsed.nodes) {
      if (Object.prototype.hasOwnProperty.call(parsed.nodes, nodeId)) {
          const nodeData = parsed.nodes[nodeId];
          let nodeType: 'decision' | 'terminator' | null = null;
          let data: any = {};
  
          if (nodeData instanceof DecisionFlowData) {
              nodeType = 'decision';
              data = {
                  condition: nodeData.condition,
                  positivePath: nodeData.positivePath,
                  negativePath: nodeData.negativePath,
              };
          } else if (nodeData instanceof TerminatorFlowData) {
              nodeType = 'terminator';
              data = {
                  output: nodeData.output,
              };
          } else if (nodeData && typeof nodeData === 'object') { // Fallback for no tags
              if ('condition' in nodeData) {
                  nodeType = 'decision';
                  data = {
                      condition: nodeData.condition || '',
                      positivePath: nodeData.positivePath || '',
                      negativePath: nodeData.negativePath || '',
                  };
              } else if ('output' in nodeData) {
                  nodeType = 'terminator';
                  data = {
                      output: nodeData.output || {},
                  };
              }
          }
  
          if (nodeType) {
              nodes.push({
                  id: nodeId,
                  type: nodeType,
                  position: { x: 0, y: 0 }, // Position will be set by autoLayout
                  data,
              });
          } else {
              throw new Error(`Invalid or unknown node type for node ID: ${nodeId}`);
          }
      }
    }
    
    return { nodes, inputs, startNodeId };
  }

export function autoLayout(nodes: FlowNode[], startNodeId: string): FlowNode[] {
  if (!nodes.length || !nodes.some(n => n.id === startNodeId)) return nodes;

  const LEVEL_HEIGHT = 200; // Vertical distance between levels
  const NODE_WIDTH = 300;   // Horizontal distance between nodes on the same level
  const PADDING = 50;       // Padding from the top

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const levels = new Map<string, number>();
  const nodesPerLevel = new Map<number, string[]>();
  const visited = new Set<string>();
  const queue: string[] = [];
  
  // Graph traversal (BFS) to determine levels
  if (nodeMap.has(startNodeId)) {
    queue.push(startNodeId);
    visited.add(startNodeId);
    levels.set(startNodeId, 0);
  }

  let head = 0;
  while(head < queue.length) {
    const uId = queue[head++];
    const uNode = nodeMap.get(uId)!;
    const uLevel = levels.get(uId)!;

    if (!nodesPerLevel.has(uLevel)) {
      nodesPerLevel.set(uLevel, []);
    }
    // Avoid adding duplicates to the same level if there's a loop
    if (!nodesPerLevel.get(uLevel)!.includes(uId)) {
        nodesPerLevel.get(uLevel)!.push(uId);
    }

    const children: string[] = [];
    if (uNode.type === 'decision') {
      if (uNode.data.positivePath && nodeMap.has(uNode.data.positivePath)) children.push(uNode.data.positivePath);
      if (uNode.data.negativePath && nodeMap.has(uNode.data.negativePath)) children.push(uNode.data.negativePath);
    }

    for (const vId of children) {
      if (!visited.has(vId)) {
        visited.add(vId);
        const vLevel = uLevel + 1;
        levels.set(vId, vLevel);
        queue.push(vId);
      }
    }
  }

  // Position nodes that were not reachable from the start node
  let lastLevel = (nodesPerLevel.size > 0 ? Math.max(...nodesPerLevel.keys()) : -1) + 1;
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (!nodesPerLevel.has(lastLevel)) {
        nodesPerLevel.set(lastLevel, []);
      }
      nodesPerLevel.get(lastLevel)!.push(node.id);
      levels.set(node.id, lastLevel);
      visited.add(node.id);
    }
  }

  // Calculate positions
  const newNodes = [...nodes];
  const maxLevelWidth = Math.max(1, ...Array.from(nodesPerLevel.values()).map(levelNodes => levelNodes.length));
  const canvasWidth = maxLevelWidth * NODE_WIDTH;

  nodesPerLevel.forEach((levelNodes, level) => {
    const levelY = level * LEVEL_HEIGHT + PADDING;
    const levelWidth = levelNodes.length * NODE_WIDTH;
    const startX = (canvasWidth - levelWidth) / 2 + PADDING;

    levelNodes.forEach((nodeId, i) => {
      const nodeIndex = newNodes.findIndex(n => n.id === nodeId);
      if (nodeIndex !== -1) {
        newNodes[nodeIndex] = {
          ...newNodes[nodeIndex],
          position: {
            x: startX + i * NODE_WIDTH,
            y: levelY,
          },
        };
      }
    });
  });

  return newNodes;
}
