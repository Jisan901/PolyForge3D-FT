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

export function IRef(defaultValue) {
  return function (target: any, propertyKey: string) {
    const ctor = target.constructor;

    if (!ctor.propMap) ctor.propMap = {};

    ctor.propMap[propertyKey] = {
      name: propertyKey,
      type: "ref",
      default: {isRef: true, ref: defaultValue}
    };
  };
}

export function IVec(defaultValue) {
  return function (target: any, propertyKey: string) {
    const ctor = target.constructor;

    if (!ctor.propMap) ctor.propMap = {};

    ctor.propMap[propertyKey] = {
      name: propertyKey,
      type: "vec",
      default: {isVector3: true}
    };
  };
}