import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRight, ChevronDown, Box, Camera, Lightbulb, Folder, Eye, Layers, Circle, Cylinder, Square, List, ListTree } from 'lucide-react';
import { ObjectType } from '../types';
import ContextMenu, { MenuItem } from './ContextMenu';
import { useHierarchyEditor } from '../contexts/EditorContext';
import { PolyForge, mutate, mutationCall, toast } from "../PolyForge"
import { useObserver, useValidatedSelection, useSceneObserver, useTargetObserver } from "../PolyModule/Hooks"
import {DragAndDropZone} from "./Utils/DragNDrop";

const editor = PolyForge.editor;

const HierarchyNode = ({ node, depth, isFlat, handleContextMenu }) => {
    const name = useObserver(node, 'name');
    const expanded = useObserver(node.userData, 'expanded');

    useTargetObserver(node);

    const isSelected = useValidatedSelection(node.uuid);

    let selectObject = useCallback((node) => {
        PolyForge.api.three.setTransformTarget(node); // selection separated 
    }, []) // test
    const toggleExpand = useCallback((node) => {
        mutate(node.userData, 'expanded', !node.userData.expanded)
    }, []);

    const hasChildren = node.children?.length > 0;

    const getIcon = (type: ObjectType) => {
        switch (type) {
            case ObjectType.SCENE: return <Layers size={12} className="text-orange-400" />;
            case ObjectType.CAMERA: return <Camera size={12} className="text-blue-400" />;
            case ObjectType.LIGHT: return <Lightbulb size={12} className="text-yellow-400" />;
            case ObjectType.FOLDER: return <Folder size={12} className="text-editor-textDim" />;
            case ObjectType.SPHERE: return <Circle size={12} className="text-green-400" />;
            case ObjectType.CYLINDER: return <Cylinder size={12} className="text-green-400" />;
            case ObjectType.PLANE: return <Square size={12} className="text-green-400" />;
            default: return <Box size={12} className="text-green-400" />;
        }
    };


    return (
    <DragAndDropZone onDrop={async (e)=>{
        if (e.type==='Object'){
        
            let oldParent = e.data.parent
            editor.addObject(node,e.data)
            mutationCall(oldParent)
            mutationCall(node)
            
            toast('Parent changes')
        }
        else if (e.type==='Asset'){
            
            const objectData = await editor.api.loadObjectFile(e.data.fullPath);
            editor.addObject(node,objectData);
            mutationCall(node)
            toast('loaded')
        }
    }} payload={{type: 'Object', data: node}}>
        
        <div>
            <div
                className={`
                  flex items-center py-[2px] cursor-pointer text-[11px] select-none group
                  ${isSelected ? 'bg-editor-accent text-white' : 'hover:bg-white/5 text-editor-text'}
                `}
                style={{ paddingLeft: isFlat ? '8px' : `${depth * 12 + 4}px` }}
                onClick={(e) => {
                    e.stopPropagation();
                    selectObject(node);
                }}
                onContextMenu={(e) => handleContextMenu(e, node.uuid)}
            >
                {/* Expand */}
                <div
                    className="w-4 h-4 mr-1 flex items-center justify-center"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isFlat && hasChildren) toggleExpand(node);
                    }}
                >
                    {!isFlat && hasChildren && (
                        expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />
                    )}
                </div>

                {getIcon(node.type)}

                <EditableName
                    key={name}
                    name={name || node.type}
                    onRename={(newName) => editor.setProperty(node, 'name', newName)}
                />
                <div className={`w-6  ${node.visible ? 'opacity-100' : 'opacity-50'}`}>

                    <Eye
                        size={10}
                        onClick={() =>
                            editor.setProperty(node, 'visible', !node.visible)
                        }
                    />
                </div>
            </div>

            {!isFlat && hasChildren && expanded && (
                <div>
                    {node.children.map(child => (
                        <HierarchyNode
                            key={child.uuid}
                            node={child}
                            depth={depth + 1}
                            isFlat={false}
                            handleContextMenu={handleContextMenu}
                        />
                    ))}
                </div>
            )}
        </div>
    </DragAndDropZone>
        
    );
}
const HierarchyNodeMemo = React.memo(HierarchyNode)

