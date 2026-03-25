import { UVGraph } from './UVGraph';
import { EditorProvider } from './EditorContext';


export function UVEditorApp() {
  return (
    <EditorProvider>
      <UVGraph />
    </EditorProvider>
  );
}
