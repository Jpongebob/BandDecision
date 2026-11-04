// Coalesce bursts of Realtime rows into one refresh, without postponing it indefinitely.
export function createRefreshScheduler(refresh: () => void, delayMs = 200) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  return {
    schedule() {
      if (disposed || timer !== undefined) return;
      timer = setTimeout(() => {
        timer = undefined;
        if (!disposed) refresh();
      }, delayMs);
    },
    dispose() {
      disposed = true;
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    },
  };
}
