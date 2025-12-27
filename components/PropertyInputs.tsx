import React from 'react';
import { Target, File } from 'lucide-react';
import { DragAndDropZone } from "./Utils/DragNDrop";

export const Vector3Input: React.FC<{
    label: string;
    value: { x: number; y: number; z: number };
    onChange?: (v: { x: number; y: number; z: number }) => void;
}> = ({ label, value, onChange }) => {

    const [state, setState] = React.useState({ x: value.x, y: value.y, z: value.z });


    const update = (key: "x" | "y" | "z", newVal: number) => {
        const next = { ...state, [key]: newVal };
        setState(next);
        onChange?.(next);
    };

    return (
        <div className="flex items-center mb-1">
            <div className="w-16 text-[10px] text-editor-textDim flex items-center">
                {label}
            </div>

            <div className="flex-1 flex gap-1">
                {/* X */}
                <div className="flex-1 flex items-center bg-editor-input rounded border border-editor-border overflow-hidden">
                    <div className="w-4 flex items-center justify-center text-[9px] font-bold text-red-400 cursor-ew-resize bg-white/5 h-full">X</div>
                    <input
                        type="number"
                        defaultValue={state.x}
                        onBlur={(e) => update("x", parseFloat(e.target.value))}
                        className="w-full bg-transparent text-[10px] px-1 py-1 focus:outline-none text-white no-spinner"
                    />
                </div>

                {/* Y */}
                <div className="flex-1 flex items-center bg-editor-input rounded border border-editor-border overflow-hidden">
                    <div className="w-4 flex items-center justify-center text-[9px] font-bold text-green-400 cursor-ew-resize bg-white/5 h-full">Y</div>
                    <input
                        type="number"
                        defaultValue={state.y}
                        onBlur={(e) => update("y", parseFloat(e.target.value))}
                        className="w-full bg-transparent text-[10px] px-1 py-1 focus:outline-none text-white no-spinner"
                    />
                </div>

                {/* Z */}
                <div className="flex-1 flex items-center bg-editor-input rounded border border-editor-border overflow-hidden">
                    <div className="w-4 flex items-center justify-center text-[9px] font-bold text-blue-400 cursor-ew-resize bg-white/5 h-full">Z</div>
                    <input
                        type="number"
                        defaultValue={state.z}
                        onBlur={(e) => update("z", parseFloat(e.target.value))}
                        className="w-full bg-transparent text-[10px] px-1 py-1 focus:outline-none text-white no-spinner"
                    />
                </div>
            </div>
        </div>
    );
};




export const Checkbox: React.FC<{
    label: string;
    checked?: boolean;
    onChange?: (v: boolean) => void;
}> = ({ label, checked = false, onChange }) => {

    const [state, setState] = React.useState(checked);

    const toggle = () => {
        const v = !state;
        setState(v);
        onChange?.(v);
    };

    return (
        <div className="flex items-center mb-2 mt-1 cursor-pointer select-none" onClick={toggle}>
            <div className="w-4 h-4 mr-2 border border-editor-border bg-editor-input rounded flex items-center justify-center">
                {state && <div className="w-2 h-2 bg-editor-accent rounded-[1px]" />}
            </div>
            <span className="text-[11px] text-editor-text">{label}</span>
        </div>
    );
};


function hexToRgb(hex: string) {
    const parsed = hex.replace("#", "");
    const r = parseInt(parsed.substring(0, 2), 16);
    const g = parseInt(parsed.substring(2, 4), 16);
    const b = parseInt(parsed.substring(4, 6), 16);
    return { r, g, b };
}

