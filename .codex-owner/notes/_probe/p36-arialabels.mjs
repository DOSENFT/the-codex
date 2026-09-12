import fs from 'node:fs';
import path from 'node:path';

function walk(d, o = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, o);
    else if (e.name.endsWith('.tsx') && !e.name.includes('.test.')) o.push(p);
  }
  return o;
}

const hits = [];
for (const f of walk('src')) {
  const s = fs.readFileSync(f, 'utf8');
  const re = /aria-label="([^"]+)"([\s\S]{0,500}?)<\/(Button|button)>/g;
  let m;
  while ((m = re.exec(s))) {
    const label = m[1];
    const text = m[2]
      .replace(/<[^>]*>/g, ' ')
      .replace(/\{[^}]*\}/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text || text.length < 3 || text.length > 40) continue;
    if (text.toLowerCase() === label.toLowerCase()) continue;
    const line = s.slice(0, m.index).split('\n').length;
    hits.push(`${f.split(path.sep).join('/')}:${line}  visible="${text}"  aria-label="${label}"`);
  }
}
console.log(hits.join('\n'));
console.log('--- total ' + hits.length);
