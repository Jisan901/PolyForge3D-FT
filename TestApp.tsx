import React, { useState, useEffect, useRef } from "react";

// -----------------------------------------------------
// Global Mutable Data
// -----------------------------------------------------
const data = {
  position: { x: 1, y: 2, z: 3 },
  transform: { rotation: { x: 10, y: 20, z: 30 , order:{x:1,y:2,z:3}} },
  name: "Cube"
};


// -----------------------------------------------------
// Mutation Bus (callback receives changedPath)
// -----------------------------------------------------
class MutationBus {
  constructor() {
    this.listeners = new Set();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(path) {
    for (const fn of this.listeners) fn(path);
  }
}

const mutationBus = new MutationBus();


// -----------------------------------------------------
// mutate(object, "a.b.c", value)
// -----------------------------------------------------
function mutate(obj, path, value) {
  const keys = path.split(".");
  let ref = obj;

  for (let i = 0; i < keys.length - 1; i++) ref = ref[keys[i]];
  ref[keys[keys.length - 1]] = value;

  mutationBus.emit(path);
}

window.mutate = mutate;
window.data = data
// -----------------------------------------------------
// useObserver(path)
// -----------------------------------------------------
function useObserver(path) {
  const [, rerender] = useState(0);

  useEffect(() =>
    mutationBus.subscribe((changedPath) => {
      if (changedPath === path) rerender((v) => v + 1);
    })
  , [path]);

  // Resolve deep value
  const keys = path.split(".");
  let ref = data;
  for (const k of keys) ref = ref[k];
  return ref;
}

function getVal(path){
    const keys = path.split(".");
  let ref = data;
  for (const k of keys) ref = ref[k];
  return ref;
}


// -----------------------------------------------------
// Leaf Component with Re-render Counter
// -----------------------------------------------------
function Leaf({ path }) {
  const value = useObserver(path);

  // Count re-renders for debugging
  const counter = useRef(0);
  counter.current++;  // increments on each render

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        defaultValue={value}
        style={{ marginLeft: 6 }}
        onBlur={(e) => mutate(data, path, parseValue(e.target.value))}
      />

      <span style={{ fontSize: 12, opacity: 0.7 }}>
        renders: {counter.current}
      </span>
    </div>
  );
}

function parseValue(v) {
  const n = Number(v);
  return isNaN(n) ? v : n;
}


// -----------------------------------------------------
// Deep Recursive Renderer
// -----------------------------------------------------
function DeepMutationComponent({ path = "", obj = data }) {
  const value = path ? getVal(path) : obj;

  if (typeof value !== "object") return <Leaf path={path} />;

  return (
    <div style={{ paddingLeft: 14, borderLeft: "1px solid #444" }}>
      {Object.keys(value).map((key) => {
        const childPath = path ? `${path}.${key}` : key;
        return (
          <div key={childPath} style={{ marginBottom: 6 }}>
            <strong>{key}</strong>
            <DeepMutationComponent path={childPath} />
          </div>
        );
      })}
    </div>
  );
}


// -----------------------------------------------------
// App
// -----------------------------------------------------
export default function App() {
  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h2>Deep Mutation Example (with Leaf Rerender Counter)</h2>
      <DeepMutationComponent />
    </div>
  );
}