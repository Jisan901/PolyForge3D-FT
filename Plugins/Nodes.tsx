
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    ReactFlow,
  Background, 
  Controls, 
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import * as THREE from 'three';

// Custom Node Components
//import { Handle, Position } from 'reactflow';

const CustomNode = ({ data, isConnectable }) => {
  const { label, inputs = [], outputs = [], color = '#4a5568' } = data;

  return (
    <div className=" px-4 py-3 shadow-lg rounded-lg border-2 border-gray-700 bg-gray-800 min-w-[180px] overflow-visible">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <div className="font-bold text-white text-sm">{label}</div>
      </div>

      <div className="flex flex-col space-y-2">
        {inputs.map((input, i) => (
          <div key={`input-${input.id}`} className="flex items-center gap-2 text-xs relative">
            <Handle
              type="target"
              position={Position.Left}
              id={input.id}
              isConnectable={isConnectable}
              className="w-3 h-3 bg-blue-500 border-2 border-white -ml-[17px]"
            />
            <span className="text-gray-300">{input.label}</span>
          </div>
        ))}

        {outputs.map((output, i) => (
          <div key={`output-${output.id}`} className="flex items-center justify-end gap-2 text-xs relative">
            <span className="text-gray-300">{output.label}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={output.id}
              isConnectable={isConnectable}
              className="w-3 h-3 bg-green-500 border-2 border-white -mr-[17px]"
            />
          </div>
        ))}
      </div>
    </div>
  );
};


const nodeTypes = {
  customNode: CustomNode
};

const NodeMaterialEditor = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const meshRef = useRef(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, 400 / 300, 0.1, 1000);
    camera.position.z = 2;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      antialias: true 
    });
    renderer.setSize(400, 300);
    rendererRef.current = renderer;

    // Create a sphere with basic material
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.MeshStandardMaterial({ color: 0x2194ce });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (meshRef.current) {
        meshRef.current.rotation.y += 0.01;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({ ...params }, eds));
  }, [setEdges]);

  const addNode = (type) => {
    const nodeConfigs = {
      color: {
        label: 'Color',
        color: '#ef4444',
        inputs: [],
        outputs: [{ id: 'color', label: 'Color' }]
      },
      texture: {
        label: 'Texture',
        color: '#8b5cf6',
        inputs: [{ id: 'uv', label: 'UV' }],
        outputs: [{ id: 'color', label: 'Color' }]
      },
      multiply: {
        label: 'Multiply',
        color: '#10b981',
        inputs: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' }
        ],
        outputs: [{ id: 'result', label: 'Result' }]
      },
      add: {
        label: 'Add',
        color: '#10b981',
        inputs: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' }
        ],
        outputs: [{ id: 'result', label: 'Result' }]
      },
      normal: {
        label: 'Normal',
        color: '#3b82f6',
        inputs: [],
        outputs: [{ id: 'normal', label: 'Normal' }]
      },
      uv: {
        label: 'UV',
        color: '#f59e0b',
        inputs: [],
        outputs: [{ id: 'uv', label: 'UV' }]
      },
      fresnel: {
        label: 'Fresnel',
        color: '#06b6d4',
        inputs: [
          { id: 'normal', label: 'Normal' },
          { id: 'view', label: 'View' }
        ],
        outputs: [{ id: 'fresnel', label: 'Fresnel' }]
      },
      output: {
        label: 'Material Output',
        color: '#ec4899',
        inputs: [
          { id: 'color', label: 'Base Color' },
          { id: 'metalness', label: 'Metalness' },
          { id: 'roughness', label: 'Roughness' },
          { id: 'normal', label: 'Normal' }
        ],
        outputs: []
      }
    };

    const config = nodeConfigs[type];
    const newNode = {
      id: `${type}-${Date.now()}`,
      type: 'customNode',
      position: { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 400 + 100 
      },
      data: config
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const onNodeClick = (event, node) => {
    setSelectedNode(node);
  };

  const clearGraph = () => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white" onClick={(e) => e.currentTarget.requestFullscreen()}>
      {/* Left Sidebar - Node Library */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Node Library</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">INPUT</h3>
            <div className="space-y-2">
              <button onClick={() => addNode('color')} className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm">
                Color
              </button>
              <button onClick={() => addNode('texture')} className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm">
                Texture
              </button>
              <button onClick={() => addNode('uv')} className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded text-sm">
                UV
              </button>
              <button onClick={() => addNode('normal')} className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm">
                Normal
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">MATH</h3>
            <div className="space-y-2">
              <button onClick={() => addNode('multiply')} className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm">
                Multiply
              </button>
              <button onClick={() => addNode('add')} className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm">
                Add
              </button>
              <button onClick={() => addNode('fresnel')} className="w-full px-3 py-2 bg-cyan-600 hover:bg-cyan-700 rounded text-sm">
                Fresnel
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">OUTPUT</h3>
            <button onClick={() => addNode('output')} className="w-full px-3 py-2 bg-pink-600 hover:bg-pink-700 rounded text-sm">
              Material Output
            </button>
          </div>

          <div className="pt-4 border-t border-gray-700">
            <button onClick={clearGraph} className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm">
              Clear Graph
            </button>
          </div>
        </div>
      </div>

      {/* Center - Node Graph */}
      <div className="flex-1 relative">
        <ReactFlow
        colorMode="dark"
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-900"
        >
          <Background color="#374151" gap={16} />
          <Controls className="bg-gray-800 border-gray-700" />
        </ReactFlow>

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-500">
              <p className="text-lg mb-2">Add nodes from the left panel</p>
              <p className="text-sm">Connect them to build your material</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Preview & Properties */}
      <div className="w-80 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Preview</h2>
        
        <div className="mb-6 bg-gray-900 rounded-lg overflow-hidden">
          <canvas ref={canvasRef} className="w-full" />
        </div>

        {selectedNode && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Node Properties</h3>
            <div className="bg-gray-900 p-3 rounded">
              <p className="text-sm text-gray-400">Type</p>
              <p className="font-mono">{selectedNode.data.label}</p>
            </div>
            <div className="bg-gray-900 p-3 rounded">
              <p className="text-sm text-gray-400">ID</p>
              <p className="font-mono text-xs">{selectedNode.id}</p>
            </div>
          </div>
        )}

        {!selectedNode && (
          <div className="text-gray-500 text-sm">
            Select a node to view its properties
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-lg font-semibold mb-2">Info</h3>
          <div className="text-sm text-gray-400 space-y-1">
            <p>Nodes: {nodes.length}</p>
            <p>Connections: {edges.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeMaterialEditor;