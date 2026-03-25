import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════
// CORE — EventEmitter
// ═══════════════════════════════════════════════════════════════
class EventEmitter {
  constructor() { this._listeners = {}; }
  on(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
    return () => this.off(event, cb);
  }
  off(event, cb) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(l => l !== cb);
  }
  emit(event, data) {
    (this._listeners[event] || []).forEach(cb => cb(data));
  }
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT REGISTRY
// ═══════════════════════════════════════════════════════════════
class ComponentRegistry {
  static _map = {};
  static register(nameCode, def) { this._map[nameCode] = def; }
  static get(nameCode) { return this._map[nameCode]; }
  static all() { return Object.entries(this._map).map(([code, def]) => ({ nameCode: parseInt(code), ...def })); }
}

// Built-in component definitions
ComponentRegistry.register(5, {
  key: "rigidbody", label: "Rigidbody", color: "#e5c07b", icon: "⬡",
  schema: {
    mass:        { type: "number", label: "Mass",         min: 0,   step: 0.1  },
    useGravity:  { type: "boolean",label: "Use Gravity"                         },
    isKinematic: { type: "boolean",label: "Is Kinematic"                        },
    drag:        { type: "number", label: "Drag",         min: 0,   step: 0.01 },
    angularDrag: { type: "number", label: "Angular Drag", min: 0,   step: 0.01 },
  },
  defaults: { mass: 1, useGravity: true, isKinematic: false, drag: 0, angularDrag: 0.05 },
});

ComponentRegistry.register(6, {
  key: "collider", label: "Collider", color: "#56b6c2", icon: "◻",
  schema: {
    shape:     { type: "select",  label: "Shape",      options: ["box","sphere","capsule"] },
    isTrigger: { type: "boolean", label: "Is Trigger"                                       },
    size:      { type: "vec3",    label: "Size",       step: 0.1                            },
    radius:    { type: "number",  label: "Radius",     min: 0, step: 0.01                  },
    height:    { type: "number",  label: "Height",     min: 0, step: 0.01                  },
  },
  defaults: { shape: "box", size: { x:1,y:1,z:1,isVector3:true }, radius: 0.5, height: 2, isTrigger: false },
});

ComponentRegistry.register(7, {
  key: "script", label: "Script", color: "#98c379", icon: "{}",
  schema: {
    scriptPath: { type: "string",  label: "Script Path" },
    enabled:    { type: "boolean", label: "Enabled"     },
    updateRate: { type: "number",  label: "Update Rate", min: 1, max: 120, step: 1 },
  },
  defaults: { scriptPath: "", enabled: true, updateRate: 60 },
});

ComponentRegistry.register(8, {
  key: "audio", label: "Audio Source", color: "#c678dd", icon: "♪",
  schema: {
    clip:      { type: "string",  label: "Clip"      },
    volume:    { type: "number",  label: "Volume",   min: 0, max: 1,   step: 0.01 },
    pitch:     { type: "number",  label: "Pitch",    min: 0, max: 3,   step: 0.01 },
    loop:      { type: "boolean", label: "Loop"      },
    playOnAwake:{ type:"boolean", label: "Play On Awake" },
  },
  defaults: { clip: "", volume: 1, pitch: 1, loop: false, playOnAwake: false },
});

// ═══════════════════════════════════════════════════════════════
// INSPECTOR CLASS
// ═══════════════════════════════════════════════════════════════
class Inspector extends EventEmitter {
  constructor() {
    super();
    this.object = null;         // selected THREE.Object3D
    this._nextId = 10;
  }

  // ── Selection ────────────────────────────────────────────────
  select(object) {
    if (this.object === object) return;
    const prev = this.object;
    this.object = object;
    if (!object) { this.emit("deselect", { prev }); return; }
    if (!object.userData.components) object.userData.components = {};
    this.emit("select", { object, prev });
  }

  deselect() { this.select(null); }

  // ── Component CRUD ───────────────────────────────────────────
  getComponents() {
    if (!this.object) return {};
    return this.object.userData.components || {};
  }

