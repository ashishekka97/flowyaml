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

  const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));

  sortedNodes.forEach(node => {
    if (node.type === 'decision') {
      const data: any = {
        condition: node.data.condition,
      };
      // Ensure negative path comes first if it exists
      if (node.data.negativePath) {
        data.negativePath = node.data.negativePath;
      }
      if (node.data.positivePath) {
        data.positivePath = node.data.positivePath;
      }
      yamlObject.nodes[node.id] = new DecisionFlowData(data);
    } else if (node.type === 'terminator') {
      yamlObject.nodes[node.id] = new TerminatorFlowData(node.data);
    }
  });
  
  let yamlString = yaml.dump(yamlObject, {
    schema: FLOW_SCHEMA,
    noRefs: true,
    sortKeys: (a, b) => {
        const order = ['condition', 'negativePath', 'positivePath', 'output'];
        const indexA = order.indexOf(a);
        const indexB = order.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    }
  });
  
  yamlString = yamlString.replace("nodes: {}", "nodes: !!map {}");
  
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
  
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
    // 1. Assign initial levels with BFS (for a compact layout)
    const levels = new Map<string, number>();
    const queue: { id: string, level: number }[] = [];
    const visited = new Set<string>();
  
    if (nodeMap.has(startNodeId)) {
      queue.push({ id: startNodeId, level: 0 });
      visited.add(startNodeId);
    }
  
    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      levels.set(id, level);
      const node = nodeMap.get(id);
  
      if (node?.type === 'decision') {
        [node.data.negativePath, node.data.positivePath]
          .filter(Boolean)
          .forEach(childId => {
            if (!visited.has(childId)) {
              visited.add(childId);
              queue.push({ id: childId, level: level + 1 });
            }
          });
      }
    }
  
    // Assign a default level for any disconnected nodes
    nodes.forEach(n => {
      if (!visited.has(n.id)) {
        levels.set(n.id, 0);
      }
    });
  
    // 2. Iteratively fix violations (upward-pointing edges)
    let changed = true;
    while (changed) {
      changed = false;
      nodes.forEach(u => {
        if (u.type === 'decision') {
          [u.data.negativePath, u.data.positivePath]
            .filter(vId => vId && nodeMap.has(vId))
            .forEach(vId => {
              const uLevel = levels.get(u.id)!;
              const vLevel = levels.get(vId)!;
              // If an edge goes from a higher level to a lower level, it's a violation.
              // Move the lower-level node down to the same level as the higher one.
              if (uLevel > vLevel) {
                levels.set(vId, uLevel);
                changed = true;
              }
            });
        }
      });
    }
  
    // 3. Position nodes based on calculated levels
    const LEVEL_HEIGHT = 200;
    const NODE_WIDTH = 300;
    const PADDING = 50;
  
    const decisionNodesByLevel = new Map<number, string[]>();
    const terminatorNodeIds: string[] = [];
  
    nodes.forEach(node => {
      const level = levels.get(node.id);
      if (level === undefined) return;
  
      if (node.type === 'decision') {
        if (!decisionNodesByLevel.has(level)) {
          decisionNodesByLevel.set(level, []);
        }
        decisionNodesByLevel.get(level)!.push(node.id);
      } else {
        terminatorNodeIds.push(node.id);
      }
    });
  
    const newNodes = [...nodes];
      
    const maxNodesOnDecisionLevel = decisionNodesByLevel.size > 0 
      ? Math.max(0, ...Array.from(decisionNodesByLevel.values()).map(levelNodes => levelNodes.length))
      : 0;
    const canvasWidth = Math.max(maxNodesOnDecisionLevel, terminatorNodeIds.length) * NODE_WIDTH;
  
    const sortedLevels = Array.from(decisionNodesByLevel.keys()).sort((a, b) => a - b);
      
    sortedLevels.forEach(level => {
      const levelNodeIds = decisionNodesByLevel.get(level)!;
      levelNodeIds.sort((a, b) => a.localeCompare(b));
  
      const levelY = level * LEVEL_HEIGHT + PADDING;
      const levelWidth = levelNodeIds.length * NODE_WIDTH;
      const startX = (canvasWidth - levelWidth) / 2 + PADDING;
  
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
      const terminatorLevel = (sortedLevels.length > 0 ? sortedLevels[sortedLevels.length - 1] : -1) + 1;
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