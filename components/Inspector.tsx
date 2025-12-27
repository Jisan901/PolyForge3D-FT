import React, { useState } from 'react';
import { Box, Layers, Globe, BoxSelect, Activity, Lightbulb, Cpu, FileCode } from 'lucide-react';
import { PropertySection } from './PropertySection';
import { Vector3Input, Checkbox, ColorInput, NumberInput, TextInput, AssetInput, RefInput } from './PropertyInputs';
import ContextMenu, { MenuItem } from './ContextMenu';
import { SelectorItem } from './ObjectSelector';
import { useObjectSelector } from './Utils/useSelector';
import { useEditorActions, useEditorStates } from '../contexts/EditorContext';
import * as THREE from "three";
import { PolyForge , mutationCall} from "../PolyForge";
import { useObserver } from "../PolyModule/Hooks";

const editor = PolyForge.editor;

/* ============================================================================
   HELPER FUNCTIONS
============================================================================ */

function getIconForComponentName(name: string) {
    switch (name) {
        case 'Script': return FileCode;
        case 'Transform': return Globe;
        case 'MeshRenderer': return Box;
        case 'Rigidbody': return Activity;
        case 'Collider': return BoxSelect;
        default: return undefined;
    }
}

function getIconForComponent(name: string) {
    if (name.includes('collider')) return BoxSelect;
    if (name.includes('rigidBody')) return Activity;
    if (name.includes('light')) return Lightbulb;
    if (name.includes('script')) return Cpu;
    return Layers;
}



// Create available components list
const AVAILABLE_COMPONENTS: SelectorItem[] = PolyForge.api.component.getAllTemplate().map(e => ({
    id: e.nameCode,
    name: e.name,
    category: 'components',
    description: e.description || '',
    icon: getIconForComponentName(e.name)
}));

/* ============================================================================
   PROPERTY INPUT RENDERER
============================================================================ */

interface RenderPropertyInputProps {
    path: string;
    val: any;
    recursive?: boolean;
}

const RenderPropertyInput: React.FC<RenderPropertyInputProps> = React.memo(({ path: key, val: v2, recursive }) => {
    const { selectedObject: object } = useEditorStates();
    const val = useObserver(object, key);
    const label = key.slice(key.lastIndexOf('.') + 1);



    const handleOnChange = (key: string) => {
        return (valS: any) => {
            editor.setProperty(object, key, valS);
        };
    };

    // Boolean
    if (typeof val === 'boolean') {
        return <Checkbox key={`${val}`} label={label} checked={val} onChange={handleOnChange(key)} />;
    }

    // Number
    if (typeof val === 'number') {
        return <NumberInput label={label} value={val} onChange={handleOnChange(key)} />;
    }

    // Color
    if (typeof val === 'object' && val?.isColor) {
        return <ColorInput
            label={label}
            value={val as string}
            onChange={(vec) => {
                editor.setProperty(object, key + '.r', vec.r / 255);
                editor.setProperty(object, key + '.g', vec.g / 255);
                editor.setProperty(object, key + '.b', vec.b / 255);
            }}
        />;
    }

    // Vector3
    if (typeof val === 'object' && val?.isVector3) {
        return <Vector3Input
            key={`${key}-${val.x}-${val.y}-${val.z}`}
            label={label}
            value={val}
            onChange={(vec) => {
                editor.setProperty(object, key + '.x', vec.x);
                editor.setProperty(object, key + '.y', vec.y);
                editor.setProperty(object, key + '.z', vec.z);
            }}
        />;
    }

    // Euler
    if (typeof val === 'object' && val?.isEuler) {
        return <Vector3Input
            key={`${key}-${val.x}-${val.y}-${val.z}`}
            label={label}
            value={{
                x: THREE.MathUtils.radToDeg(val.x),
                y: THREE.MathUtils.radToDeg(val.y),
                z: THREE.MathUtils.radToDeg(val.z),
            }}
            onChange={(vec) => {
                editor.setProperty(object, key + '.x', THREE.MathUtils.degToRad(vec.x));
                editor.setProperty(object, key + '.y', THREE.MathUtils.degToRad(vec.y));
                editor.setProperty(object, key + '.z', THREE.MathUtils.degToRad(vec.z));
            }}
        />;
    }
    
    
    /// file
    if (typeof val === 'object' && val?.isFile) {
        return <AssetInput key={`${key}.${val.value}`} label={label} value={val} onChange={e=>{
            handleOnChange(key)(e)
            mutationCall(object,'userData.components.7')
        }}/>
    }
    
    //ref
    if (typeof val === 'object' && val?.isRef) {
        return <RefInput key={`${key}.${val.ref}`} label={label} value={val} onChange={e=>{
            handleOnChange(key)(e)
            
        }}/>
    }

    // Nested object (recursive)
    if (typeof val === 'object' && val !== null && !Array.isArray(val) && recursive) {
        return (
            <div key={key} className="pl-2 border-l border-editor-border/20 ml-1 mb-2">
                <div className="text-[9px] uppercase text-editor-textDim mb-1 tracking-tighter opacity-50">
                    {label}
                </div>
                {Object.entries(val).map(([subKey, subVal]) => (
                    <RenderPropertyInput key={typeof subVal==='object' ?subKey+Object.keys(subVal).join(''):subKey} path={key + '.' + subKey} val={subVal} />
                ))}
            </div>
        );
    }

    // Default: Text input
    return <TextInput key={val} label={label} value={String(val)} onChange={handleOnChange(key)} />;
});

