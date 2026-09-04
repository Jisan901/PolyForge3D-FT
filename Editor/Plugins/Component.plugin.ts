import { Plugin } from "@/Core/Plugins/Plugin";
import { globalInspector } from "@/Plugins/Inspector/lib/inspector";
import {
  ComponentRegistry,
  ComponentsSection,
  ScriptComponentUI,
  RigidbodyComponentUI,
  ColliderComponentUI,
  AudioComponentUI,
  AnimationComponentUI,
  UIElementComponentUI,
  LODComponentUI
} from "./ComponentUI";

export default class ComponentPlugin extends Plugin {
  name = "Component System";
  version = "1.0.0";
  description = "Provides Unity-like custom component system and UI for Three.js Object3D entities in PolyForge 3D";

  async init() {
    console.log("[ComponentPlugin] Initializing Component System UI...");

    // Register built-in component renderers
    ComponentRegistry.register("script", ScriptComponentUI);
    ComponentRegistry.register("7", ScriptComponentUI);

    ComponentRegistry.register("rigidbody", RigidbodyComponentUI);
    ComponentRegistry.register("5", RigidbodyComponentUI);

    ComponentRegistry.register("collider", ColliderComponentUI);
    ComponentRegistry.register("6", ColliderComponentUI);

    ComponentRegistry.register("audio", AudioComponentUI);
    ComponentRegistry.register("9", AudioComponentUI);

    ComponentRegistry.register("animation", AnimationComponentUI);
    ComponentRegistry.register("8", AnimationComponentUI);

    ComponentRegistry.register("uielement", UIElementComponentUI);
    ComponentRegistry.register("10", UIElementComponentUI);

    ComponentRegistry.register("lod", LODComponentUI);
    ComponentRegistry.register("11", LODComponentUI);

    // Bind custom resolver with globalInspector for all Object3D instances
    globalInspector.setCustomResolverUI(
      "Components",
      (obj) => !!(obj && obj.isObject3D),
      ComponentsSection,
      true, // noWrapper: allows ComponentsSection to control its own card layout and + Add Component button
      "bottom"
    );

    console.log("[ComponentPlugin] Component System UI registered with Inspector.");
  }
}
