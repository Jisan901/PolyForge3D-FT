import React, { Suspense, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

import { Editor } from "@/Editor/Editor";
import LoadingFallback from './components/Utils/Loading';

globalThis.editor = Editor;


const App = React.lazy(() => import('./App'));
const EditorProvider = React.lazy(() => import('./contexts/EditorContext'));


function Bootstrap() {

    const [ready, setReady] = useState(false);

    useEffect(() => {
        (async () => {
            await Editor.init(); // runs AFTER loading screen appears
            Editor.boot(); // runs AFTER loading screen appears
            setReady(true);
        })();
    }, []);

    // Show loader while PolyForge initializes
    if (!ready) {
        return <LoadingFallback />;
    }

    return (
        <Suspense fallback={<LoadingFallback />}>
            <EditorProvider>
                <App />
            </EditorProvider>
        </Suspense>
    );
}

const rootElement = document.getElementById('root')!;
const root = ReactDOM.createRoot(rootElement);

root.render(<Bootstrap />);
