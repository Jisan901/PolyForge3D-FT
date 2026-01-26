import React, { useState, useEffect } from "react";
import { Editor } from "@/Editor/Editor";
import {BusHub} from "@/Editor/Api";



function validateSelection(uuid?: string) {
    const target = Editor.api.three.selectedObject;
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


export function useRawProperty(target, path) {
    // Resolve deep value
    if (!target || !path) return
    try {
    const keys = path.split(".");
    let ref = target;
    for (const k of keys) ref = ref[k];
    return ref;
    }
    catch {
        return null
    }
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
    const [sv, forceUpdate] = React.useState(0);

    React.useEffect(() => {
        return BusHub.sceneUpdate.subscribe(
            () => forceUpdate(v => v + 1)
        );
    }, []);
    return sv
}


export function useValidatedSelection(uuid: string) {
    const [selected, setSelected] = useState(() =>
        validateSelection(uuid)
    );

    useEffect(() => {
        if (!uuid) return;

        return BusHub.selectionUpdate.subscribe(() => {
            setSelected(validateSelection(uuid));
        });
    }, [uuid]);

    return selected;
}