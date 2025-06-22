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
  
    // 1. Assign levels to ensure a strict top-to-bottom flow (calculates longest path)
    const levels = new Map<string, number>();
    const queue: { id: string, level: number }[] = [];
    const visited = new Set<string>();
  
    // Start with a BFS-like approach to get initial levels
    if (nodeMap.has(startNodeId)) {
      queue.push({ id: startNodeId, level: 0 });
      visited.add(startNodeId);
      levels.set(startNodeId, 0);
    }
  
    let head = 0;
    while(head < queue.length) {
      const { id, level } = queue[head++];
      const node = nodeMap.get(id);
  
      if (node?.type === 'decision') {
        [node.data.negativePath, node.data.positivePath]
          .filter(Boolean)
          .forEach(childId => {
            if (!visited.has(childId)) {
                visited.add(childId);
                levels.set(childId, level + 1);
                queue.push({ id: childId, level: level + 1 });
            }
          });
      }
    }
  
    // Iteratively fix violations to ensure every edge points downwards.
    // This correctly handles complex DAGs by finding the longest path to each node.
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
              if (uLevel >= vLevel) {
                levels.set(vId, uLevel + 1);
                changed = true;
              }
            });
        }
      });
    }

    // Assign a default level for any disconnected nodes
    nodes.forEach(n => {
        if (!levels.has(n.id)) {
            levels.set(n.id, 0); 
        }
    });

    const newNodes = [...nodes];
    const positions = new Map<string, { x: number, y: number }>();
    const PADDING = 50;
    const LEVEL_HEIGHT = 200;
    const NODE_WIDTH = 350;

    // Group nodes by their final calculated level
    const nodesByLevel = new Map<number, string[]>();
    newNodes.forEach(n => {
        const level = levels.get(n.id)!;
        if (!nodesByLevel.has(level)) nodesByLevel.set(level, []);
        nodesByLevel.get(level)!.push(n.id);
    });

    // Position terminator nodes first, they form the layout baseline
    const terminatorNodes = newNodes.filter(n => n.type === 'terminator');
    terminatorNodes.sort((a,b) => a.id.localeCompare(b.id));

    const decisionNodes = newNodes.filter(n => n.type === 'decision');
    const decisionLevels = Array.from(new Set(decisionNodes.map(n => levels.get(n.id)!)));
    const maxDecisionLevel = decisionLevels.length > 0 ? Math.max(...decisionLevels) : -1;
    const terminatorY = (maxDecisionLevel + 1) * LEVEL_HEIGHT + PADDING;
    
    terminatorNodes.forEach((node, i) => {
        positions.set(node.id, { x: i * NODE_WIDTH + PADDING, y: terminatorY });
    });

    // Position decision nodes bottom-up
    const sortedDecisionLevels = decisionLevels.sort((a,b) => b-a);
    for (const level of sortedDecisionLevels) {
        const levelNodes = nodesByLevel.get(level)!.filter(id => nodeMap.get(id)?.type === 'decision');
        for (const nodeId of levelNodes) {
            if (positions.has(nodeId)) continue;
            
            const node = nodeMap.get(nodeId) as DecisionNode;
            const childrenIds = [node.data.positivePath, node.data.negativePath].filter(id => id && positions.has(id));
            
            let x;
            if (childrenIds.length > 0) {
                const childPositions = childrenIds.map(id => positions.get(id)!);
                x = childPositions.reduce((sum, pos) => sum + pos.x, 0) / childPositions.length;
            } else {
                // If no positioned children, find a gap.
                const nodesOnLevel = nodesByLevel.get(level)!;
                const nodeIndex = nodesOnLevel.indexOf(nodeId);
                x = nodeIndex * NODE_WIDTH + PADDING; 
            }
            positions.set(nodeId, { x, y: level * LEVEL_HEIGHT + PADDING });
        }
    }
  
    // Resolve overlaps by spreading nodes on each level
    const allLevels = Array.from(nodesByLevel.keys()).sort((a,b) => a-b);
    for (const level of allLevels) {
        const levelNodeIds = nodesByLevel.get(level)!;
        const levelPositions = levelNodeIds.map(id => ({ id, pos: positions.get(id)! })).filter(item => item.pos);
        levelPositions.sort((a, b) => a.pos.x - b.pos.x);
        
        for (let i = 0; i < levelPositions.length - 1; i++) {
            const nodeA = levelPositions[i];
            const nodeB = levelPositions[i+1];
            const distance = nodeB.pos.x - nodeA.pos.x;
            if (distance < NODE_WIDTH) {
                const shift = (NODE_WIDTH - distance) / 2;
                nodeA.pos.x -= shift;
                nodeB.pos.x += shift;
            }
        }
        // Re-center the whole level after spreading
        const totalWidth = levelPositions.length > 0 ? levelPositions[levelPositions.length-1].pos.x - levelPositions[0].pos.x : 0;
        const currentCenter = totalWidth / 2 + (levelPositions[0]?.pos.x || 0);
        const canvasCenter = (terminatorNodes.length * NODE_WIDTH) / 2;
        const shift = canvasCenter - currentCenter;

        levelPositions.forEach(item => item.pos.x += shift);
    }
    
    // Assign final positions
    newNodes.forEach(node => {
      if (positions.has(node.id)) {
        node.position = positions.get(node.id)!;
      }
    });
  
    return newNodes;
  }
