import React, { Suspense, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Instance, boot } from "@/Core/PolyForge";
import LoadingFallback from './Ui/components/Utils/Loading';


globalThis.i = Instance;



function Bootstrap() {
    const [ready, setReady] = useState(false);


    useEffect(() => {
        (async () => {
            await Instance.init(true);
            setReady(true);
        })();
    }, []);

    useEffect(() => {
        if (!ready) return;

        const parent = document.getElementById('canvasParent');
        if (parent) {
            parent.appendChild(Instance.engine.getCanvas());
            boot();
            return;
        }

        
    }, [ready]);

    if (!ready) {
        return <LoadingFallback />;
    }

    return (
        <Suspense fallback={<LoadingFallback />}>
            <div className="w-screen h-screen flex flex-col bg-black overflow-hidden font-sans">
                <div id="canvasParent"></div>
            </div>
        </Suspense>
    );
}

const rootElement = document.getElementById('root')!;
const root = ReactDOM.createRoot(rootElement);
root.render(<Bootstrap />);