  addComponent(nameCode) {
    if (!this.object) return;
    const comps = this.object.userData.components;
    if (comps[nameCode]) return; // already exists
    const def = ComponentRegistry.get(nameCode);
    if (!def) return;
    const id = this._nextId++;
    comps[nameCode] = { id, nameCode, key: def.key, data: { ...def.defaults } };
    this.emit("component:add", { object: this.object, nameCode, component: comps[nameCode] });
    return comps[nameCode];
  }

  removeComponent(nameCode) {
    if (!this.object) return;
    const comp = this.object.userData.components[nameCode];
    if (!comp) return;
    delete this.object.userData.components[nameCode];
    this.emit("component:remove", { object: this.object, nameCode, component: comp });
  }

  getComponent(nameCode) {
    return this.object?.userData.components?.[nameCode] || null;
  }

  // ── Property Mutation ────────────────────────────────────────
  setProperty(nameCode, prop, value) {
    const comp = this.getComponent(nameCode);
    if (!comp) return;
    const old = comp.data[prop];
    comp.data[prop] = value;
    this.emit("change", { object: this.object, nameCode, key: comp.key, prop, value, old });
  }

  // ── Three.js Object Properties ───────────────────────────────
  setPosition(v) {
    if (!this.object) return;
    this.object.position.set(v.x, v.y, v.z);
    this.emit("change", { object: this.object, nameCode: "transform", prop: "position", value: v });
  }
  setRotation(v) {
    if (!this.object) return;
    this.object.rotation.set(
      THREE.MathUtils.degToRad(v.x),
      THREE.MathUtils.degToRad(v.y),
      THREE.MathUtils.degToRad(v.z)
    );
    this.emit("change", { object: this.object, nameCode: "transform", prop: "rotation", value: v });
  }
  setScale(v) {
    if (!this.object) return;
    this.object.scale.set(v.x, v.y, v.z);
    this.emit("change", { object: this.object, nameCode: "transform", prop: "scale", value: v });
  }
  setMaterialProp(prop, value) {
    if (!this.object?.material) return;
    this.object.material[prop] = value;
    this.emit("change", { object: this.object, nameCode: "material", prop, value });
  }

  // ── Serialize ────────────────────────────────────────────────
  serialize() {
    if (!this.object) return null;
    return this.object.toJSON();
  }
}

// Singleton
const inspector = new Inspector();

// ═══════════════════════════════════════════════════════════════
// FIELD RENDERERS (schema-driven)
// ═══════════════════════════════════════════════════════════════
const S = {
  row: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 },
  label: { fontSize:11, color:"#999" },
  input: { background:"#1a1a1a", border:"1px solid #3a3a3a", borderRadius:4, color:"#ddd", fontSize:12, padding:"3px 6px", outline:"none" },
};

