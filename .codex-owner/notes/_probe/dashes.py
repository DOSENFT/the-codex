# One-off: re-punctuate the owner's page so it carries no em dashes, no en-dash
# separators, and no more than one middle dot per line (taste-skill anti-slop audit).
import io, sys
p = sys.argv[1]
s = io.open(p, encoding='utf-8').read()

subs = [
 ("<title>The Codex — owner's plan, run 1</title>", "<title>The Codex: owner's plan, run 1</title>"),
 ('content: "—  ";', 'content: "-  ";'),
 ("The Codex · owner's plan · run 1 of many", "The Codex owner's plan · run 1 of many"),
 ("the best thing in the building — it reads", "the best thing in the building: it reads"),
 ("sold once for $29, to the player — not a subscription", "sold once for $29, to the player; not a subscription"),
 ("<b>Left:</b> the turn screen — works, and is why", "<b>Left:</b> the turn screen. Works, and is why"),
 ("the way you do at the table — start combat", "the way you do at the table: start combat"),
 ("roll death saves, reopen it — plus 5 that", "roll death saves, reopen it. Plus 5 that"),
 ("to read it already exists — with <strong>no script and no caller</strong>, aimed",
  "to read it already exists, with <strong>no script and no caller</strong>, aimed"),
 ("Not a criticism — nothing has been disproved", "Not a criticism: nothing has been disproved"),
 ("rehearses you into him — a practice room between", "rehearses you into him: a practice room between"),
 ("twenty minutes in the practice room — a scene, an aim", "twenty minutes in the practice room: a scene, an aim"),
 ("that does what we do charges once — <a href", "that does what we do charges once: <a href"),
 ("ongoing cost, and we have none — no server", "ongoing cost, and we have none: no server"),
 ("about 133 visits a month — four or five a day", "about 133 visits a month, four or five a day"),
 ("a season of drills — bought when wanted", "a season of drills, bought when wanted"),
 ("Fight Club 5e — offline, no account", "Fight Club 5e: offline, no account"),
 ("the incumbent for this job — it has given itself", "the incumbent for this job; it has given itself"),
 ("companion app</a> in February 2026 — \"the current experience sucks\" — and <a href",
  "companion app</a> in February 2026 (\"the current experience sucks\"), and <a href"),
 ("physically or online\" — people who <em>alternate modes</em>", "physically or online\": people who <em>alternate modes</em>"),
 ("Google Play only</a> (2.1★) — the <a href", "Google Play only</a> (2.1★); the <a href"),
 ("the cold start are all right — and two are further", "the cold start are all right, and two are further"),
 ("one tap puts it back — every spend, not just reactions", "one tap puts it back: every spend, not just reactions"),
 ("is yours permanently — including from us", "is yours permanently, including from us"),
 ("before you press — \"Undo Bless\"", "before you press: \"Undo Bless\""),
 ("doesn't open his wallet — the biggest one</h3>", "doesn't open his wallet (the biggest one)</h3>"),
 ("not <em>improvement</em> — nobody has tested", "not <em>improvement</em>. Nobody has tested"),
 ("the answer isn't \"market harder\" — it's that we sell", "the answer isn't \"market harder\"; it's that we sell"),
 ("M5–M7 still stand — the argument that", "M5-M7 still stand: the argument that"),
 ("in-character result</strong> — in 6 to 26 seconds each", "in-character result</strong>, in 6 to 26 seconds each"),
 ("the rest of the app already knows — recorded as a candidate", "the rest of the app already knows. Recorded as a candidate"),
 ("fail gracefully it gets removed — which is what M3 and M6 do", "fail gracefully it gets removed, which is what M3 and M6 do"),
 ("Nothing finished yet — this run was for understanding", "Nothing finished yet. This run was for understanding"),
 ("goes on the storefront — the app is", "goes on the storefront? The app is"),
 ("<code>notes/inventory.md</code> — each with a capture", "<code>notes/inventory.md</code>, each with a capture"),
 ("<code>notes/studio.md</code> §6.1 — your acquisition memo", "<code>notes/studio.md</code> §6.1 (your acquisition memo)"),
 ("companion app in Feb 2026 — \"the current experience sucks\"", "companion app in Feb 2026: \"the current experience sucks\""),
 ("4.3★ on Apple — same product</td>", "4.3★ on Apple (same product)</td>"),
 ("Unverified</span> — no comparable exists. M10 tests it.", "Unverified</span> No comparable exists. M10 tests it."),
 ("Unverified</span> — inferred from the Patreon gap", "Unverified</span> Inferred from the Patreon gap"),
 ("Unverified</span> — no path found.", "Unverified</span> No path found."),
 ("<code>.codex-owner/ref/SOURCES.md</code> — including the pages", "<code>.codex-owner/ref/SOURCES.md</code>, including the pages"),
 # en-dash separators
 ("0×–16×", "0×-16×"),
 ("$3–$5", "$3-$5"),
 ("M5–M7 change shape", "M5-M7 change shape"),
]
for a, b in subs:
    if a in s:
        s = s.replace(a, b, 1)
    else:
        print("MISS", a[:66])
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print("em:", s.count('—'), "en:", s.count('–'), "middot:", s.count('·'))
