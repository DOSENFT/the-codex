// Nix Backstory Injection Script
// Paste this into the browser console while on The Codex app
// It will update the active character's backstory data

(function() {
  // Find the active character
  const activeId = localStorage.getItem('codex-active-id');
  if (!activeId) {
    console.error('No active character found. Open The Codex and select Nix first.');
    return;
  }

  const charKey = 'codex-character-' + activeId;
  const raw = localStorage.getItem(charKey);
  if (!raw) {
    console.error('Character data not found for id:', activeId);
    return;
  }

  const character = JSON.parse(raw);
  console.log('Updating backstory for:', character.name);

  // Generate unique IDs
  function uid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  character.backstory = {
    origin: `Born Khaonn Lochai in a remote Vä village. His mother, Rysanna Lochai, was a changeling con artist who fled her deceptions and sought sanctuary in the village — but the villagers treated her with suspicion and disdain, branding her son "Nix," a slur meaning nothingness or bringer of misfortune.

Nix's only solace was Selis, a fellow changeling orphan whose secret nature only he knew. Small, frail, with a limp — but kind, free-spirited, and deeply attuned to nature. She taught him to see beauty in his changeling gifts: "You just have to come as you are." She wore a brass pendant etched with an unfamiliar sigil that she was always fiddling with. Their bond became a devotion, an oath.

When Rysanna disappeared — her body found in the woods — Nix spiraled. He drifted toward a group of wealthy, arrogant "single-skins" who shared his disdain for convention. He pulled away from Selis, ignored her, and finally rejected her.

One night, trying to prove himself to the group, Nix set fire to a field of crops as a "joke." The fire consumed everything — fields, the group, nearly the village. A mysterious silent druid appeared and shielded Nix with magic, but Selis — who had limped toward the inferno to save him — perished just beyond the barrier's edge. Her hand was still reaching for him.

From her burning pendant, which seared its sigil into Nix's palm, emerged Fate — a wildfire spirit of ash and flame. The silent druid pulled Nix from the ruins and trained him in druidic magic, though their motives remained unknowable. Eventually Nix fled, taking only the scar on his palm and the spirit that haunted him.

He found Scar — a goliath left for dead after a raid, brain-damaged into childlike simplicity — and chose to save him. Together they became "freelance problem-solvers," walking the line between justice and mischief, helping outcasts and the weak as penance. Later, Nix took the Oath of the Hearth, swearing to tend, gather, and guard — the values Selis embodied and he failed to honor.`,

    keyMemories: [
      {
        id: uid(),
        title: "Selis and the Pendant",
        description: "Selis fiddling with her brass pendant, tracing its sigil like it held a quiet secret. The two of them sitting together in the village — her teaching Nix to see beauty in what he was. 'You just have to come as you are.' The meaning was always lost on him then.",
        emotionalCore: "hope",
        npcInvolved: "Selis"
      },
      {
        id: uid(),
        title: "Rysanna's Disappearance",
        description: "One morning, his mother left for supplies and never returned. Her body was found in the woods with signs of a struggle. The villagers believed her past had caught up to her. But something nagged — 'the body was unmistakably Rysanna's… at least…' Nix never investigated further, consumed by grief.",
        emotionalCore: "loss",
        npcInvolved: "Rysanna Lochai"
      },
      {
        id: uid(),
        title: "The Inferno",
        description: "Nix set fire to a crop field to impress the village outcasts. The fire consumed the fields, the group, and nearly the village. Frozen in the center of the blaze, he watched it spiral — mirroring his mother, selfish and destructive. A silent druid appeared and shielded him with magic. But Selis, who had limped toward the fire to save him, lay crumpled just beyond the barrier. Her hand was still reaching for him.",
        emotionalCore: "grief",
        npcInvolved: "Selis"
      },
      {
        id: uid(),
        title: "Birth of Fate",
        description: "Clutching Selis's burning pendant as it seared into his palm, the brass melted and twisted. From the ember emerged a small flickering firefly — a spirit of ash and flame. Nix stared at it through tears. The same fire that took her. The same fire that should have taken him. He whispered: 'Fate.'",
        emotionalCore: "grief",
        npcInvolved: "Fate"
      },
      {
        id: uid(),
        title: "The Name of Nothing",
        description: "That night Khaonn abandoned his name, embracing 'Nix' — the villagers' cruel slur meaning nothing, empty. He carried the pendant's brand seared into his palm as penance. Under the silent druid's guidance he learned nature magic, but their silence was impenetrable, their motives impossible to read. Why save him? Why teach him? The questions festered until he fled.",
        emotionalCore: "shame",
        npcInvolved: "The Silent Druid"
      },
      {
        id: uid(),
        title: "Finding Scar",
        description: "A goliath left for dead after a raid, brain-damaged into childlike simplicity and unwavering loyalty. Nix chose to save him when no one else would. Scar's black-and-white morality became the compass Nix wasn't sure he had anymore. Together they became freelance problem-solvers — Nix's penance given a partner.",
        emotionalCore: "hope",
        npcInvolved: "Scar"
      },
      {
        id: uid(),
        title: "Joining the Voyage",
        description: "A botched job at a manor — borrowing clothes, tiny fires as a distraction, Scar yelling, Nix running, Fate thrilled. They fled to the docks where Nix fast-talked their way onto a ship's manifest. But their names were already signed. Weeks ago, Fate had pulled Nix from bed, led him to that ledger in the night, and without knowing why — he signed.",
        emotionalCore: "wonder",
        npcInvolved: "Fate"
      },
      {
        id: uid(),
        title: "Rejecting Selis",
        description: "After his mother's disappearance, Nix drifted toward a group of arrogant wealthy youths who offered him belonging. Selis warned him against their influence but he ignored her, ashamed of the guilt her words stirred. The moments of peace with her grew fewer as he pulled away, then ignored her, then finally rejected her. The last person who truly saw him.",
        emotionalCore: "shame",
        npcInvolved: "Selis"
      }
    ],

    relationships: [
      { name: "Selis", relation: "Childhood best friend, fellow changeling — taught him self-acceptance. Died in the fire he started.", status: "dead" },
      { name: "Rysanna Lochai", relation: "Mother — changeling con artist whose manipulations shaped his distrust. Disappeared; body found in the woods, but doubts remain.", status: "unknown" },
      { name: "Scar", relation: "Found and saved a brain-damaged goliath. Partner, moral compass, grounding force. Unwavering loyalty. Only person besides the party who knows Nix is a changeling.", status: "alive" },
      { name: "Fate", relation: "Wildfire spirit born from Selis's burning pendant. Part companion, part burden — reflects Nix's inner turmoil. Impulsive and mischievous, sometimes destructive.", status: "alive" },
      { name: "The Silent Druid", relation: "Mysterious figure who saved Nix from the inferno and trained him in druidic magic. Motives unknown. Never spoke. Nix eventually fled from them.", status: "unknown" },
      { name: "Rune Willow", relation: "Party member (Wizard) — quiet, inquisitive, knowledge-hungry. A calming presence.", status: "alive" },
      { name: "Ponzi", relation: "Party member (Rogue) — observant, reserved. Recognized Scar's voice as someone named 'Hopscotch' from his past.", status: "alive" },
      { name: "Ketza", relation: "Party member (Ranger) — young wood elf. Searching for her missing father in the Drinkswood.", status: "alive" },
      { name: "Talon", relation: "Party member (Bard) — rock gnome with cowboy aesthetic, tinker. Doug's character.", status: "alive" },
      { name: "Aesis the Shepherd", relation: "Patron deity — guidance comes as warmth, a gut feeling to tend what needs tending. Nix feels the pull rather than hearing a voice.", status: "alive" }
    ],

    unresolvedThreads: [
      "Was Rysanna's death real? The body was 'unmistakably hers… at least.' Could a changeling have faked it?",
      "Who is the Silent Druid? Why did they save Nix? Why teach him? Were they connected to Selis's pendant?",
      "What was the sigil on Selis's pendant? Where did she get it? What connection does it have to Fate?",
      "Scar may be 'Hopscotch' — someone Ponzi knew who was supposedly killed by a mind flayer. What happened to Scar's true identity?",
      "The Hidden Kingdom — Nix's long-term ambition to build a shadow nation for outcasts and the forgotten. 'While the nations war for power, we build what comes after.'",
      "The Bloodfather — a mysterious figure commanding werewolves to harvest ember sap in the Drinkswood. Connected to Ketza's missing father.",
      "Nix's changeling secret — only Scar knows. What happens when the party discovers the truth?",
      "The pendant is lost — Nix dropped it when he fled the Silent Druid. The scar on his palm is all that remains. Could it be recovered?",
      "Aesis the Shepherd and the Oath of the Hearth — how does Nix reconcile his destructive past with his oath to tend, gather, and guard?"
    ],

    personalitySeeds: [
      "Uses humor and charm as armor — quick wit masks deep emotional scars and self-loathing",
      "Carries crushing guilt over Selis's death; everything he does for the weak is penance, not virtue",
      "Hides his changeling nature out of fear and shame — Rysanna's manipulations taught him that revealing the truth leads to pain",
      "Selis taught him 'come as you are' but he can't — he wears masks because he believes his true self is unworthy",
      "Tends to flee when things get emotionally heavy, then hates himself for running",
      "Scar's childlike moral clarity grounds him — Nix tries to be good 'for Scar' when he can't do it for himself",
      "Views Fate as both punishment and companion — the fire that killed Selis now lives on his shoulder",
      "Resourceful and observant — always looking for leverage, reading people, finding angles. A survivor's instinct.",
      "Dreams of building something lasting for the forgotten — not ruling, but preparing the way. The Hidden Kingdom.",
      "Never changes his eyes — polished silver, changeling. Claims it's a rare half-elf defect. The one truth he can't hide."
    ]
  };

  character.updatedAt = new Date().toISOString();
  localStorage.setItem(charKey, JSON.stringify(character));

  console.log('Backstory injected successfully!');
  console.log('Origin:', character.backstory.origin.substring(0, 80) + '...');
  console.log('Key Memories:', character.backstory.keyMemories.length);
  console.log('Relationships:', character.backstory.relationships.length);
  console.log('Unresolved Threads:', character.backstory.unresolvedThreads.length);
  console.log('Personality Seeds:', character.backstory.personalitySeeds.length);
  console.log('\n>>> REFRESH THE PAGE to see the changes <<<');
})();