const Hierarchy: React.FC = () => {

    const {
        scene,
        addObject,
        selectObject,
        deleteObject,
        onDuplicate
    } = useHierarchyEditor();



    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; targetId: string } | null>(null);
    const [viewMode, setViewMode] = useState<'SCENE' | 'ENTITY'>('SCENE');



    const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        selectObject(id);// Select the item being right-clicked 
        setContextMenu({ x: e.clientX, y: e.clientY, targetId: id });
    }, []);

    const getContextMenuItems = (id: string): MenuItem[] => [
        { label: 'Copy', shortcut: 'Ctrl+C', action: () => console.log('Copy', id) },
        { label: 'Paste', shortcut: 'Ctrl+V', action: () => console.log('Paste', id), disabled: true },
        { label: 'Duplicate', shortcut: 'Ctrl+D', action: () => onDuplicate && onDuplicate(id) },
        { separator: true, label: '', action: () => { } },
        { label: 'Rename', shortcut: 'F2', action: () => console.log('Rename', id) },
        { label: 'Delete', shortcut: 'Del', danger: true, action: () => deleteObject && deleteObject(id) },
        { separator: true, label: '', action: () => { } },
        { label: 'Create Empty', action: () => addObject && addObject(ObjectType.FOLDER, id) },
        {
            label: '3D Object',
            action: () => { },
            submenu: [
                { label: 'Cube', action: () => addObject && addObject(ObjectType.CUBE, id) },
                { label: 'Sphere', action: () => addObject && addObject(ObjectType.SPHERE, id) },
                { label: 'Capsule', action: () => addObject && addObject(ObjectType.CAPSULE, id) },
                { label: 'Cylinder', action: () => addObject && addObject(ObjectType.CYLINDER, id) },
                { label: 'Plane', action: () => addObject && addObject(ObjectType.PLANE, id) },
                { label: 'Light', action: () => addObject && addObject(ObjectType.LIGHT, id) },
                { label: 'Lod', action: () => addObject && addObject(ObjectType.LOD, id) },
            ]
        },
    ];


    const flattenNodes = (nodes): [] => {
        let result: any = [];
        nodes.forEach(node => {
            result.push(node);
            if (node.children) {
                result = result.concat(flattenNodes(node.children));
            }
        });
        return result;
    };


    return (
        <div

            className="h-full flex flex-col bg-editor-panel"

        >
            {/* Header */}
            <div className="h-8 flex items-center px-3 border-b border-editor-border bg-editor-bg shrink-0 justify-between">
                <span className="text-xs font-semibold tracking-wide text-editor-textDim uppercase">Hierarchy</span>

                {/* View Toggle */}
                <div className="flex bg-editor-input rounded border border-editor-border p-[2px]">
                    <button
                        className={`p-0.5 rounded ${viewMode === 'SCENE' ? 'bg-editor-accent text-white' : 'text-editor-textDim hover:text-white'}`}
                        onClick={() => setViewMode('SCENE')}
                        title="Scene Hierarchy"
                    >
                        <ListTree size={12} />
                    </button>
                    <button
                        className={`p-0.5 rounded ${viewMode === 'ENTITY' ? 'bg-editor-accent text-white' : 'text-editor-textDim hover:text-white'}`}
                        onClick={() => setViewMode('ENTITY')}
                        title="Entity List"
                    >
                        <List size={12} />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="p-1 border-b border-editor-border shrink-0">
                <input
                    type="text"
                    placeholder="Search..."
                    className="w-full bg-editor-input text-xs px-2 py-1 rounded border border-editor-border focus:border-editor-accent focus:outline-none text-editor-text placeholder-zinc-600"
                />
            </div>

            {/* Tree Content */}
            <div className="flex-1 overflow-y-auto py-1"
                onClick={e => selectObject(null)}
                onContextMenu={(e) => {
                    // Handle right click on empty space in hierarchy
                    if (e.target === e.currentTarget) {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, targetId: null });///add on primary 
                    }
                }}
            >
                {viewMode === 'SCENE'
                    ? scene.map(node => (
                        <HierarchyNodeMemo key={node.uuid} node={node} depth={0} isFlat={false} handleContextMenu={handleContextMenu} />
                    ))
                    : flattenNodes(scene).map(node => (
                        <HierarchyNodeMemo key={node.uuid} node={node} depth={0} isFlat={true} handleContextMenu={handleContextMenu} />
                    ))
                }
            </div>

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={getContextMenuItems(contextMenu.targetId)}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
};

export default Hierarchy;


function EditableName({ name, onRename }) {
    const ref = React.useRef(null);
    const [editing, setEditing] = React.useState(false);
    const [backup, setBackup] = React.useState(name);

    const startEdit = (e) => {
        setBackup(name);
        setEditing(true);

        requestAnimationFrame(() => {
            const el = ref.current;
            if (el) {
                el.focus();
                document.execCommand("selectAll", false, null);
            }
        });
    };

    const finishEdit = () => {
        const newName = ref.current.innerText.trim();
        setEditing(false);
        if (newName !== backup) onRename(newName);
    };

    const cancelEdit = () => {
        ref.current.innerText = backup;
        setEditing(false);
    };

    return (
        <span
            ref={ref}
            contentEditable={editing}
            suppressContentEditableWarning={true}
            onContextMenu={(e) => {if (editing) e.stopPropagation()}}
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={startEdit}
            onBlur={finishEdit}
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    finishEdit();
                }
                if (e.key === "Escape") {
                    e.preventDefault();
                    cancelEdit();
                }
            }}
            className={`flex-1 truncate outline-none ${editing ? "bg-[#0002] px-1 rounded" : ""
                }`}
        >
            {name}
        </span>
    );
}