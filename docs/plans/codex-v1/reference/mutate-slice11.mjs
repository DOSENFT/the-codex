// Slice 11 mutation run — can the proof actually fail?
//
// Thirty-two green lines that cannot go red are decoration. Each mutation below
// restores, faithfully, the state this slice was opened to change: the
// precedence bug that really was in canFallBack this morning, the clock that
// really did not exist, the key that really was in the query string, the panel
// that really had no way out of `loading`.
//
// Every edit is compared against the file before and after, so a sed that
// silently matched nothing is reported INVALID rather than posing as a hole in
// the proof — which is the one failure mode a mutation harness must not have.
// A mutation the build refuses is INVALID too: the proof never ran against it.
//
//   node docs/plans/codex-v1/reference/mutate-slice11.mjs
// (the preview server must already be running on 4173)
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = new URL('../../../../', import.meta.url).pathname.slice(1);
const file = f => ROOT + f;

const MUTATIONS = [
  {
    // THE BUG. `A && B && C ? x : y` parses as `(A && B && C) ? x : y`, so with
    // fallback off the whole condition is false and the ELSE branch — "is the
    // other provider configured" — decides. It is. Off meant on.
    name: 'the precedence bug comes back and fallback:false calls Google anyway',
    edits: [{ file: 'src/lib/ai.ts',
      from: `  if (cfg.fallbackEnabled === false) return false
  if (!isWorthFallingBackFrom(err)) return false
  return cfg.provider === 'ollama'
    ? !!cfg.geminiApiKey
    : !!cfg.ollamaUrl && !!cfg.ollamaModel`,
      to: `  return cfg.fallbackEnabled !== false && isWorthFallingBackFrom(err) && cfg.provider === 'ollama'
    ? !!cfg.geminiApiKey
    : !!cfg.ollamaUrl && !!cfg.ollamaModel` }],
    expect: 'NOTHING was sent to Gemini with fallback off',
  },
  {
    // No clock at all — the state of this file yesterday. Nine fetches, no
    // AbortController, nothing that ends a request that is never answered.
    name: 'the connect clock is never armed',
    edits: [{ file: 'src/lib/ai.ts', from: '  arm(connectMs)\n', to: '' }],
    expect: 'the wait ended on its own',
  },
  {
    // The stream handed a timed-out host to the non-streaming path, which put a
    // second full bound on the same dead address. Eight seconds became sixteen.
    name: 'a dead host is retried non-streamed, so the bound costs double',
    edits: [{ file: 'src/lib/ai.ts',
      from: "if (err instanceof AIError && (err.kind === 'timeout' || err.kind === 'network')) {",
      to: 'if (false) {' }],
    expect: 'inside one bound, not two',
  },
  {
    // `?key=${apiKey}`, which is what it said this morning. Browser history, a
    // proxy log, a Referer, a screenshot of a network tab.
    name: 'the Gemini key goes back into the query string',
    edits: [{ file: 'src/lib/ai.ts',
      from: '      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,\n      { method: \'POST\', headers: geminiHeaders(cfg.geminiApiKey!), signal: b.signal, body: geminiBody(systemPrompt, userMessage) },',
      to: '      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${cfg.geminiApiKey}`,\n      { method: \'POST\', headers: { \'Content-Type\': \'application/json\' }, signal: b.signal, body: geminiBody(systemPrompt, userMessage) },' }],
    expect: 'and not in the URL',
  },
  {
    // One machine's LAN IP, compiled in, shipped to an iPad on a different
    // network. This is the mutation section 0 exists for.
    name: 'the hard-coded LAN address is compiled back in',
    edits: [{ file: 'src/lib/ai.ts',
      from: '  return `${window.location.origin}/ollama`',
      to: "  return 'http://192.168.1.174:11434'" }],
    expect: 'no LAN address is compiled into the bundle',
  },
  {
    // WHOLESALE, across both files. The escape hatch is one mechanism in two
    // halves — a control on the screen and a controller behind it — and
    // removing either alone leaves the other standing, which is a mutation
    // that has not undone the fix rather than a proof that fails to test it.
    name: 'the panel goes back to having no way out of loading',
    edits: [
      { file: 'src/components/CombatHelper.tsx', from: '        {loading ? (', to: '        {false ? (' },
      { file: 'src/hooks/useAI.ts', from: '    abortRef.current?.abort()\n    abortRef.current = null\n', to: '' },
    ],
    expect: 'THE STOP BUTTON IS THERE',
  },
].map(m => m.edits ? m : { ...m, edits: [{ file: m.file, from: m.from, to: m.to }] });

const run = cmd => {
  try { execSync(cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' }); return { ok: true, out: '' }; }
  catch (e) { return { ok: false, out: (e.stdout ?? '') + (e.stderr ?? '') }; }
};

let holes = 0, invalid = 0;
for (const m of MUTATIONS) {
  const originals = new Map();
  for (const e of m.edits) if (!originals.has(e.file)) originals.set(e.file, readFileSync(file(e.file), 'utf8'));
  const restore = () => {
    for (const [f, text] of originals) {
      writeFileSync(file(f), text);
      if (readFileSync(file(f), 'utf8') !== text) throw new Error(`could not restore ${f}`);
    }
  };
  let applied = true;
  for (const e of m.edits) {
    const before = readFileSync(file(e.file), 'utf8');
    // This repo has both line endings — ai.ts is LF, CombatHelper.tsx is CRLF —
    // and a multi-line anchor written one way silently matches nothing in the
    // other. That reads as INVALID, which is honest but useless: the harness
    // would be reporting on its own newlines rather than on the code. Try the
    // anchor as written, then the same anchor in CRLF, and carry the file's own
    // line endings into the replacement.
    const crlf = s => s.replace(/\n/g, '\r\n');
    let after = before.replace(e.from, e.to);
    if (after === before) after = before.replace(crlf(e.from), crlf(e.to));
    if (after === before) {
      console.log(`  INVALID  ${m.name}\n           anchor gone from ${e.file}: ${JSON.stringify(e.from.slice(0, 60))}`);
      applied = false;
      break;
    }
    writeFileSync(file(e.file), after);
  }
  if (!applied) { restore(); invalid++; continue; }
  try {
    const built = run('npx vite build');
    if (!built.ok) {
      console.log(`  INVALID  ${m.name}\n           the build refused it, so the proof never ran`);
      invalid++;
      continue;
    }
    const proof = run('node docs/plans/codex-v1/reference/prove-slice11.mjs');
    if (proof.ok) {
      console.log(`  SURVIVED ${m.name}\n           the proof stayed green with this broken; it is not testing it`);
      holes++;
    } else {
      const hit = proof.out.split('\n').some(l => l.startsWith('  FAIL') && l.includes(m.expect));
      if (hit) console.log(`  killed   ${m.name}\n           by: ${m.expect}`);
      else {
        console.log(`  MISDIRECT ${m.name}\n           the proof failed, but not on "${m.expect}" — it may be failing for the wrong reason`);
        holes++;
      }
    }
  } finally {
    restore();
  }
}

run('npx vite build');
console.log(`\n${MUTATIONS.length - holes - invalid}/${MUTATIONS.length} killed` +
  (invalid ? `, ${invalid} INVALID` : '') + (holes ? `, ${holes} HOLE(S)` : ''));
process.exit(holes || invalid ? 1 : 0);
