export function INumber(defaultValue = 0) {
  return function (target: any, propertyKey: string) {
    const ctor = target.constructor;

    if (!ctor.propMap) ctor.propMap = {};

    ctor.propMap[propertyKey] = {
      name: propertyKey,
      type: "value",
      default: defaultValue
    };
  };
}

export function IRef(defaultValue?: any) {
  return function (target: any, propertyKey: string) {
    const ctor = target.constructor;

    if (!ctor.propMap) ctor.propMap = {};

    ctor.propMap[propertyKey] = {
      name: propertyKey,
      type: "ref",
      default: { isRef: true, ref: defaultValue }
    };
  };
}

export function IVec(defaultValue?: any) {
  return function (target: any, propertyKey: string) {
    const ctor = target.constructor;

    if (!ctor.propMap) ctor.propMap = {};

    let def = { isVector3: true, x: 0, y: 0, z: 0 };
    if (defaultValue && typeof defaultValue === 'object') {
      def = {
        isVector3: true,
        x: Number(defaultValue.x ?? 0),
        y: Number(defaultValue.y ?? 0),
        z: Number(defaultValue.z ?? 0)
      };
    }

    ctor.propMap[propertyKey] = {
      name: propertyKey,
      type: "vec",
      default: def
    };
  };
}