export const ColorInput: React.FC<{
    label: string;
    value: { r: number; g: number; b: number };
    onChange?: (v: { r: number; g: number; b: number }) => void;
}> = ({ label, value, onChange }) => {

    const [state, setState] = React.useState({
        r: value.r * 255,
        b: value.b * 255,
        g: value.g * 255,
    });


    const rgbToHex = (v: typeof value) =>
        "#" + [v.r, v.g, v.b].map((n) => n.toString(16).padStart(2, "0")).join("");

    const hexValue = rgbToHex(state);

    const apply = (hex: string) => {
        const parsed = hex.replace("#", "");
        const next = {
            r: parseInt(parsed.slice(0, 2), 16),
            g: parseInt(parsed.slice(2, 4), 16),
            b: parseInt(parsed.slice(4, 6), 16),
        };
        setState(next);
        onChange?.(next);
    };

    return (
        <div className="flex items-center mb-2">
            <span className="w-24 text-[10px] text-editor-textDim">{label}</span>

            <label
                className="flex-1 h-5 rounded border border-editor-border cursor-pointer flex items-center px-1"
                style={{ background: hexValue }}
            >
                <span className="text-[9px] mix-blend-difference text-white ml-auto">
                    {`rgb(${state.r}, ${state.g}, ${state.b})`}
                </span>

                <input
                    type="color"
                    defaultValue={hexValue}
                    onChange={(e) => apply(e.target.value)}
                    className="hidden"
                />
            </label>
        </div>
    );
};

export const NumberInput: React.FC<{
    label: string;
    value: number;
    onChange?: (v: number) => void;
}> = ({ label, value, onChange }) => {

    const [state, setState] = React.useState(value);

    const update = (v: string) => {
        const n = parseFloat(v);
        setState(n);
        onChange?.(n);
    };

    return (
        <div className="flex items-center mb-2">
            <span className="w-24 text-[10px] text-editor-textDim">{label}</span>
            <input
                type="number"
                defaultValue={state}
                onBlur={(e) => update(e.target.value)}
                className="flex-1 bg-editor-input border border-editor-border rounded px-2 py-1 text-[10px] focus:outline-none focus:border-editor-accent"
            />
        </div>
    );
};


export const TextInput: React.FC<{
    label: string;
    value: string;
    onChange?: (v: string) => void;
}> = ({ label, value, onChange }) => {

    const [state, setState] = React.useState(value);


    const update = (v: string) => {
        setState(v);
        onChange?.(v);
    };

    return (
        <div className="flex items-center mb-2">
            <span className="w-24 text-[10px] text-editor-textDim capitalize">{label}</span>
            <input
                type="text"
                defaultValue={state}
                onBlur={(e) => update(e.target.value)}
                className="flex-1 bg-editor-input border border-editor-border rounded px-2 py-1 text-[10px] focus:outline-none focus:border-editor-accent"
            />
        </div>
    );
};


export const AssetInput: React.FC<{ label: string; value: string; onChange?: (v: string) => void; }> = ({ label, value, onChange }) => {
    const [state, setState] = React.useState(value);


    const update = (v: string) => {
        setState(v);
        onChange?.(v);
    };
    return (
        <div className="flex items-center mb-2">
            <span className="w-24 text-[10px] text-editor-textDim capitalize">{label}</span>
            <DragAndDropZone
                highlight={false}
                onDrop={(e) => {
                    if (e.type === 'Asset') update({ ...state, value: e.data.id })
                }} className="flex-1 flex items-center bg-editor-input border border-editor-border rounded overflow-hidden group">
                <div className="px-2 py-1 flex-1 text-[10px] text-editor-text truncate">
                    {state.value || 'None'}
                </div>
                <div
                    className="px-1.5 py-1 bg-white/5 border-l border-editor-border hover:bg-editor-accent hover:text-green-200 transition-colors text-green-800"
                >
                    <Target size={12} />
                </div>
            </DragAndDropZone>
        </div>
    );
}


export const RefInput: React.FC<{ label: string; value: string; onChange?: (v: string) => void; }> = ({ label, value, onChange }) => {
    const [state, setState] = React.useState(value);


    const update = (v: string) => {
        setState(v);
        onChange?.(v);
    };
    return (
        <div className="flex items-center mb-2">
            <span className="w-24 text-[10px] text-editor-textDim capitalize">{label}</span>
            <DragAndDropZone
                highlight={false}
                onDrop={(e) => {
                    if (e.type === 'Object') update({ ...state, ref: e.data.uuid, name:e.data.name  })
                }} className="flex-1 flex items-center bg-editor-input border border-editor-border rounded overflow-hidden group">
                <div className="px-2 py-1 flex-1 text-[10px] text-editor-text truncate">
                    {state.name || 'None'}
                </div>
                <div
                    className="px-1.5 py-1 bg-white/5 border-l border-editor-border hover:bg-editor-accent hover:text-blue-200 transition-colors text-blue-800"
                >
                    <Target size={12} />
                </div>
            </DragAndDropZone>
        </div>
    );
}
