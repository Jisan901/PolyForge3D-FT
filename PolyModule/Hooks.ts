import React, { useState, useEffect } from "react";
import { BusHub, PolyForge } from "../PolyForge";



function validateSelection(uuid?: string) {
    const target = PolyForge.api.three.selectedObject;
    return !!(uuid && target && target.uuid === uuid);
}


export function useObserver(target, path) {

    const [, rerender] = useState(0);

    useEffect(() =>
        BusHub.mutationBus.subscribe(({ target: t, path: changedPath }) => {
            if (changedPath === path && target === t) rerender((v) => v + 1);
        })
        , [path]);

    // Resolve deep value
    if (!target || !path) return

    const keys = path.split(".");
    let ref = target;
    for (const k of keys) ref = ref[k];
    return ref;
}


export function useTargetObserver(target) {

    const [, rerender] = useState(0);

    useEffect(() =>
        BusHub.mutationBus.subscribe(({ target: t }) => {
            if (target === t) rerender((v) => v + 1);
        })
        , []);

    
    if (!target) return

    let ref = target;

    return ref;
}

export function useSceneObserver() {
    const [, forceUpdate] = React.useState(0);

    React.useEffect(() => {
        return PolyForge.editor.api.buses.sceneUpdate.subscribe(
            () => forceUpdate(v => v + 1)
        );
    }, []);
}


export function useValidatedSelection(uuid: string) {
    const [selected, setSelected] = useState(() =>
        validateSelection(uuid)
    );

    useEffect(() => {
        if (!uuid) return;

        return PolyForge.editor.api.buses.selectionUpdate.subscribe(() => {
            setSelected(validateSelection(uuid));
        });
    }, [uuid]);

    return selected;
}