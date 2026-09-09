import { Component } from '../Component';

export interface ScriptComponentData {
    path: { isFile?: boolean; value: string | null };
    enabled?: boolean;
    variables?: Record<string, any>;
    [key: string]: any;
}

export class ScriptComponent extends Component<ScriptComponentData> {
    public static override readonly componentName = 'Script';
    public static override readonly allowMultiple = true;

    public path: { isFile: boolean; value: string | null } = { isFile: true, value: null };
    public variables: Record<string, any> = {};

    public override serialize(): ScriptComponentData {
        return {
            path: { ...this.path },
            enabled: this.enabled,
            variables: structuredClone(this.variables)
        };
    }

    public override deserialize(data: Partial<ScriptComponentData>): void {
        if (data.path) {
            this.path = { isFile: true, value: data.path.value ?? null };
        }
        if (data.enabled !== undefined) {
            this.enabled = data.enabled;
        }
        if (data.variables) {
            this.variables = structuredClone(data.variables);
        }
        this.onValidate?.();
    }
}