function FieldNumber({ value, onChange, min, max, step=0.1 }) {
  return (
    <input type="number" value={parseFloat(value?.toFixed?.(4) ?? value)} step={step} min={min} max={max}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      style={{ ...S.input, width: 80 }} />
  );
}
function FieldBoolean({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width:30, height:16, borderRadius:8, background: value?"#61afef":"#3a3a3a", cursor:"pointer", position:"relative", transition:"background .15s" }}>
      <div style={{ width:12, height:12, borderRadius:6, background:"#fff", position:"absolute", top:2, left: value?16:2, transition:"left .15s" }} />
    </div>
  );
}
function FieldColor({ value, onChange }) {
  const hex = typeof value === "number"
    ? "#" + value.toString(16).padStart(6,"0")
    : value;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <span style={{ fontSize:11, color:"#666" }}>{hex}</span>
      <input type="color" value={hex} onChange={e => onChange(e.target.value)} style={{ width:24, height:18, border:"none", padding:0, cursor:"pointer", borderRadius:3 }} />
    </div>
  );
}
function FieldSelect({ value, onChange, options=[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ ...S.input, width:100 }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
function FieldString({ value, onChange }) {
  return <input type="text" value={value || ""} onChange={e => onChange(e.target.value)} style={{ ...S.input, width:110, fontSize:11 }} />;
}
function FieldVec3({ value, onChange, step=0.1 }) {
  const v = value || { x:0,y:0,z:0 };
  const axes = ["x","y","z"];
  const colors = ["#e06c75","#98c379","#61afef"];
  return (
    <div style={{ display:"flex", gap:3, marginTop:2 }}>
      {axes.map((ax,i) => (
        <div key={ax} style={{ flex:1, display:"flex", alignItems:"center", background:"#1a1a1a", borderRadius:4, border:"1px solid #3a3a3a", overflow:"hidden" }}>
          <span style={{ padding:"0 4px", fontSize:10, fontWeight:700, color:colors[i], background:"#252525" }}>{ax.toUpperCase()}</span>
          <input type="number" value={parseFloat((v[ax]??0).toFixed(3))} step={step}
            onChange={e => onChange({ ...v, [ax]: parseFloat(e.target.value)||0 })}
            style={{ width:"100%", background:"transparent", border:"none", outline:"none", color:"#ddd", fontSize:11, padding:"3px 3px" }} />
        </div>
      ))}
    </div>
  );
}

function SchemaField({ prop, def, value, onChange }) {
  const isVec3 = def.type === "vec3";
  return (
    <div style={{ marginBottom: isVec3 ? 8 : 5 }}>
      {isVec3 ? (
        <>
          <div style={{ fontSize:11, color:"#999", marginBottom:3 }}>{def.label}</div>
          <FieldVec3 value={value} onChange={onChange} step={def.step} />
        </>
      ) : (
        <div style={S.row}>
          <span style={S.label}>{def.label}</span>
          {def.type === "number"  && <FieldNumber  value={value} onChange={onChange} min={def.min} max={def.max} step={def.step} />}
          {def.type === "boolean" && <FieldBoolean value={value} onChange={onChange} />}
          {def.type === "color"   && <FieldColor   value={value} onChange={onChange} />}
          {def.type === "select"  && <FieldSelect  value={value} onChange={onChange} options={def.options} />}
          {def.type === "string"  && <FieldString  value={value} onChange={onChange} />}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════
function Chevron({ open }) {
  return (
    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ transform: open?"rotate(0deg)":"rotate(-90deg)", transition:"transform .15s", flexShrink:0 }}>
      <path d="M6 9l6 6 6-6"/>
    </svg>
  );
}

function Section({ title, color="#61afef", icon, onRemove, children, defaultOpen=true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom:5, background:"#252526", borderRadius:6, border:"1px solid #2e2e2e", overflow:"hidden" }}>
      <div onClick={() => setOpen(o=>!o)} style={{ display:"flex", alignItems:"center", padding:"6px 8px", cursor:"pointer", background:"#2a2a2a", gap:6, userSelect:"none" }}>
        <Chevron open={open} />
        <span style={{ fontSize:11, color, marginRight:2 }}>{icon}</span>
        <span style={{ fontSize:11, fontWeight:700, color:"#ccc", flex:1, letterSpacing:.3 }}>{title}</span>
        {onRemove && (
          <div onClick={e=>{e.stopPropagation();onRemove();}}
            style={{ padding:"2px 4px", borderRadius:3, cursor:"pointer", color:"#e06c75", fontSize:16, lineHeight:1 }} title="Remove">✕</div>
        )}
      </div>
      {open && <div style={{ padding:"8px 10px" }}>{children}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TRANSFORM SECTION (reads from Three.js object directly)
// ═══════════════════════════════════════════════════════════════
function TransformSection({ object, onChanged }) {
  const pos = { x: object.position.x, y: object.position.y, z: object.position.z };
  const rot = {
    x: THREE.MathUtils.radToDeg(object.rotation.x),
    y: THREE.MathUtils.radToDeg(object.rotation.y),
    z: THREE.MathUtils.radToDeg(object.rotation.z),
  };
  const scl = { x: object.scale.x, y: object.scale.y, z: object.scale.z };
  return (
    <Section title="Transform" color="#61afef" icon="✥">
      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:11, color:"#999", marginBottom:3 }}>Position</div>
        <FieldVec3 value={pos} onChange={v=>{inspector.setPosition(v);onChanged();}} />
      </div>
      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:11, color:"#999", marginBottom:3 }}>Rotation</div>
        <FieldVec3 value={rot} onChange={v=>{inspector.setRotation(v);onChanged();}} step={1} />
      </div>
      <div>
        <div style={{ fontSize:11, color:"#999", marginBottom:3 }}>Scale</div>
        <FieldVec3 value={scl} onChange={v=>{inspector.setScale(v);onChanged();}} />
      </div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════
// MATERIAL SECTION
// ═══════════════════════════════════════════════════════════════
function MaterialSection({ object, onChanged }) {
  const mat = object.material;
  if (!mat) return null;
  const toHex = c => "#" + Math.round(c.r*255).toString(16).padStart(2,"0") + Math.round(c.g*255).toString(16).padStart(2,"0") + Math.round(c.b*255).toString(16).padStart(2,"0");
  return (
    <Section title="Material" color="#e5c07b" icon="◈">
      <div style={S.row}><span style={S.label}>Type</span><span style={{fontSize:11,color:"#e5c07b"}}>{mat.type}</span></div>
      <div style={S.row}>
        <span style={S.label}>Color</span>
        <FieldColor value={toHex(mat.color)} onChange={hex=>{mat.color.set(hex);inspector.setMaterialProp("color",hex);onChanged();}} />
      </div>
      {mat.roughness!==undefined && (
        <div style={S.row}><span style={S.label}>Roughness</span>
          <FieldNumber value={mat.roughness} min={0} max={1} step={0.01} onChange={v=>{inspector.setMaterialProp("roughness",v);onChanged();}} />
        </div>
      )}
      {mat.metalness!==undefined && (
        <div style={S.row}><span style={S.label}>Metalness</span>
          <FieldNumber value={mat.metalness} min={0} max={1} step={0.01} onChange={v=>{inspector.setMaterialProp("metalness",v);onChanged();}} />
        </div>
      )}
      {mat.emissive!==undefined && (
        <div style={S.row}>
          <span style={S.label}>Emissive</span>
          <FieldColor value={toHex(mat.emissive)} onChange={hex=>{mat.emissive.set(hex);inspector.setMaterialProp("emissive",hex);onChanged();}} />
        </div>
      )}
      <div style={S.row}><span style={S.label}>Wireframe</span>
        <FieldBoolean value={mat.wireframe} onChange={v=>{inspector.setMaterialProp("wireframe",v);onChanged();}} />
      </div>
      <div style={S.row}><span style={S.label}>Visible</span>
        <FieldBoolean value={object.visible} onChange={v=>{object.visible=v;onChanged();}} />
      </div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════
// GEOMETRY SECTION
// ═══════════════════════════════════════════════════════════════
function GeometrySection({ object }) {
  const geo = object.geometry;
  if (!geo) return null;
  return (
    <Section title="Geometry" color="#c678dd" icon="△">
      <div style={S.row}><span style={S.label}>Type</span><span style={{fontSize:11,color:"#c678dd"}}>{geo.type}</span></div>
      <div style={S.row}><span style={S.label}>UUID</span><span style={{fontSize:9,color:"#555",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis"}}>{geo.uuid}</span></div>
      {geo.parameters && Object.entries(geo.parameters).map(([k,v]) =>
        typeof v === "number" ? (
          <div key={k} style={S.row}>
            <span style={S.label}>{k}</span>
            <span style={{fontSize:11,color:"#ddd"}}>{parseFloat(v.toFixed(4))}</span>
          </div>
        ) : null
      )}
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════
// DYNAMIC COMPONENT SECTION (from userData.components)
// ═══════════════════════════════════════════════════════════════
function ComponentSection({ nameCode, component, onChanged }) {
  const def = ComponentRegistry.get(nameCode);
  if (!def) return (
    <Section title={component.key} color="#888" icon="??" onRemove={()=>{inspector.removeComponent(nameCode);onChanged();}}>
      <pre style={{fontSize:10,color:"#666",margin:0}}>{JSON.stringify(component.data,null,2)}</pre>
    </Section>
  );
  return (
    <Section title={def.label} color={def.color} icon={def.icon}
      onRemove={()=>{inspector.removeComponent(nameCode);onChanged();}}>
      {Object.entries(def.schema).map(([prop, fieldDef]) => (
        <SchemaField key={prop} prop={prop} def={fieldDef}
          value={component.data[prop]}
          onChange={v=>{inspector.setProperty(nameCode,prop,v);onChanged();}} />
      ))}
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADD COMPONENT BUTTON
// ═══════════════════════════════════════════════════════════════
function AddComponentBtn({ existing, onAdd }) {
  const [open, setOpen] = useState(false);
  const existingKeys = Object.keys(existing).map(Number);
  const available = ComponentRegistry.all().filter(c => !existingKeys.includes(c.nameCode));
  return (
    <div style={{ position:"relative", marginTop:8 }}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{ width:"100%", background:"#2a2a2a", border:"1px dashed #444", borderRadius:6, color:"#98c379", fontSize:12, padding:"7px 0", cursor:"pointer" }}>
        + Add Component
      </button>
      {open && (
        <div style={{ position:"absolute", bottom:"110%", left:0, right:0, background:"#2d2d2d", border:"1px solid #444", borderRadius:6, overflow:"hidden", zIndex:99 }}>
          {available.length === 0 && <div style={{ padding:"8px 12px", fontSize:12, color:"#555" }}>All components added</div>}
          {available.map(c => (
            <div key={c.nameCode} onClick={()=>{onAdd(c.nameCode);setOpen(false);}}
              style={{ padding:"7px 12px", fontSize:12, color:"#ddd", cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}
              onMouseEnter={e=>e.currentTarget.style.background="#3a3a3a"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{color:c.color}}>{c.icon}</span> {c.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EVENT LOG
// ═══════════════════════════════════════════════════════════════
function EventLog({ logs }) {
  const ref = useRef();
  useEffect(() => { if(ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
  return (
    <div style={{ borderTop:"1px solid #2a2a2a", background:"#161616" }}>
      <div style={{ padding:"5px 10px", fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:1, borderBottom:"1px solid #222" }}>
        Event Log
      </div>
      <div ref={ref} style={{ height:90, overflowY:"auto", padding:"4px 8px" }}>
        {logs.length === 0 && <div style={{fontSize:10,color:"#333",padding:"4px 0"}}>No events yet…</div>}
        {logs.map((l,i) => (
          <div key={i} style={{ fontSize:10, color: l.color||"#666", fontFamily:"monospace", marginBottom:2 }}>
            <span style={{color:"#444"}}>[{l.time}]</span> <span style={{color:l.color||"#888"}}>{l.event}</span>{" "}
            <span style={{color:"#555"}}>{l.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const objectsRef = useRef([]);
  const rafRef = useRef(null);
  const drag = useRef(false);
  const lastMouse = useRef({x:0,y:0});
  const sph = useRef({theta:0.8,phi:1.0,r:9});

  const [selectedObj, setSelectedObj] = useState(null);
  const [tick, setTick] = useState(0);
  const [logs, setLogs] = useState([]);

  const refresh = useCallback(() => setTick(t=>t+1), []);

  const addLog = useCallback((event, detail, color) => {
    const time = new Date().toLocaleTimeString("en",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit"});
    setLogs(l => [...l.slice(-60), { time, event, detail, color }]);
  }, []);

  // ── Three setup ───────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    const w = el.clientWidth, h = el.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#181818");
    sceneRef.current = scene;

    const cam = new THREE.PerspectiveCamera(50, w/h, 0.1, 1000);
    cameraRef.current = cam;

    const renderer = new THREE.WebGLRenderer({ antialias:true });
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    el.appendChild(renderer.domElement);

    scene.add(new THREE.GridHelper(20, 20, "#2a2a2a", "#222"));
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dLight.position.set(5,8,5); dLight.castShadow = true;
    scene.add(dLight);

    // Load the example object from the JSON structure
    const exampleJSON = {
      geometries: [{ uuid:"geo-1", type:"BoxGeometry", width:1, height:1, depth:1, widthSegments:1, heightSegments:1, depthSegments:1 }],
      materials: [{ uuid:"mat-1", type:"MeshStandardMaterial", color:0xaaaaaa, roughness:1, metalness:0 }],
      object: {
        uuid:"obj-1", type:"Mesh", name:"Psx",
        userData: {
          components: {
            5: { id:0, nameCode:5, key:"rigidbody", data:{ mass:1, useGravity:true, isKinematic:false, drag:0, angularDrag:0.05 } },
            6: { id:1, nameCode:6, key:"collider", data:{ shape:"box", size:{x:1,y:1,z:1,isVector3:true}, radius:0.5, height:2, isTrigger:false } },
          }
        },
        matrix:[1,0,0,0, 0,1,0,0, 0,0,1,0, -2,0.5,0,1],
      }
    };

    const makeObj = (name, geo, color, pos, components={}) => {
      const mat = new THREE.MeshStandardMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData.name = name;
      mesh.userData.id = Math.random().toString(36).slice(2);
      mesh.userData.components = components;
      scene.add(mesh);
      objectsRef.current.push(mesh);
      return mesh;
    };

    makeObj("Psx", new THREE.BoxGeometry(1,1,1), "#aaaaaa", [-2, 0.5, 0], {
      5: { id:0, nameCode:5, key:"rigidbody", data:{ mass:1, useGravity:true, isKinematic:false, drag:0, angularDrag:0.05 } },
      6: { id:1, nameCode:6, key:"collider", data:{ shape:"box", size:{x:1,y:1,z:1,isVector3:true}, radius:0.5, height:2, isTrigger:false } },
    });
    makeObj("Sphere", new THREE.SphereGeometry(0.8,32,32), "#e06c75", [0, 0.8, 0]);
    makeObj("Cylinder", new THREE.CylinderGeometry(0.5,0.5,1.6,32), "#98c379", [2, 0.8, 0]);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(20,20), new THREE.MeshStandardMaterial({color:"#1e1e1e",roughness:1}));
    ground.rotation.x = -Math.PI/2; ground.receiveShadow = true;
    scene.add(ground);

    updateCam();
    const animate = () => { rafRef.current = requestAnimationFrame(animate); renderer.render(scene, cam); };
    animate();

    const onResize = () => {
      const w2=el.clientWidth, h2=el.clientHeight;
      cam.aspect=w2/h2; cam.updateProjectionMatrix(); renderer.setSize(w2,h2);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if(el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // ── Inspector events ──────────────────────────────────────────
  useEffect(() => {
    const offs = [
      inspector.on("select", ({object}) => {
        setSelectedObj(object);
        addLog("select", object.userData.name, "#61afef");
        refresh();
      }),
      inspector.on("deselect", () => {
        setSelectedObj(null);
        addLog("deselect", "", "#888");
        refresh();
      }),
      inspector.on("change", ({nameCode,prop,value}) => {
        const v = typeof value === "object" ? JSON.stringify(value) : value;
        addLog("change", `${nameCode}.${prop} → ${v}`, "#e5c07b");
        refresh();
      }),
      inspector.on("component:add", ({nameCode,component}) => {
        addLog("component:add", `${component.key} (${nameCode})`, "#98c379");
        refresh();
      }),
      inspector.on("component:remove", ({nameCode,component}) => {
        addLog("component:remove", `${component.key} (${nameCode})`, "#e06c75");
        refresh();
      }),
    ];
    return () => offs.forEach(off => off());
  }, [addLog, refresh]);

  // ── Camera ────────────────────────────────────────────────────
  const updateCam = () => {
    const {theta,phi,r} = sph.current;
    const cam = cameraRef.current;
    cam.position.set(r*Math.sin(phi)*Math.sin(theta), r*Math.cos(phi), r*Math.sin(phi)*Math.cos(theta));
    cam.lookAt(0,0,0);
  };

  const onMouseDown = e => { drag.current=true; lastMouse.current={x:e.clientX,y:e.clientY}; };
  const onMouseUp = () => { drag.current=false; };
  const onMouseMove = e => {
    if(!drag.current) return;
    sph.current.theta -= (e.clientX-lastMouse.current.x)*0.005;
    sph.current.phi = Math.max(0.1,Math.min(Math.PI-0.1,sph.current.phi+(e.clientY-lastMouse.current.y)*0.005));
    lastMouse.current={x:e.clientX,y:e.clientY};
    updateCam();
  };
  const onWheel = e => { sph.current.r=Math.max(2,Math.min(30,sph.current.r+e.deltaY*0.01)); updateCam(); };

  const onViewportClick = e => {
    const rect = mountRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1, -((e.clientY-rect.top)/rect.height)*2+1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, cameraRef.current);
    const hits = ray.intersectObjects(objectsRef.current);
    if (hits.length) inspector.select(hits[0].object);
    else inspector.deselect();
  };

  // Highlight
  useEffect(() => {
    objectsRef.current.forEach(o => {
      if(o.material?.emissive) o.material.emissive.set(selectedObj?.uuid===o.uuid?"#1a1a2a":"#000");
    });
  }, [selectedObj]);

  const comps = selectedObj ? inspector.getComponents() : {};

  return (
    <div style={{ display:"flex", height:"100vh", background:"#1e1e1e", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      {/* Viewport */}
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
        <div ref={mountRef} style={{ width:"100%",height:"100%" }}
          onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseMove={onMouseMove}
          onWheel={onWheel} onClick={onViewportClick} />
        <div style={{ position:"absolute",top:10,left:10,background:"#00000077",borderRadius:5,padding:"3px 10px",fontSize:10,color:"#666" }}>
          Drag · Scroll · Click to select
        </div>
        {selectedObj && (
          <div style={{ position:"absolute",top:10,right:10,background:"#00000099",borderRadius:5,padding:"4px 10px",fontSize:12,color:"#61afef" }}>
            ● {selectedObj.userData.name}
          </div>
        )}
      </div>

      {/* Inspector Panel */}
      <div style={{ width:272, background:"#1e1e1e", borderLeft:"1px solid #2a2a2a", display:"flex", flexDirection:"column" }}>
        {/* Header */}
        <div style={{ padding:"8px 10px", borderBottom:"1px solid #2a2a2a", background:"#222" }}>
          <div style={{ fontSize:9, color:"#555", textTransform:"uppercase", letterSpacing:1.5, marginBottom:4 }}>Inspector</div>
          {selectedObj ? (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:9,height:9,borderRadius:2,background:"#61afef",flexShrink:0 }} />
              <input value={selectedObj.userData.name}
                onChange={e=>{selectedObj.userData.name=e.target.value;refresh();}}
                style={{ background:"transparent",border:"none",outline:"none",color:"#eee",fontSize:13,fontWeight:700,flex:1 }} />
              <span style={{fontSize:10,color:"#444"}}>{selectedObj.type}</span>
            </div>
          ) : (
            <div style={{ color:"#444",fontSize:12 }}>Nothing selected</div>
          )}
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1, overflowY:"auto", padding:"6px" }}>
          {selectedObj ? (
            <>
              <TransformSection object={selectedObj} onChanged={refresh} />
              <GeometrySection object={selectedObj} />
              <MaterialSection object={selectedObj} onChanged={refresh} />
              {Object.entries(comps).map(([nameCode, comp]) => (
                <ComponentSection key={nameCode} nameCode={parseInt(nameCode)} component={comp}
                  onChanged={refresh} />
              ))}
              <AddComponentBtn existing={comps}
                onAdd={nc=>{inspector.addComponent(nc);refresh();}} />
            </>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",color:"#333",fontSize:12,gap:8,paddingTop:60 }}>
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M9 9h6M9 12h6M9 15h4"/>
              </svg>
              Select an object
            </div>
          )}
        </div>

        {/* Event Log */}
        <EventLog logs={logs} />
      </div>
    </div>
  );
}