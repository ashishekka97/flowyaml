import { type FlowNode, type Input, type DecisionNodeData, type TerminatorNodeData } from '@/types';
import * as yaml from 'js-yaml';

// Helper classes for YAML serialization
class DecisionFlowData {
  condition: string;
  negativePath: string;
  positivePath: string;
  constructor(data: DecisionNodeData) {
    this.condition = data.condition;
    this.negativePath = data.negativePath;
    this.positivePath = data.positivePath;
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
        negativePath: d.negativePath || '',
        positivePath: d.positivePath || '',
    });
  },
  represent: (data: DecisionFlowData) => {
    return {
      condition: data.condition,
      negativePath: data.negativePath,
      positivePath: data.positivePath,
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
      negativePath: 'noDiscount',
      positivePath: 'highPurchaseCheck',
    },
  },
  {
    id: 'highPurchaseCheck',
    type: 'decision',
    position: { x: 550, y: 250 },
    data: {
      condition: 'input.purchaseAmount > 100.0',
      negativePath: 'standardDiscount',
      positivePath: 'highDiscount',
    },
  },
  {
    id: 'noDiscount',
    type: 'terminator',
    position: { x: 150, y: 250 },
    data: {
      output: { discountPercentage: 0.0 },
    },
  },
  {
    id: 'highDiscount',
    type: 'terminator',
    position: { x: 650, y: 450 },
    data: {
      output: { discountPercentage: 20.0 },
    },
  },
  {
    id: 'standardDiscount',
    type: 'terminator',
    position: { x: 450, y: 450 },
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

  const LEVEL_HEIGHT = 200;
  const NODE_WIDTH = 300;
  const PADDING = 50;

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const levels = new Map<string, number>();
  const nodesPerLevel = new Map<number, string[]>();
  const visited = new Set<string>();
  const queue: string[] = [];

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
    if (!nodesPerLevel.get(uLevel)!.includes(uId)) {
      nodesPerLevel.get(uLevel)!.push(uId);
    }

    if (uNode.type === 'decision') {
      const children = [uNode.data.negativePath, uNode.data.positivePath].filter(id => id && nodeMap.has(id));
      for (const vId of children) {
        if (!visited.has(vId)) {
          visited.add(vId);
          levels.set(vId, uLevel + 1);
          queue.push(vId);
        }
      }
    }
  }
  
  let lastDiscoveredLevel = nodesPerLevel.size > 0 ? Math.max(...nodesPerLevel.keys()) : -1;
  nodes.forEach(node => {
      if (!visited.has(node.id)) {
          lastDiscoveredLevel++;
          if (!nodesPerLevel.has(lastDiscoveredLevel)) {
              nodesPerLevel.set(lastDiscoveredLevel, []);
          }
          nodesPerLevel.get(lastDiscoveredLevel)!.push(node.id);
          visited.add(node.id);
      }
  });


  const decisionNodesPerLevel = new Map<number, string[]>();
  const terminatorNodeIds: string[] = [];

  nodesPerLevel.forEach((levelNodeIds, level) => {
    const decisions: string[] = [];
    levelNodeIds.forEach(nodeId => {
      if (nodeMap.get(nodeId)!.type === 'decision') {
        decisions.push(nodeId);
      } else {
        if (!terminatorNodeIds.includes(nodeId)) {
            terminatorNodeIds.push(nodeId);
        }
      }
    });
    if (decisions.length > 0) {
      decisionNodesPerLevel.set(level, decisions);
    }
  });

  nodes.forEach(node => {
    if(node.type === 'terminator' && !terminatorNodeIds.includes(node.id)) {
        terminatorNodeIds.push(node.id);
    }
  });

  const newNodes = [...nodes];
  const maxDecisionLevel = decisionNodesPerLevel.size > 0 ? Math.max(...decisionNodesPerLevel.keys()) : -1;
  
  const maxDecisionLevelWidth = Math.max(0, ...Array.from(decisionNodesPerLevel.values()).map(levelNodes => levelNodes.length));
  const canvasWidth = Math.max(maxDecisionLevelWidth, terminatorNodeIds.length) * NODE_WIDTH;

  decisionNodesPerLevel.forEach((levelNodeIds, level) => {
    const levelY = level * LEVEL_HEIGHT + PADDING;
    const levelWidth = levelNodeIds.length * NODE_WIDTH;
    const startX = (canvasWidth - levelWidth) / 2 + PADDING;

    levelNodeIds.sort((a,b) => a.localeCompare(b));

    levelNodeIds.forEach((nodeId, i) => {
      const nodeIndex = newNodes.findIndex(n => n.id === nodeId);
      if (nodeIndex !== -1) {
        newNodes[nodeIndex].position = {
          x: startX + i * NODE_WIDTH,
          y: levelY,
        };
      }
    });
  });

  if (terminatorNodeIds.length > 0) {
    const terminatorLevel = maxDecisionLevel + 1;
    const levelY = terminatorLevel * LEVEL_HEIGHT + PADDING;
    const levelWidth = terminatorNodeIds.length * NODE_WIDTH;
    const startX = (canvasWidth - levelWidth) / 2 + PADDING;

    terminatorNodeIds.sort((a,b) => a.localeCompare(b));

    terminatorNodeIds.forEach((nodeId, i) => {
      const nodeIndex = newNodes.findIndex(n => n.id === nodeId);
      if (nodeIndex !== -1) {
        newNodes[nodeIndex].position = {
          x: startX + i * NODE_WIDTH,
          y: levelY,
        };
      }
    });
  }

  return newNodes;
}
