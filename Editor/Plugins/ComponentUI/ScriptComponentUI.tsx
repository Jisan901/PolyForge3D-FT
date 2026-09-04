import React, { useEffect, useState } from 'react';
import { RefreshCw, Code2, AlertCircle } from 'lucide-react';
import { ComponentProps } from './ComponentRegistry';
import {
  AssetInput,
  BooleanInput,
  NumberInput,
  TextInput,
  Vector3Input,
  ColorInput,
  RefInput
} from '@/Plugins/Inspector/lib/inspector';
import { Editor } from '@/Editor/Editor';
import { mutationCall } from '@/Editor/Mutation';
import { refreshScriptVariables } from '@/Editor/Utils';

export const ScriptComponentUI: React.FC<ComponentProps> = ({
  object,
  componentKey,
  componentData,
  basePath
}) => {
  const data = componentData.data || {};
  const [propMap, setPropMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scriptPath = data.path?.value || (typeof data.path === 'string' ? data.path : null);

  // Load script class definition to inspect declared properties/propMap
  useEffect(() => {
    let cancelled = false;
    if (!scriptPath) {
      setPropMap({});
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    Editor.core.loaders.scriptLoader
      .getScriptClass(scriptPath, true)
      .then((ScriptClass: any) => {
        if (cancelled) return;
        setLoading(false);
        if (ScriptClass && ScriptClass.propMap) {
          setPropMap(ScriptClass.propMap);
          // Sync any new defaults into variables
          const variables = data.variables || {};
          let changed = false;
          const updatedVars = { ...variables };

          Object.keys(ScriptClass.propMap).forEach((key) => {
            if (updatedVars[key] === undefined) {
              updatedVars[key] = ScriptClass.propMap[key].default ?? null;
              changed = true;
            }
          });

          if (changed) {
            data.variables = updatedVars;
            mutationCall(object, `${basePath}.data.variables`);
          }
        } else {
          setPropMap({});
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        setLoading(false);
        setError(err.message || 'Failed to load script');
        setPropMap({});
      });

    return () => {
      cancelled = true;
    };
  }, [scriptPath, object, basePath, data]);

  const handleReload = async () => {
    if (!scriptPath) return;
    try {
      setLoading(true);
      await Editor.core.loaders.scriptLoader.getScriptClass(scriptPath, false); // force reload
      refreshScriptVariables();
      setLoading(false);
      mutationCall(object, `${basePath}.data`);
    } catch (e: any) {
      setLoading(false);
      setError(e.message || 'Reload failed');
    }
  };

  const renderVariableInput = (varName: string, val: any) => {
    const meta = propMap[varName] || {};
    const propPath = `${basePath}.data.variables.${varName}`;
    const label = meta.label || varName;

    if (meta.type === 'number' || typeof val === 'number') {
      return (
        <NumberInput
          key={propPath}
          label={label}
          obj={object}
          prop={propPath}
          step={meta.step ?? 0.1}
          min={meta.min}
          max={meta.max}
        />
      );
    }

    if (meta.type === 'boolean' || typeof val === 'boolean') {
      return (
        <BooleanInput
          key={propPath}
          label={label}
          obj={object}
          prop={propPath}
        />
      );
    }

    if (typeof val === 'object' && val !== null) {
      if (val.isVector3 || meta.type === 'vector3') {
        return (
          <Vector3Input
            key={propPath}
            label={label}
            obj={object}
            prop={propPath}
          />
        );
      }
      if (val.isColor || meta.type === 'color') {
        return (
          <ColorInput
            key={propPath}
            label={label}
            obj={object}
            prop={propPath}
          />
        );
      }
      if (val.isFile || meta.type === 'file' || meta.type === 'asset') {
        return (
          <AssetInput
            key={propPath}
            label={label}
            obj={object}
            prop={propPath}
          />
        );
      }
      if (val.isRef || meta.type === 'ref' || meta.type === 'object') {
        return (
          <RefInput
            key={propPath}
            label={label}
            obj={object}
            prop={propPath}
          />
        );
      }
    }

    return (
      <TextInput
        key={propPath}
        label={label}
        obj={object}
        prop={propPath}
      />
    );
  };

  const variables = data.variables || {};
  const variableKeys = Array.from(
    new Set([...Object.keys(variables), ...Object.keys(propMap)])
  );

  return (
    <div className="flex flex-col gap-1.5 py-1">
      <AssetInput
        label="Script"
        obj={object}
        prop={`${basePath}.data.path`}
        placeholder="Drop .ts / .js script"
        accept={['.ts', '.js']}
      />

      <BooleanInput
        label="Enabled"
        obj={object}
        prop={`${basePath}.data.enabled`}
      />

      {error && (
        <div className="flex items-center gap-1 text-[10px] text-red-400 bg-red-950/30 p-1 rounded border border-red-900/50">
          <AlertCircle size={12} className="shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {scriptPath && (
        <div className="mt-1 pt-1.5 border-t border-[#2a2a2a] flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">
            <span className="flex items-center gap-1">
              <Code2 size={11} className="text-blue-400" />
              Variables
            </span>
            <button
              type="button"
              onClick={handleReload}
              disabled={loading}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
              title="Reload script and sync variables"
            >
              <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
              Reload
            </button>
          </div>

          {variableKeys.length === 0 ? (
            <div className="text-[10px] text-gray-500 italic py-0.5">
              No exposed variables on script
            </div>
          ) : (
            variableKeys.map((key) => renderVariableInput(key, variables[key]))
          )}
        </div>
      )}
    </div>
  );
};
