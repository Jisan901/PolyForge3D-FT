type JobResolver = {
  resolve: (v: any) => void;
  reject: (e: any) => void;
};

/**
 * Promise based hot worker thread
 */
export class HotThread {

  private worker: Worker;
  private jobId = 0;

  private pendingJobs = new Map<number, JobResolver>();

  constructor(workerFile: string) {

    this.worker = new Worker(workerFile, {
      type: "module"
    });

    this.worker.onmessage = e => this.onMessage(e);
    this.worker.onerror = e => this.onError(e);
  }

  /**
   * Run job inside worker and await result.
   */
  run<T = any>(payload: any): Promise<T> {

    const id = this.jobId++;

    return new Promise<T>((resolve, reject) => {

      this.pendingJobs.set(id, { resolve, reject });

      this.worker.postMessage({
        type: "job",
        id,
        payload
      });

    });
  }

  /**
   * Kill worker
   */
  terminate(): void {
    this.worker.terminate();
    this.pendingJobs.clear();
  }

  private onMessage(e: MessageEvent) {

    const msg = e.data;

    if (!msg || msg.id === undefined) return;

    const job = this.pendingJobs.get(msg.id);
    if (!job) return;

    this.pendingJobs.delete(msg.id);

    if (msg.error) {
      job.reject(msg.error);
    } else {
      job.resolve(msg.result);
    }
  }

  private onError(e: ErrorEvent) {

    console.error("HotThread Worker Error", e);

    this.pendingJobs.forEach(job => {
      job.reject(e.message);
    });

    this.pendingJobs.clear();
  }
}



/* worker example

self.onmessage = async (e) => {

  const msg = e.data;

  if (msg.type !== "job") return;

  const { id, payload } = msg;

  try {

    // YOUR HEAVY WORK HERE
    const result = await handleJob(payload);

    postMessage({
      id,
      result
    });

  } catch (err) {

    postMessage({
      id,
      error: err?.toString()
    });

  }
};

async function handleJob(data) {

  // Example: heavy calculation
  let sum = 0;

  for (let i = 0; i < 1e7; i++) {
    sum += i;
  }

  return {
    input: data,
    sum
  };
}

*/