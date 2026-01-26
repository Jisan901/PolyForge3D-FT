import {BusHub} from "@/Editor/Api";


export type Path = string;

export function mutate<T extends object>(
    obj: T,
    path: Path,
    value: unknown
): void {
    const keys = path.split(".");
    let ref: any = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        ref = ref[keys[i]];
        if (ref == null) return;
    }

    ref[keys[keys.length - 1]] = value;
    BusHub.mutationBus.emit({ target: obj, path });
}
export function mutationCall<T extends object>(
    obj: T,
    path: Path
): void {
    BusHub.mutationBus.emit({ target: obj, path });
}
export function toast(message: string) {
    BusHub.messageBus.emit(message)
}
