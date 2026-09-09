import { Behavior } from "@/Core/Behavior";
import { Instance } from "@/Core/PolyForge";
import { getRef, getScript } from "@/Core/Functions"
import { THREE } from '@/Core/lib/THREE';
import { INumber, IRef } from '@/Editor/ITypes';
import PlayerController from "./playerController";

const input = (window as any).gamePad.data;

export default class Loader extends Behavior {
    @IRef()
    private playerEntity: THREE.Object3D;
    playerController: PlayerController;
    onStart() {

        this.playerEntity = getRef(this.playerEntity);
        this.playerController = getScript<PlayerController>(this.playerEntity.uuid);




    }
    onUpdate(dt: number) { }
}