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
    const newNodes = [...nodes];
    const positions = new Map<string, { x: number, y: number }>();
    const PADDING = 50;
    const LEVEL_HEIGHT = 180;
    const NODE_WIDTH = 250;
  
    const decisionNodes = newNodes.filter(n => n.type === 'decision');
    const terminatorNodes = newNodes.filter(n => n.type === 'terminator');
    terminatorNodes.sort((a,b) => a.id.localeCompare(b.id));

    // 1. Position terminator nodes first, they form the layout baseline
    const maxDecisionLevel = decisionNodes.length > 0 ? (
        decisionNodes.reduce((max, node) => {
            const children = [node.data.negativePath, node.data.positivePath].filter(Boolean);
            return Math.max(max, children.length > 0 ? 1 : 0);
        }, 0)
    ) : -1;
    
    const maxLevel = newNodes.reduce((max, n) => {
        const children = n.type === 'decision' ? [n.data.negativePath, n.data.positivePath].filter(Boolean) : [];
        return Math.max(max, children.length);
    }, 0);

    const levels = new Map<string, number>();
    const toProcess = [startNodeId];
    const processed = new Set<string>();
    levels.set(startNodeId, 0);

    while(toProcess.length > 0) {
        const currentId = toProcess.shift()!;
        if(processed.has(currentId)) continue;
        processed.add(currentId);

        const node = nodeMap.get(currentId);
        if(!node || node.type !== 'decision') continue;
        
        const currentLevel = levels.get(currentId)!;
        [node.data.negativePath, node.data.positivePath].filter(Boolean).forEach(childId => {
            if(!levels.has(childId) || levels.get(childId)! < currentLevel + 1) {
                levels.set(childId, currentLevel + 1);
            }
            toProcess.push(childId);
        });
    }

    const maxNodeLevel = Math.max(0, ...Array.from(levels.values()));
    const terminatorY = (maxNodeLevel + 1) * LEVEL_HEIGHT + PADDING;
    
    terminatorNodes.forEach((node, i) => {
        positions.set(node.id, { x: i * NODE_WIDTH + PADDING, y: terminatorY });
    });


    // 3. Position decision nodes bottom-up
    const decisionNodeIds = decisionNodes.map(n => n.id);
    const positionedDecisions = new Set<string>();

    const positionNode = (nodeId: string) => {
        if(positionedDecisions.has(nodeId) || !nodeMap.has(nodeId) || nodeMap.get(nodeId)!.type === 'terminator') return;

        const node = nodeMap.get(nodeId) as DecisionNode;
        const childrenIds = [node.data.positivePath, node.data.negativePath].filter(id => id && nodeMap.has(id));
        
        childrenIds.forEach(childId => {
            if(decisionNodeIds.includes(childId)) {
                positionNode(childId);
            }
        });

        let x;
        const childPositions = childrenIds.map(id => positions.get(id)!).filter(Boolean);
        if (childPositions.length > 0) {
            x = childPositions.reduce((sum, pos) => sum + pos.x, 0) / childPositions.length;
        } else {
            // This case should ideally not happen for a connected graph. Fallback.
            x = (newNodes.length / 2) * NODE_WIDTH;
        }

        const level = levels.get(nodeId) || 0;
        positions.set(nodeId, { x, y: level * LEVEL_HEIGHT + PADDING });
        positionedDecisions.add(nodeId);
    }
    
    decisionNodeIds.forEach(id => positionNode(id));

    const nodesByLevel = new Map<number, string[]>();
    decisionNodeIds.forEach(id => {
        const level = levels.get(id);
        if(level === undefined) return;
        if(!nodesByLevel.has(level)) nodesByLevel.set(level, []);
        nodesByLevel.get(level)!.push(id);
    });

    for(const level of Array.from(nodesByLevel.keys()).sort((a,b) => a-b)) {
        const levelNodes = nodesByLevel.get(level)!;
        if(levelNodes.length < 2) continue;

        const sortedLevelNodes = levelNodes.map(id => ({id, pos: positions.get(id)!})).sort((a,b) => a.pos.x - b.pos.x);
        
        for (let i = 0; i < sortedLevelNodes.length - 1; i++) {
            const nodeA = sortedLevelNodes[i];
            const nodeB = sortedLevelNodes[i+1];
            const distance = nodeB.pos.x - nodeA.pos.x;
            if (distance < NODE_WIDTH) {
                const shift = (NODE_WIDTH - distance) / 2;
                positions.get(nodeA.id)!.x -= shift;
                positions.get(nodeB.id)!.x += shift;
            }
        }
    }
    
    // 5. Assign final positions
    newNodes.forEach(node => {
      if (positions.has(node.id)) {
        node.position = positions.get(node.id)!;
      }
    });
  
    return newNodes;
  }
