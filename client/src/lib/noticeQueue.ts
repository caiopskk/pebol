export interface QueuedNotice<T> {
  set: (notice: T | null) => void;
  durationMs: number;
}

export function createNoticeQueue<T>({ set, durationMs }: QueuedNotice<T>) {
  const queue: T[] = [];
  let active = false;
  let timer: number | undefined;

  const showNext = () => {
    if (active) return;
    const notice = queue.shift();
    if (!notice) return;
    active = true;
    set(notice);
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      set(null);
      active = false;
      showNext();
    }, durationMs);
  };

  return {
    push(notice: T) {
      queue.push(notice);
      showNext();
    },
  };
}
