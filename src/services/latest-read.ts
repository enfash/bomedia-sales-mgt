/** Cancellation plus a generation check: some transports finish even after abort. */
export function createLatestRead() {
  let generation = 0;
  let controller: AbortController | undefined;
  const cancel = () => { generation++; controller?.abort(); };
  return {
    cancel,
    async run<T>(read: (signal: AbortSignal) => Promise<T>, accept: (value: T) => void, reject: (error: unknown) => void) {
      cancel();
      const current = generation;
      const requestController = new AbortController();
      controller = requestController;
      const timeout = setTimeout(() => requestController.abort(), 20_000);
      try {
        const value = await read(requestController.signal);
        if (current === generation) accept(value);
      } catch (error) {
        if (current === generation) reject(error);
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
