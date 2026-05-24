import fs from '@/Core/lib/fs';
// ─── Types ────────────────────────────────────────────────────────────────────

type Primitive = string | number | boolean;
type ConfigRecord = Record<string, Primitive>;

interface ConfigSOptions {
  path: string;
  autoSave?: boolean;
  onUpdate?: (config: Readonly<ConfigRecord>) => void;
  onLoad?:   (config: Readonly<ConfigRecord>) => void;
  onSave?:   (config: Readonly<ConfigRecord>) => void;
}

// ─── ConfigS ─────────────────────────────────────────────────────────────────

export class ConfigS {
  readonly path:     string;
  readonly autoSave: boolean;

  private config:             ConfigRecord = {};
  private readonly onUpdate?: (config: Readonly<ConfigRecord>) => void;
  private readonly onLoad?:   (config: Readonly<ConfigRecord>) => void;
  private readonly onSave?:   (config: Readonly<ConfigRecord>) => void;

  constructor(opts: ConfigSOptions) {
    this.path     = opts.path;
    this.autoSave = opts.autoSave ?? false;
    this.onUpdate = opts.onUpdate;
    this.onLoad   = opts.onLoad;
    this.onSave   = opts.onSave;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private static isPrimitive(v: unknown): v is Primitive {
    return typeof v === "string" || typeof v === "number" || typeof v === "boolean";
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /** Read config from disk. Missing file → empty config, no error. */
  async load(): Promise<this> {
    let raw: string;
    try {
      raw = await fs.readFile(this.path, "utf8");
    } catch {
      this.config = {};
      this.onLoad?.(this.snapshot());
      return this;
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;

    for (const [k, v] of Object.entries(parsed)) {
      if (!ConfigS.isPrimitive(v))
        throw new Error(`[ConfigS] "${k}" is not a primitive (got ${typeof v})`);
    }

    this.config = parsed as ConfigRecord;
    this.onLoad?.(this.snapshot());
    return this;
  }

  /** Write config to disk as formatted JSON. */
  async save(): Promise<this> {
    await fs.writeFile(this.path, JSON.stringify(this.config, null, 2), "utf8");
    this.onSave?.(this.snapshot());
    return this;
  }

  // ── Read / Write ───────────────────────────────────────────────────────────

  async set(key: string, value: Primitive): Promise<this> {
    if (!ConfigS.isPrimitive(value))
      throw new TypeError(`[ConfigS] "${key}" must be string | number | boolean`);

    this.config[key] = value;
    this.onUpdate?.(this.snapshot());
    if (this.autoSave) await this.save();
    return this;
  }

  get(key: string): Primitive | undefined {
    return this.config[key];
  }

  has(key: string): boolean {
    return key in this.config;
  }

  async delete(key: string): Promise<this> {
    if (key in this.config) {
      delete this.config[key];
      this.onUpdate?.(this.snapshot());
      if (this.autoSave) await this.save();
    }
    return this;
  }

  async clear(): Promise<this> {
    this.config = {};
    this.onUpdate?.(this.snapshot());
    if (this.autoSave) await this.save();
    return this;
  }

  // ── Introspection ──────────────────────────────────────────────────────────

  keys():    string[]              { return Object.keys(this.config);    }
  entries(): [string, Primitive][] { return Object.entries(this.config); }
  get size(): number               { return Object.keys(this.config).length; }

  snapshot(): Readonly<ConfigRecord> {
    return Object.freeze({ ...this.config });
  }

  [Symbol.iterator](): Iterator<[string, Primitive]> {
    return this.entries()[Symbol.iterator]();
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export async function createConfig(opts: ConfigSOptions): Promise<ConfigS> {
  return new ConfigS(opts).load();
}