// --- 1. Data Structure ---

export type Vector2 = { x: number; y: number };

export type HUDData = {
    deltaX: number;
    deltaY: number;
    middle: number;
};

export class InputData {
    keyDown = false;
    pointerDown = false;
    forward = false;
    backward = false;
    left = false;
    right = false;
    buttons: Record<string, ActionButton | VirtualKey> = {};
    phi = 0;
    theta = 0;
    hudData: HUDData = { deltaX: 0, deltaY: 0, middle: 0 };
    rotationPad?: RotationPad;
}

// --- 2. Main Class (The Drop-in) ---

export class LightGamePad {
    domElement: HTMLElement; // The full-screen overlay
    data: InputData;
    
    private movementPad?: MovementPad;
    private wasd?: WASD;
    private rotationPad!: RotationPad;
    private isTouch: boolean;

    constructor() {
        // 1. Create the container
        this.domElement = document.createElement('div');
        this.domElement.id = 'light-gamepad-overlay';
        
        // 2. Initialize Data
        this.data = new InputData();
        
        // 3. Inject CSS & Styles
        this.injectStyles();
        
        // 4. Check Device Type
        this.isTouch = window.matchMedia('(pointer: coarse)').matches;
        
        this.init();
    }

    private injectStyles(): void {
        // Ensure the container itself is full screen and transparent
        Object.assign(this.domElement.style, {
            position: 'absolute',
            top: '0px',
            left: '0px',
            width: '100%',
            height: '100dvh',
            overflow: 'hidden',
            zIndex: '9999', // Ensure it sits on top of canvas
            touchAction: 'none', // Prevents browser zooming/scrolling
            userSelect: 'none'
        });

        // Inject the Joystick CSS dynamically
        const styleId = 'light-gamepad-styles';
        if (!document.getElementById(styleId)) {
            const css = `
                .movement-pad {
                    position: absolute;
                    bottom: 30%; /* Adjusted for better ergonomics */
                    left: 10%;
                    z-index: 10001;
                }
                
                .movement-pad .region {
                    position: absolute;
                    width: 100px;
                    height: 100px;
                    background: radial-gradient(rgba(218, 225, 230, 0.25) 5%, rgba(218, 225, 230, 0.50) 95%);
                    /* url("/images/nav.png") center center no-repeat; -- Optional image */
                    border: 2px solid rgba(218, 225, 230, 0.25);
                    border-radius: 50%;
                    box-shadow: 0px 0px 5px rgba(194, 200, 204, 0.55);
                    user-select: none;
                    touch-action: none;
                }
                
                .movement-pad .handle {
                    opacity: 0.5;
                    position: absolute;
                    height: 30px;
                    width: 30px;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%); /* Center by default */
                    background: radial-gradient(rgba(215, 225, 255, 0.70) 0%, rgba(215, 225, 255, 0.50) 100%);
                    border-radius: 50%;
                    box-shadow: 0px 0px 7px rgba(195, 205, 245, 0.9);
                    pointer-events: none; /* Let clicks pass to region */
                }
            `;
            const style = document.createElement('style');
            style.id = styleId;
            style.appendChild(document.createTextNode(css));
            document.head.appendChild(style);
        }
    }

    private init(): void {
        this.setupRotationPad(); // Handles looking around (swiping empty space)

        if (this.isTouch) {
            this.setupTouchControls();
            this.addTouchButtons();
        } else {
            this.setupKeyboardControls();
            this.addKeyboardKeys();
        }
    }

    private setupTouchControls(): void {
        this.movementPad = new MovementPad(this.domElement);
        
        this.movementPad.onStateChange = (deltaX, deltaY, isDown) => {
            this.data.keyDown = isDown;
            if (isDown) {
                this.data.hudData = { deltaX, deltaY, middle: 0 };
                // Standard mapping: Y < 0 is Forward in many 3D coord systems (screen top is 0)
                // Adjust boolean logic to match your game's coordinate system
                this.data.forward = deltaY < -0.2; 
                this.data.backward = deltaY > 0.2;
                this.data.left = deltaX < -0.2;
                this.data.right = deltaX > 0.2;
            } else {
                this.data.hudData = { deltaX: 0, deltaY: 0, middle: 0 };
                this.data.forward = this.data.backward = this.data.left = this.data.right = false;
            }
        };
    }

