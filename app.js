const termEl = document.getElementById('terminal');
const statusEl = document.getElementById('status');
const fpsEl = document.getElementById('fps');

const maxEl = document.getElementById('max');
const stepEl = document.getElementById('step');

const runWorkerBtn = document.getElementById('run-worker');
const stopWorkerBtn = document.getElementById('stop-worker');
const runMainBtn = document.getElementById('run-main');
const clearBtn = document.getElementById('clear');
const pingBtn = document.getElementById('ping');
const textInput = document.getElementById('text');

function termWrite(text, dim = false) {
  const line = document.createElement('div');
  line.className = 'line' + (dim ? ' dim' : '');
  line.textContent = text;
  termEl.appendChild(line);

  while (termEl.children.length > 50) termEl.removeChild(termEl.firstChild);

  termEl.scrollTop = termEl.scrollHeight;
}
function termClear() { termEl.textContent = ''; }

const nf = new Intl.NumberFormat('id-ID');
const digitsOnly = (s) => (s || '').replace(/\D/g, '');
const formatDigits = (s) => s ? nf.format(Number(s)) : '';

function formatInputKeepingCaret(input) {
  const raw = input.value;
  const sel = input.selectionStart ?? raw.length;
  const digitsLeft = raw.slice(0, sel).replace(/\D/g, '').length;

  const d = digitsOnly(raw);
  input.value = formatDigits(d);

  let pos = 0, seen = 0;
  while (pos < input.value.length && seen < digitsLeft) {
    if (/\d/.test(input.value[pos])) seen++;
    pos++;
  }
  input.setSelectionRange(pos, pos);
}

function attachNumericFormatter(el) {
  el.addEventListener('input', () => formatInputKeepingCaret(el));
  el.addEventListener('blur', () => { el.value = formatDigits(digitsOnly(el.value)); });
  el.value = formatDigits(digitsOnly(el.value));
}
function readNumber(el, fallback) {
  const d = digitsOnly(el.value);
  if (!d) return fallback;
  const n = Number(d);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
attachNumericFormatter(maxEl);
attachNumericFormatter(stepEl);

let frames = 0, lastFpsUpdate = performance.now();
function tickFps(ts) {
  frames++;
  if (ts - lastFpsUpdate >= 1000) {
    fpsEl.textContent = `FPS: ${frames}`;
    frames = 0; lastFpsUpdate = ts;
  }
  requestAnimationFrame(tickFps);
}
requestAnimationFrame(tickFps);

let worker = null;

function startWorker() {
  if (worker) worker.terminate();
  termWrite('[Main] creating worker…', true);
  worker = new Worker('./worker.js');

  worker.addEventListener('message', ({ data }) => {
    if (data.type === 'pong') {
      termWrite('[Main] Worker connected ✅', true);
      return;
    }
    if (data.type === 'tick') {
      termWrite(`[worker] i=${Number(data.value).toLocaleString('id-ID')}`);
      return;
    }
    if (data.type === 'done') {
      termWrite(`[worker] done at ${Number(data.value).toLocaleString('id-ID')}`);
      statusEl.textContent = 'Done (worker)';
    }
  });
  worker.addEventListener('error', (e) => {
    termWrite(`[Main] worker error: ${e.message}`, true);
    console.error(e);
  });

  const max = readNumber(maxEl, 1_000_000_000);
  const step = readNumber(stepEl, 100_000);

  statusEl.textContent = 'Running in worker…';
  termWrite(`[Main] start (worker): max=${nf.format(max)} step=${nf.format(step)}`, true);

  worker.postMessage({ type: 'ping' });
  worker.postMessage({ type: 'start', max, step, postEveryMs: 16 });
}

function stopWorker() {
  if (!worker) return;
  termWrite('[Main] stopping worker…', true);
  worker.postMessage({ type: 'stop' });
  worker.terminate();
  worker = null;
  statusEl.textContent = 'Worker stopped.';
}

function runOnMainThread() {
  const max = readNumber(maxEl, 1_000_000_000);
  const step = readNumber(stepEl, 100_000);
  statusEl.textContent = 'Blocking main thread… UI will freeze.';
  termWrite(`[Main] start (blocking): max=${nf.format(max)} step=${nf.format(step)}`, true);

  let i = 0;
  while (i < max) {
    const end = Math.min(i + step, max);
    for (; i < end; i++) {

    }
    termWrite(`[main] i=${i}`);
  }
  termWrite(`[main] done at ${nf.format(i)}`);
  statusEl.textContent = 'Finished blocking run.';
}

runWorkerBtn.addEventListener('click', startWorker);
stopWorkerBtn.addEventListener('click', stopWorker);
runMainBtn.addEventListener('click', runOnMainThread);
clearBtn.addEventListener('click', termClear);

pingBtn.addEventListener('click', () => termWrite('[Main] Ping!'));
textInput.addEventListener('input', (e) => {
  const ch = e.target.value.slice(-1) || '…';
  termWrite(`[Main] Typed: "${ch}"`, true);
});

const consoleEl = document.getElementById('console');

function consoleWrite(text) {
  const line = document.createElement('div');
  line.className = 'line';
  line.textContent = text;
  consoleEl.appendChild(line);

  while (consoleEl.children.length > 100) {
    consoleEl.removeChild(consoleEl.firstChild);
  }
  consoleEl.scrollTop = consoleEl.scrollHeight;
}
pingBtn.addEventListener('click', () => consoleWrite('[Main] Ping!'));

textInput.addEventListener('input', (e) => {
  consoleWrite(`[Input] value: "${e.target.value}"`);
});
textInput.addEventListener('keydown', (e) => consoleWrite(`[Key] ${e.key}`));


window.addEventListener('beforeunload', () => worker?.terminate());
