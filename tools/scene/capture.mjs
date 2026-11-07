import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:4321';
const out = process.argv[3] ?? 'src/assets/hero/scene.png';
const chromePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9500 + Math.floor(Math.random() * 100);
const profile = mkdtempSync(join(tmpdir(), 'scene-'));
const chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${port}`, '--hide-scrollbars', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws;
for (let i = 0; i < 50 && !ws; i++) {
  try {
    const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
    if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
  } catch {}
  await sleep(200);
}
if (ws.readyState !== WebSocket.OPEN) await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) {
    pending.get(d.id)(d);
    pending.delete(d.id);
  }
});
const send = (method, params = {}) =>
  Promise.race([
    new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); }),
    sleep(30000).then(() => { throw new Error(`timeout: ${method}`); }),
  ]);
const log = (...a) => console.error(new Date().toISOString().slice(11, 19), ...a);
const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.result?.value;

log("await send('Page.enable');");
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
log("await send('Page.navigate', { url: `${ba");
await send('Page.navigate', { url: `${base}/` });
await sleep(3000);
await ev(`localStorage.setItem('os-sound', 'off'); document.querySelector('[data-boot-mute]')?.click()`);
log('await sleep(5000);');
await sleep(5000);
await ev(`(() => {
  const s = document.createElement('style');
  s.textContent = 'html, body, .hero { background: transparent !important; } body * { visibility: hidden !important; } .hero__scene, .hero__scene canvas { visibility: visible !important; }';
  document.head.appendChild(s);
})()`);
log("await send('Emulation.setDefaultBackgrou");
await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
await sleep(300);
const clip = JSON.parse(await ev(`(() => { const r = document.querySelector('[data-scene-area]').getBoundingClientRect(); const px = r.width * 0.12, py = r.height * 0.3; return JSON.stringify({ x: r.left - px, y: r.top - py, width: r.width + px * 2, height: r.height + py * 2 }); })()`));
const shot = await send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } });
writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
console.log(`saved ${out}`, clip);
ws.close();
chrome.kill();
rmSync(profile, { recursive: true, force: true });
process.exit(0);