    private setupKeyboardControls(): void {
        this.wasd = new WASD();
        this.wasd.onStateChange = (keys, deltaX, deltaY, isDown) => {
            this.data.keyDown = isDown;
            this.data.forward = keys.w;
            this.data.backward = keys.s;
            this.data.left = keys.a;
            this.data.right = keys.d;
            this.data.hudData = { deltaX, deltaY, middle: 0 };
        };
    }

    private setupRotationPad(): void {
        // The entire overlay acts as the rotation pad (swipe to look)
        this.rotationPad = new RotationPad(this.domElement);
        this.data.rotationPad = this.rotationPad;
        this.rotationPad.onStateChange = (phi, theta, isTouching) => {
            this.data.phi = phi;
            this.data.theta = theta;
            this.data.pointerDown = isTouching;
        };
    }

    private addTouchButtons(): void {
        // Add buttons directly to the overlay
        this.addButton(new ActionButton('action', { x: 40, y: 40 })); // Right-Bottom
        this.addButton(new ActionButton('jump', { x: 120, y: 80 }));  // Offset
    }

    private addKeyboardKeys(): void {
        this.addKey(new VirtualKey('action'), 'KeyE'); 
        this.addKey(new VirtualKey('jump'), 'Space');
    }

    // --- Public Helpers ---

    addButton(button: ActionButton): void {
        this.data.buttons[button.name] = button;
        this.domElement.appendChild(button.dom);
    }

    addKey(key: VirtualKey, code: string): void {
        this.data.buttons[key.name] = key;
        this.wasd?.registerCustomKey(code, key);
    }
}

// --- 3. Components (Joystick, WASD, Rotation) ---

/** Standard WASD Keyboard Handler */
class WASD {
    keys = { w: false, a: false, s: false, d: false };
    customKeys: Record<string, VirtualKey> = {};
    deltaX = 0; deltaY = 0;
    
    onStateChange: (keys: any, dx: number, dy: number, isDown: boolean) => void = () => {};

    constructor() {
        document.addEventListener('keydown', (e) => this.handleKey(e, true));
        document.addEventListener('keyup', (e) => this.handleKey(e, false));
    }

    registerCustomKey(code: string, handler: VirtualKey) {
        this.customKeys[code] = handler;
    }

    private handleKey(e: KeyboardEvent, isDown: boolean) {
        if (this.customKeys[e.code]) {
            isDown ? this.customKeys[e.code].down() : this.customKeys[e.code].up();
            return;
        }

        switch(e.code) {
            case 'KeyW': this.keys.w = isDown; this.deltaY = isDown ? -1 : 0; break; // -1 is usually forward (up)
            case 'KeyS': this.keys.s = isDown; this.deltaY = isDown ? 1 : 0; break;
            case 'KeyA': this.keys.a = isDown; this.deltaX = isDown ? -1 : 0; break;
            case 'KeyD': this.keys.d = isDown; this.deltaX = isDown ? 1 : 0; break;
        }
        
        const isMoving = this.keys.w || this.keys.s || this.keys.a || this.keys.d;
        this.onStateChange(this.keys, this.deltaX, this.deltaY, isMoving);
    }
}

/** Virtual Joystick Logic */
class MovementPad {
    container: HTMLElement;
    pad: HTMLDivElement;
    region: HTMLDivElement;
    handle: HTMLDivElement;
    
    centerX = 0; centerY = 0; maxRadius = 0;
    mouseDown = false;

    onStateChange: (dx: number, dy: number, active: boolean) => void = () => {};

    constructor(container: HTMLElement) {
        this.container = container;
        this.pad = document.createElement('div');
        this.pad.className = 'movement-pad';
        this.region = document.createElement('div');
        this.region.className = 'region';
        this.handle = document.createElement('div');
        this.handle.className = 'handle';

        this.region.appendChild(this.handle);
        this.pad.appendChild(this.region);
        this.container.appendChild(this.pad);

        // Calculate geometry after a brief delay to ensure DOM injection
        setTimeout(() => this.align(), 0);
        window.addEventListener('resize', () => this.align());

        this.bindEvents();
    }

    align() {
        const rect = this.region.getBoundingClientRect();
        this.maxRadius = rect.width / 2; // Approx 50px
        this.centerX = rect.left + this.maxRadius;
        this.centerY = rect.top + this.maxRadius;
    }

