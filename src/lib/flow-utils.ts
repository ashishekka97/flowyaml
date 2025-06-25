import { type FlowNode, type Input, type DecisionNode, type DecisionNodeData, type TerminatorNodeData } from '@/types';
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
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
  
    // 1. Build adjacency list and in-degree map
    for (const node of nodes) {
      adj.set(node.id, []);
      inDegree.set(node.id, 0);
    }
  
    for (const node of nodes) {
      if (node.type === 'decision') {
        const children = [node.data.positivePath, node.data.negativePath].filter(id => id && nodeMap.has(id));
        for (const childId of children) {
          adj.get(node.id)!.push(childId);
          inDegree.set(childId, (inDegree.get(childId) || 0) + 1);
        }
      }
    }
  
    // 2. Topological sort (Kahn's) to get levels (longest path from source)
    const queue: string[] = [];
    nodes.forEach(node => {
      if (inDegree.get(node.id) === 0) {
        queue.push(node.id);
      }
    });
  
    const levels = new Map<string, number>();
    nodes.forEach(node => levels.set(node.id, 0));
    
    const sortedNodes: string[] = [];
  
    while (queue.length > 0) {
      const u = queue.shift()!;
      sortedNodes.push(u);
  
      const children = adj.get(u) || [];
      for (const v of children) {
        const newLevel = (levels.get(u) || 0) + 1;
        if (newLevel > (levels.get(v) || 0)) {
          levels.set(v, newLevel);
        }
        inDegree.set(v, (inDegree.get(v) || 0) - 1);
        if (inDegree.get(v) === 0) {
          queue.push(v);
        }
      }
    }
  
    // Cycle detection
    if (sortedNodes.length !== nodes.length) {
      throw new Error("Cycle detected in flowchart. Please use the AI Validator to identify the issue, or manually correct the connections.");
    }
    
    // 3. Position nodes
    const PADDING_X = 100;
    const PADDING_Y = 50;
    const LEVEL_HEIGHT = 200;
    const NODE_WIDTH = 250;
    const positions = new Map<string, { x: number, y: number }>();
    
    // Group nodes by level
    const nodesByLevel = new Map<number, string[]>();
    let maxDecisionLevel = 0;
    for (const node of nodes) {
        if (node.type === 'decision') {
            const level = levels.get(node.id) || 0;
            if (!nodesByLevel.has(level)) {
                nodesByLevel.set(level, []);
            }
            nodesByLevel.get(level)!.push(node.id);
            if (level > maxDecisionLevel) {
              maxDecisionLevel = level;
            }
        }
    }
  
    // 4. Position terminator nodes at the bottom
    const terminatorNodes = nodes.filter(n => n.type === 'terminator');
    terminatorNodes.sort((a,b) => a.id.localeCompare(b.id));
    const terminatorY = (maxDecisionLevel + 1) * LEVEL_HEIGHT + PADDING_Y;
    terminatorNodes.forEach((node, i) => {
      positions.set(node.id, {
          x: i * (NODE_WIDTH + PADDING_X) + PADDING_X,
          y: terminatorY
      });
    });
  
    // 5. Position decision nodes from bottom-up (using reverse topological order)
    const reversedSortedNodes = [...sortedNodes].reverse();
    for (const nodeId of reversedSortedNodes) {
        const node = nodeMap.get(nodeId);
        if (!node || node.type === 'terminator') continue;
  
        const level = levels.get(nodeId) || 0;
        const y = level * LEVEL_HEIGHT + PADDING_Y;
  
        let x: number;
        const children = adj.get(nodeId)?.filter(id => positions.has(id)) || [];
        if (children.length > 0) {
            const childPositions = children.map(id => positions.get(id)!);
            x = childPositions.reduce((sum, pos) => sum + pos.x, 0) / childPositions.length;
        } else {
            const levelNodes = nodesByLevel.get(level) || [];
            const indexInLevel = levelNodes.indexOf(nodeId);
            x = indexInLevel * (NODE_WIDTH + PADDING_X) + PADDING_X;
        }
        positions.set(nodeId, { x, y });
    }
  
    // 6. Resolve horizontal overlaps
    const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);
    for (const level of sortedLevels) {
      const levelNodes = (nodesByLevel.get(level) || []).map(id => ({ id, pos: positions.get(id)! })).sort((a, b) => a.pos.x - b.pos.x);
      for (let i = 0; i < levelNodes.length - 1; i++) {
          const nodeA = levelNodes[i];
          const nodeB = levelNodes[i+1];
          const desiredSpacing = NODE_WIDTH + PADDING_X / 2;
          const currentSpacing = nodeB.pos.x - nodeA.pos.x;
          if (currentSpacing < desiredSpacing) {
              const shift = (desiredSpacing - currentSpacing);
              for (let j = i + 1; j < levelNodes.length; j++) {
                  levelNodes[j].pos.x += shift;
              }
          }
      }
    }
  
    // Find minX to shift entire graph to be positive
    let minX = Infinity;
    for(const pos of positions.values()) {
        minX = Math.min(minX, pos.x);
    }
    const xOffset = minX < PADDING_X ? PADDING_X - minX : 0;
  
    // 7. Apply final positions
    const newNodes = nodes.map(node => {
      if (positions.has(node.id)) {
        const pos = positions.get(node.id)!;
        return { ...node, position: {x: pos.x + xOffset, y: pos.y} };
      }
      return { ...node, position: { x: PADDING_X, y: PADDING_Y } }; // Fallback for unsorted nodes
    });
  
    return newNodes;
}
