import { LIVE } from './rig.mjs';
const B = LIVE.replace(/\/$/, '');
for (const p of ['/icons/icon-192.png','/icons/icon-512.png','/icons/icon-maskable-512.png','/icons/apple-touch-icon.png']) {
  const r = await fetch(B + p);
  const buf = r.ok ? Buffer.from(await r.arrayBuffer()) : null;
  console.log(`${String(r.status).padEnd(4)} ${p.padEnd(34)} ${r.headers.get('content-type')}  ${buf ? buf.length + ' bytes' : ''}`);
}