    bindEvents() {
        const region = this.region;
        const update = (pageX: number, pageY: number) => {
            let dx = pageX - this.centerX;
            let dy = pageY - this.centerY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Clamp
            if (dist > this.maxRadius) {
                const angle = Math.atan2(dy, dx);
                dx = Math.cos(angle) * this.maxRadius;
                dy = Math.sin(angle) * this.maxRadius;
            }

            // Move Handle
            this.handle.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            this.handle.style.opacity = '1.0';

            // Normalize -1 to 1
            this.onStateChange(dx/this.maxRadius, dy/this.maxRadius, true);
        };

        region.addEventListener('touchstart', (e) => {
            e.stopPropagation(); // Stop rotation pad from seeing this
            this.mouseDown = true;
            update(e.targetTouches[0].pageX, e.targetTouches[0].pageY);
        }, { passive: false });

        region.addEventListener('touchmove', (e) => {
            e.stopPropagation();
            if (this.mouseDown) update(e.targetTouches[0].pageX, e.targetTouches[0].pageY);
        }, { passive: false });

        const end = (e: Event) => {
            e.stopPropagation();
            this.mouseDown = false;
            this.handle.style.transform = `translate(-50%, -50%)`;
            this.handle.style.opacity = '0.5';
            this.onStateChange(0, 0, false);
        };

        region.addEventListener('touchend', end);
        region.addEventListener('touchcancel', end);
    }
}

/** Rotation / Look Logic */
class RotationPad {
    domElement: HTMLElement;
    phi = 0; theta = 0;
    lastX = 0; lastY = 0;
    isTouching = false;
    
    onStateChange: (phi: number, theta: number, active: boolean) => void = () => {};

    constructor(dom: HTMLElement) {
        this.domElement = dom;
        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        if(isTouch) this.bindTouch();
        else this.bindMouse();
    }

    bindTouch() {
        this.domElement.addEventListener('touchstart', (e) => {
            // Only rotate if touching empty space (not buttons/joystick)
            // Note: Buttons call stopPropagation(), so this only fires for background
            if (e.targetTouches.length === 1) {
                this.isTouching = true;
                this.lastX = e.targetTouches[0].pageX;
                this.lastY = e.targetTouches[0].pageY;
            }
        }, { passive: false });

        this.domElement.addEventListener('touchmove', (e) => {
            if (this.isTouching && e.targetTouches.length === 1) {
                const x = e.targetTouches[0].pageX;
                const y = e.targetTouches[0].pageY;
                const sensitivity = 0.005;
                
                this.phi -= (x - this.lastX) * sensitivity;
                this.theta -= (y - this.lastY) * sensitivity;
                
                this.lastX = x; 
                this.lastY = y;
                this.onStateChange(this.phi, this.theta, true);
            }
        }, { passive: false });

        this.domElement.addEventListener('touchend', () => {
            this.isTouching = false;
            this.onStateChange(this.phi, this.theta, false);
        });
    }

    bindMouse() {
        this.domElement.addEventListener('click', () => this.domElement.requestPointerLock());
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.domElement) {
                const sensitivity = 0.002;
                this.phi -= e.movementX * sensitivity;
                this.theta -= e.movementY * sensitivity;
                this.onStateChange(this.phi, this.theta, true);
            }
        });
    }
}

// --- 4. Buttons ---

export class VirtualKey {
    name: string;
    pressed = false;
    constructor(name: string) { this.name = name; }
    down() { this.pressed = true; }
    up() { this.pressed = false; }
}

export class ActionButton extends VirtualKey {
    dom: HTMLButtonElement;
    constructor(name: string, pos: { x: number; y: number }, size = 60) {
        super(name);
        this.dom = document.createElement('button');
        Object.assign(this.dom.style, {
            position: 'absolute',
            right: `${pos.x}px`,
            bottom: `${pos.y}px`,
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.1)',
            zIndex: '10002',
            touchAction: 'none'
        });
        
        const start = (e: Event) => { e.stopPropagation(); this.down(); this.dom.style.background = 'rgba(255,255,255,0.3)'; };
        const end = (e: Event) => { e.stopPropagation(); this.up(); this.dom.style.background = 'rgba(255,255,255,0.1)'; };
        
        this.dom.addEventListener('touchstart', start, {passive:false});
        this.dom.addEventListener('touchend', end);
        this.dom.addEventListener('mousedown', start); // For testing on desktop
        this.dom.addEventListener('mouseup', end);
    }
}