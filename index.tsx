import React, { Suspense, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

import { PolyForge } from "./PolyForge";
import LoadingFallback from './components/Utils/Loading';

const App = React.lazy(() => import('./App'));
const EditorProvider = React.lazy(() => import('./contexts/EditorContext'));

function Bootstrap() {

  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await PolyForge.init(); // runs AFTER loading screen appears
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
