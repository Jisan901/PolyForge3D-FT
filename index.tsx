import React, { Suspense } from 'react';
import { PolyForge } from "./PolyForge"
// import App from './App'
// import EditorProvider from './contexts/EditorContext'
import ReactDOM from 'react-dom/client';


async function main() {

    await PolyForge.init()
    const App = React.lazy(() => import('./App'));
    const EditorProvider = React.lazy(() => import('./contexts/EditorContext'));


    const rootElement = document.getElementById('root');
    if (!rootElement) {
        throw new Error("Could not find root element to mount to");
    }

    const root = ReactDOM.createRoot(rootElement);



    root.render(
        <>
            <Suspense fallback={<h1>loading...</h1>}>
                <EditorProvider>
                    <App />
                </EditorProvider>
            </Suspense>
        </>
    );
}
main()
