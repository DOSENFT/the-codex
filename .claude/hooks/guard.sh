#!/usr/bin/env bash
# Atlas guardrail — blocks NEVER-DO at the tool boundary. Conservative by design.
# CANONICAL template: Command/.claude/ (Single-Edit Rule). Cross-platform: matches BOTH
# Windows backslash paths and POSIX forward-slash paths (slash-only variants let Windows
# '\.env' / 'memory\' writes through — this version closes that). A false block is safe.
# Exit 2 = blocked; exit 0 = allowed.
# D-015 (2026-09-27): the sacred-folder rule no longer fires on a quoted word (an escaped quote is a
# backslash in the JSON payload); a real path separator there is '/' or a doubled backslash.
# D-014 (2026-09-27): two needless blocks removed, every protection kept. Code that READS
# environment variables (os.environ, process.env, import.meta.env) is not a .env file, and Claude
# Code's own auto-memory notebook (~/.claude/projects/<project>/memory/) is not the sacred memory/.
payload="$(cat)"
block(){ echo "BLOCKED by Atlas guard: $1" >&2; exit 2; }
# Protect the sacred (non-env). Separator-agnostic.
sacred="$(echo "$payload" | sed -E 's#\.claude[\\/]+projects[\\/]+[^\\/"]+[\\/]+memory[\\/]+##g')"
echo "$sacred" | grep -Eiq 'soul\.md|memory(/|\\\\)|identity\.md|user\.md' \
  && block "touches a protected/sacred path (soul.md / memory/ / identity / user)"
# Protect .env files (ALLOWLIST, not denylist): block bare .env and ANY .env.* EXCEPT
# .env.example / .env.sample / .env.template. (ERE has no negative lookahead -> extract every
# .env[.suffix] token, drop the allowed example files, block if anything remains.)
# Code idioms that read env VARIABLES are dropped first (D-014); a real file path still blocks.
envscan="$(echo "$payload" | sed -E 's/(os|process|import\.meta)\.env(iron)?//gI')"
if echo "$envscan" | grep -Eio '\.env(\.[a-z0-9_]+)?' \
     | grep -Eiv '^\.env\.(example|sample|template)$' | grep -q .; then
  block "touches a protected .env file (only .env.example / .env.sample / .env.template allowed)"
fi
# Destructive git + filesystem, and blanket staging (forces explicit, privacy-safe commits).
echo "$payload" | grep -Eiq 'push[^"]*--force|--force-with-lease|reset[[:space:]]+--hard|rm[[:space:]]+-[rf]+|git[[:space:]]+clean[[:space:]]+-[a-z]*f|git[[:space:]]+add[[:space:]]+(-A|--all|\.)' \
  && block "destructive op or blanket git-add (stage files explicitly)"
# Rail-C privacy backstop (M-C4 / D-008): writes touching knowledge/ are auto-synced to the phone via
# the scoped GitHub connector — block re-introduction of any KNOWN sensitive marker onto that surface.
# Backstop only: a static list can't catch a brand-new name/place; the human harvest checklist covers that.
# ONE SOURCE, MANY READERS: this same list feeds the M-C4 privacy re-grep (grep -Ef sensitive-markers.txt).
markers=".claude/hooks/sensitive-markers.txt"
if echo "$payload" | grep -Eiq 'knowledge[\\/]' && [ -f "$markers" ]; then
  pat="$(grep -Ev '^[[:space:]]*(#|$)' "$markers" | paste -sd'|' -)"
  if [ -n "$pat" ] && echo "$payload" | grep -Eiq "$pat"; then
    block "write touches knowledge/ AND contains a known sensitive marker (Rail-C privacy backstop, M-C4). If this is legitimate boundary-declaration prose, author it before wiring or briefly toggle the guard (a false block is safe)."
  fi
fi
exit 0
