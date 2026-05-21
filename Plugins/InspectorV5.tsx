import React, { useState, useEffect, useCallback } from 'react';
import {
  globalInspector,
  InspectorPanel,
  DefinedInspector,
  SelectInput,
  GUIInspector
} from './Inspector/lib/inspector';
import { Editor } from "@/Editor/Editor";
const editor = Editor;


export default function App() {
    const [_, rerender] = useState(0);
  useEffect(() => {
        globalInspector.inspect(editor.api.three.selectedObject);
        const unsub = editor.api.buses.selectionUpdate.subscribe((target) => {
            globalInspector.inspect(target);
            rerender(e=>e+1)
        });
        rerender(e=>e+1)
        return ()=>{
            unsub()
            globalInspector.inspect(null)
        }
  }, []);

  

  return (
    <div className="h-full w-full">
        {globalInspector.folders.length > 0 && (
          <InspectorPanel title="Custom GUI">
            <GUIInspector />
          </InspectorPanel>
        )}

        <InspectorPanel>
          <DefinedInspector obj={globalInspector.currentObject} />
        </InspectorPanel>
    </div>
  );
}
