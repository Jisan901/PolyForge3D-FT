import * as THREE from 'three';
import { SceneObject } from '../../types';

// UI Track representation for rendering
export interface UITrack {
    id: string;
    propertyPath: string;
    trackType: 'number' | 'vector' | 'quaternion';
    keyframes: Array<{ id: string; time: number }>;
    threeTrack: THREE.KeyframeTrack;
}

export class AnimationUtils {
    private mixer: THREE.AnimationMixer | null = null;
    private action: THREE.AnimationAction | null = null;
    private clock: THREE.Clock = new THREE.Clock();

    /**
     * Initialize the animation mixer for a given object
     */
    initializeMixer(object: SceneObject): THREE.AnimationMixer {
        this.stopAllActions();
        this.mixer = new THREE.AnimationMixer(object);
        this.clock = new THREE.Clock();
        return this.mixer;
    }

    /**
     * Setup an animation action for a clip
     */

    // Optimized setupAction (Optional)
    setupAction(clip: THREE.AnimationClip, time: number = 0): THREE.AnimationAction | null {
        if (!this.mixer) return null;

        // Stop previous action
        if (this.action) {
            this.action.stop();
        }

        // Instead of cloning, we can ensure the mixer forgets the old version
        const existingAction = this.mixer.existingAction(clip);
        if (existingAction) {
            this.mixer.uncacheClip(clip);
        }

        // Create new action from the source clip directly
        const action = this.mixer.clipAction(clip);
        action.clampWhenFinished = true;
        action.loop = THREE.LoopOnce;
        action.time = time;
        action.play();
        action.paused = true;

        this.action = action;
        this.mixer.update(0);

        return action;
    }

    setupAction_(clip: THREE.AnimationClip, time: number = 0): THREE.AnimationAction | null {
        if (!this.mixer) return null;

        // Stop previous action
        if (this.action) {
            this.action.stop();
        }

        // Create fresh clip to ensure Three.js picks up changes
        const freshClip = clip.clone();

        const action = this.mixer.clipAction(freshClip);
        action.clampWhenFinished = true;
        action.loop = THREE.LoopOnce;
        action.time = time;
        action.play();
        action.paused = true;

        this.action = action;

        // Apply initial state
        this.mixer.update(0);

        return action;
    }

    /**
     * Update animation time (for scrubbing)
     */
    setTime(time: number, isPlaying: boolean = false): void {
        if (!this.mixer || !this.action) return;

        this.action.time = time;
        this.action.paused = !isPlaying;
        this.mixer.update(0); // Force update without advancing time
    }

    /**
     * Update animation with delta time (for playback)
     */
    update(delta: number): void {
        if (!this.mixer) return;
        this.mixer.update(delta);
    }

    /**
     * Get delta time from clock
     */
    getDelta(): number {
        return this.clock.getDelta();
    }

    /**
     * Start the clock
     */
    startClock(): void {
        this.clock.start();
    }

    /**
     * Stop the clock
     */
    stopClock(): void {
        this.clock.stop();
    }

    /**
     * Stop all actions and clean up
     */
    stopAllActions(): void {
        if (this.mixer) {
            this.mixer.stopAllAction();
        }
        this.action = null;
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.stopAllActions();
        this.mixer = null;
    }

    /**
     * Convert Three.js tracks to UI tracks for rendering
     */
    static convertToUITracks(clip: THREE.AnimationClip | null): UITrack[] {
        if (!clip) return [];

        const tracks: UITrack[] = [];

        clip.tracks.forEach((track) => {
            const times = Array.from(track.times);

            // Number track - single value per keyframe
            if (track instanceof THREE.NumberKeyframeTrack) {
                tracks.push({
                    id: track.name,
                    propertyPath: track.name,
                    trackType: 'number',
                    keyframes: times.map((t) => ({
                        id: `${track.name}-${t}`,
                        time: t
                    })),
                    threeTrack: track
                });
            }

            // Vector track - keep as single track
            else if (track instanceof THREE.VectorKeyframeTrack) {
                tracks.push({
                    id: track.name,
                    propertyPath: track.name,
                    trackType: 'vector',
                    keyframes: times.map((t) => ({
                        id: `${track.name}-${t}`,
                        time: t
                    })),
                    threeTrack: track
                });
            }

            // Quaternion track - keep as single track
            else if (track instanceof THREE.QuaternionKeyframeTrack) {
                tracks.push({
                    id: track.name,
                    propertyPath: track.name,
                    trackType: 'quaternion',
                    keyframes: times.map((t) => ({
                        id: `${track.name}-${t}`,
                        time: t
                    })),
                    threeTrack: track
                });
            }
        });

        return tracks;
    }

