/**
 * Represents a single Web Worker thread.
 */
export class Thread {

  public pid!: number;
  public free = true;

  public file: string;
  public worker: Worker | null = null;

  public data: any = null;
  private resultQueue: any[] = [];

  private root: ThreadPool | null;

  constructor(
    file: string,
    pool: ThreadPool | null = (globalThis as any).threadPool ?? null
  ) {
    this.file = file;
    this.root = pool;

    this.root?.add(this);
  }

  /**
   * Creates worker instance.
   * Internal use only.
   */
  __initWorker(): void {

    this.worker = new Worker(this.file, { type: "module" });

    this.worker.onmessage = e => this.onResult(e);

    this.worker.onerror = e => {
      console.error(`Worker error PID ${this.pid}`, e);
    };
  }

  /**
   * Boot worker.
   */
  start(): void {
    this.worker?.postMessage({
      type: "boot",
      data: this.data
    });
  }

  /**
   * Send frame update.
   */
  update(time: number): void {

    if (!this.free) return;

    this.worker?.postMessage({
      type: "update",
      time,
      data: this.data
    });

    this.free = false;
  }

  /**
   * Custom query.
   */
  query(payload: any): void {
    this.worker?.postMessage({
      type: "query",
      data: payload
    });
  }

  /**
   * Read and clear result queue.
   */
  consumeResults(): any[] {
    const results = this.resultQueue;
    this.resultQueue = [];
    return results;
  }

  /**
   * Kill worker.
   */
  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  private onResult(e: MessageEvent): void {

    const result = e.data;
    if (!result) return;

    if (result.type === "debugInternal") {
      console.log(`[Thread ${this.pid}]`, result.log);
      return;
    }

    this.resultQueue.push(result);
    this.free = true;
  }
}