/* ============================================================================
   INSPECTOR COMPONENT
============================================================================ */

const Inspector: React.FC = () => {
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; component: string } | null>(null);
    const { selectedObject: object, mappedObject } = useEditorStates();
    const { onAddComponent, onRemoveComponent } = useEditorActions();

    // Use the custom hook for component selection
    const componentSelector = useObjectSelector({
        title: "Add Component",
        items: AVAILABLE_COMPONENTS,
        onSelect: (item) => {
            onAddComponent?.(item.id);
        },
    });

    const selectedName = useObserver(object, 'name');

    function getContextMenuItems(component: string): MenuItem[] {
        return [
            { label: `Reset`, action: () => onAddComponent(parseInt(component), true) },
            { separator: true, label: '', action: () => { } },
            { label: 'Copy Component', action: () => console.log('Copy Component') },
            { label: 'Paste Component Values', action: () => console.log('Paste Values'), disabled: true },
            { separator: true, label: '', action: () => { } },
            { label: 'Move Up', action: () => console.log('Move Up') },
            { label: 'Move Down', action: () => console.log('Move Down') },
            { separator: true, label: '', action: () => { } },
            { label: 'Remove Component', danger: true, action: () => onRemoveComponent?.(component) },
        ];
    }


    const handleContextMenu = (e: React.MouseEvent, component: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, component });
    };

    // Empty state
    if (!mappedObject || !object) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-editor-panel border-l border-editor-border text-editor-textDim">
                <Box size={32} className="mb-2 opacity-20" />
                <span className="text-xs">No object selected</span>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-editor-panel overflow-y-auto" key={object.uuid}>
            {/* Header */}
            <div className="h-10 flex items-center px-4 border-b border-editor-border bg-editor-bg sticky top-0 z-10 shrink-0">
                <div className="w-4 h-4 rounded-sm bg-editor-accent mr-2" />
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">{selectedName}</span>
                    <span className="text-[9px] text-editor-textDim uppercase">{object.type}</span>
                </div>
                <div className="flex-1" />
                <Checkbox label="Active" checked={object.visible} />
            </div>

            <div className="p-1 pb-10">
                {/* General Properties Section */}
                {Object.keys(mappedObject?.map || {}).length > 0 && (
                    <PropertySection
                        title="Properties"
                        icon={Layers}
                        onContextMenu={(e) => null}
                    >
                        {Object.entries(mappedObject.map).map(([key, val]) => (
                            <RenderPropertyInput key={key} path={key} val={val} />
                        ))}
                    </PropertySection>
                )}

                {/* Dynamic Component Sections */}
                {mappedObject?.components && Object.entries(mappedObject.components).map(([compName, compData]) => (
                    <PropertySection
                        key={compData.key}
                        title={compData.key}
                        icon={getIconForComponent(compData.key)}
                        onContextMenu={(e) => handleContextMenu(e, compName)}
                    >
                        {Object.entries(compData.data).map(([propKey, propVal]) => (
                            <RenderPropertyInput
                                key={typeof propVal==='object' ?propKey+Object.keys(propVal).join(''):propKey}
                                
                                path={`userData.components.${compName}.data.${propKey}`}
                                val={propVal}
                                recursive
                            />
                        ))}
                    </PropertySection>
                ))}

                {/* Add Component Button */}
                <div className="px-3 mt-4">
                    <button
                        className="w-full py-1.5 rounded border border-editor-border bg-white/5 text-[10px] hover:bg-white/10 text-editor-text transition-colors"
                        onClick={componentSelector.open}
                    >
                        Add Component
                    </button>
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={getContextMenuItems(contextMenu.component)}
                    onClose={() => setContextMenu(null)}
                />
            )}

            {/* Component Selector */}
            {componentSelector.Selector}
        </div>
    );
};

export default Inspector;