    /**
     * Create a new animation clip for an object
     */
    static createClip(object: SceneObject): THREE.AnimationClip {
        const clipCount = object.animations?.length || 0;
        const clipName = clipCount === 0
            ? `${object.name}_Anim`
            : `${object.name}_Anim_${clipCount + 1}`;

        return new THREE.AnimationClip(clipName, -1, []);
    }

    /**
     * Get current value from object using property path
     */
    static getCurrentValue(object: SceneObject, propertyPath: string): any {
        const pathParts = propertyPath.split('.');
        let currentValue: any = object;

        for (let i = 1; i < pathParts.length; i++) {
            currentValue = currentValue?.[pathParts[i]];
        }

        return currentValue;
    }

    /**
     * Create a new track with initial keyframe
     */
    static createTrack(
        object: SceneObject,
        propertyPath: string,
        trackType: 'number' | 'vector' | 'quaternion' = 'number'
    ): THREE.KeyframeTrack {
        const currentValue = AnimationUtils.getCurrentValue(object, propertyPath);

        // Create appropriate track type with current value as initial keyframe
        if (trackType === 'vector') {
            const vec = currentValue?.isVector3 ? currentValue : new THREE.Vector3(0, 0, 0);
            return new THREE.VectorKeyframeTrack(propertyPath, [0], [vec.x, vec.y, vec.z]);
        } else if (trackType === 'quaternion') {
            const quat = currentValue?.isQuaternion ? currentValue : new THREE.Quaternion(0, 0, 0, 1);
            return new THREE.QuaternionKeyframeTrack(propertyPath, [0], [quat.x, quat.y, quat.z, quat.w]);
        } else {
            const val = typeof currentValue === 'number' ? currentValue : 0;
            return new THREE.NumberKeyframeTrack(propertyPath, [0], [val]);
        }
    }

    /**
     * Add a keyframe to a track at specified time
     */
    static addKeyframe(
        track: THREE.KeyframeTrack,
        object: SceneObject,
        time: number
    ): boolean {
        const snappedTime = Math.round(time * 10) / 10;

        // Check if keyframe already exists at this time
        const existingIndex = track.times.findIndex(t => Math.abs(t - snappedTime) < 0.05);
        if (existingIndex !== -1) return false;

        const times = Array.from(track.times);
        const values = Array.from(track.values);

        // Calculate value stride based on track type
        const valueSize = track instanceof THREE.NumberKeyframeTrack ? 1
            : track instanceof THREE.VectorKeyframeTrack ? 3
                : 4; // quaternion

        // Find insertion index
        const insertIndex = times.findIndex(t => t > snappedTime);
        const insertAt = insertIndex === -1 ? times.length : insertIndex;

        // Insert time
        times.splice(insertAt, 0, snappedTime);

        // Get current value from the object
        const currentValue = AnimationUtils.getCurrentValue(object, track.name);

        // Insert current values from object
        let valuesToInsert: number[];
        if (valueSize === 1) {
            valuesToInsert = [typeof currentValue === 'number' ? currentValue : 0];
        } else if (valueSize === 3) {
            const vec = currentValue?.isVector3 ? currentValue : new THREE.Vector3(0, 0, 0);
            valuesToInsert = [vec.x, vec.y, vec.z];
        } else {
            const quat = currentValue?.isQuaternion ? currentValue : new THREE.Quaternion(0, 0, 0, 1);
            valuesToInsert = [quat.x, quat.y, quat.z, quat.w];
        }

        values.splice(insertAt * valueSize, 0, ...valuesToInsert);

        // Update track
        track.times = new Float32Array(times);
        track.values = new Float32Array(values);

        return true;
    }

    /**
     * Delete a keyframe from a track
     */
    static deleteKeyframe(track: THREE.KeyframeTrack, keyframeTime: number): boolean {
        const times = Array.from(track.times);
        const values = Array.from(track.values);

        const keyframeIndex = times.findIndex(t => Math.abs(t - keyframeTime) < 0.05);
        if (keyframeIndex === -1) return false;

        // If this is the last keyframe, caller should delete the entire track
        if (times.length === 1) return false;

        const valueSize = track instanceof THREE.NumberKeyframeTrack ? 1
            : track instanceof THREE.VectorKeyframeTrack ? 3
                : 4;

        // Remove time
        times.splice(keyframeIndex, 1);

        // Remove values
        values.splice(keyframeIndex * valueSize, valueSize);

        // Update track
        track.times = new Float32Array(times);
        track.values = new Float32Array(values);

        return true;
    }

    /**
     * Get icon for track type
     */
    static getTrackIcon(trackType: string): string {
        switch (trackType) {
            case 'vector':
                return '📐';
            case 'quaternion':
                return '🔄';
            default:
                return '📊';
        }
    }
}