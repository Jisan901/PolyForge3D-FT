function defaultTransform() {
  return {
    position: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    scale:    [1, 1, 1] as [number, number, number]
  };
}

function comp(type: string, data: any): AuthoringComponent {
  return {
    type,
    data: structuredClone(data)
  };
}


import { AuthoringNode } from "./Node";
import { AuthoringComponent } from "./Node";
import { ObjectType } from "../../types";

export class AuthoringNodeBuilder {
  create(type: ObjectType): AuthoringNode {
    switch (type) {
      case ObjectType.CUBE:     return this.cube();
      case ObjectType.SPHERE:   return this.sphere();
      case ObjectType.CYLINDER: return this.cylinder();
      case ObjectType.PLANE:    return this.plane();
      case ObjectType.CAPSULE:  return this.capsule();
      case ObjectType.LIGHT:    return this.light();
      case ObjectType.CAMERA:   return this.camera();
      case ObjectType.FOLDER:   return this.folder();
      case ObjectType.LOD:      return this.lod();
      default:
        throw new Error(`AuthoringNodeBuilder: unknown type ${type}`);
    }
  }

  /* ---------------- Basic primitives ---------------- */

  cube(): AuthoringNode {
    return this.meshNode("Cube", "CUBE");
  }

  sphere(): AuthoringNode {
    return this.meshNode("Sphere", "SPHERE");
  }

  cylinder(): AuthoringNode {
    return this.meshNode("Cylinder", "CYLINDER");
  }

  plane(): AuthoringNode {
    return this.meshNode("Plane", "PLANE", {
      rotation: [-Math.PI / 2, 0, 0]
    });
  }

  capsule(): AuthoringNode {
    return this.meshNode("Capsule", "CAPSULE");
  }

  /* ---------------- Non-mesh ---------------- */

  light(): AuthoringNode {
    return new AuthoringNode({
      name: "Point Light",
      type: "LIGHT",
      transform: defaultTransform(),
      components: [
        comp("Light", {
          lightType: "Point",
          color: "#ffffff",
          intensity: 2,
          range: 200
        })
      ]
    });
  }

  camera(): AuthoringNode {
    return new AuthoringNode({
      name: "Camera",
      type: "CAMERA",
      transform: {
        position: [0, 1, 3],
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
      },
      components: [
        comp("Camera", {
          fov: 60,
          near: 0.1,
          far: 1000
        })
      ]
    });
  }

  folder(): AuthoringNode {
    return new AuthoringNode({
      name: "Folder",
      type: "FOLDER",
      transform: defaultTransform(),
      components: []
    });
  }

  lod(): AuthoringNode {
    return new AuthoringNode({
      name: "LOD Group",
      type: "LOD",
      transform: defaultTransform(),
      components: [
        comp("LODGroup", {
          levels: []
        })
      ]
    });
  }

  /* ---------------- Helpers ---------------- */

  private meshNode(
    name: string,
    type: string,
    transformOverrides?: Partial<AuthoringNode["transform"]>
  ): AuthoringNode {
    return new AuthoringNode({
      name,
      type,
      transform: {
        ...defaultTransform(),
        ...transformOverrides
      },
      components: [
        comp("Mesh", {
          primitive: type
        }),
        comp("Material", {
          color: "#aaaaaa"
        })
      ]
    });
  }
}