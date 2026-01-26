import React, { Suspense, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

import { Instance, boot } from "@/Core/PolyForge";
import LoadingFallback from './components/Utils/Loading';

globalThis.i = Instance;


function Bootstrap() {

  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await Instance.init(); // runs AFTER loading screen appears
      setReady(true);
    })();
  }, []);
  useEffect(() => {
      if (ready) {
          document.getElementById('canvasParent').appendChild(Instance.engine.getCanvas())
          boot()
      }
  },[ready])
  // Show loader while PolyForge initializes
  if (!ready) {
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <div id="canvasParent"></div>
    </Suspense>
  );
}

const rootElement = document.getElementById('root')!;
const root = ReactDOM.createRoot(rootElement);

root.render(<Bootstrap />);
