/**
 * Global time manager for frame-based applications.
 * Handles scaled and unscaled time tracking.
 */
export class Time {

  /** Time scale multiplier (1 = normal speed) */
  timeScale: number = 1;

  /** Real delta time between frames (seconds) */
  rawDeltaTime: number = 0;

  /** Scaled delta time (rawDeltaTime * timeScale) */
  deltaTime: number = 0;

  /** Total scaled time since start (seconds) */
  totalTime: number = 0;

  /** Total real time since start (seconds) */
  unscaledTime: number = 0;

  /** Frame counter since start */
  frame: number = 0;

  /**
   * Updates time values for the current frame.
   * Should be called once per frame.
   * 
   * @param rawDelta - Delta time from requestAnimationFrame or performance.now() (seconds)
   */
  update(rawDelta: number): void {

    this.rawDeltaTime = rawDelta;
    this.deltaTime = rawDelta * this.timeScale;

    this.totalTime += this.deltaTime;
    this.unscaledTime += rawDelta;

    this.frame++;
  }
}
