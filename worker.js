console.log('[Worker] loaded');

let stopped = false;

self.onmessage = (e) => {
  const { type, max, step = 100_000, postEveryMs = 16 } = e.data || {};
  console.log('[Worker] onmessage:', e.data);

  if (type === 'ping') {
    self.postMessage({ type: 'pong' });
    return;
  }

  if (type === 'stop') {
    stopped = true;
    console.log('[Worker] stop received');
    return;
  }

  if (type !== 'start') return;

  stopped = false;
  console.log(`[Worker] start: max=${max} step=${step} postEveryMs=${postEveryMs}`);

  let i = 0;
  let lastPost = 0;
  let lastConsole = 0;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  while (!stopped && i < max) {
    const end = Math.min(i + step, max);
    for (; i < end; i++) { }

    const t = now();
    if (t - lastPost >= postEveryMs) {
      self.postMessage({ type: 'tick', value: i });
      lastPost = t;
    }

    if (t - lastConsole >= 1000) {
      console.log('[Worker] tick ~', i);
      lastConsole = t;
    }
  }

  if (!stopped) {
    console.log('[Worker] done at', i);
    self.postMessage({ type: 'done', value: i });
  }
};
