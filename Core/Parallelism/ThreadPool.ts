/**
 * Manages a pool of Web Worker threads.
 */
export class ThreadPool {

  private maxThreads: number;
  private availableThreads: number;
  private pidCounter = 1000;

  private pool: Map<number, Thread> = new Map();

  constructor(maxThreads: number) {
    this.maxThreads = maxThreads;
    this.availableThreads = maxThreads;
    
    
    (globalThis as any).threadPool = this;
  }

  /**
   * Adds a thread to the pool.
   */
  add(thread: Thread): boolean {

    if (this.availableThreads <= 0) return false;

    const pid = this.pidCounter++;
    thread.pid = pid;

    this.pool.set(pid, thread);

    thread.__initWorker();
    this.availableThreads--;

    return true;
  }

  /**
   * Starts all threads.
   */
  start(): void {
    this.pool.forEach(t => t.start());
  }

  /**
   * Broadcast update to all threads.
   */
  update(time: number): void {
    this.pool.forEach(t => t.update(time));
  }

  /**
   * Removes and terminates a thread.
   */
  remove(pid: number): void {

    const thread = this.pool.get(pid);
    if (!thread) return;

    thread.terminate();
    this.pool.delete(pid);

    this.availableThreads++;
  }
}
