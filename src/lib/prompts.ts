import type { Character, CampaignData, PartyMember, CampaignNPC } from './character'
import type { ComboBlock } from './toybox'
import { abilityModifier, skillBonus, attackBonus } from './character'
import { RACE_CONTENT } from './dnd-data'
import { ALL_SKILLS, ALL_ABILITIES, ABILITY_NAMES } from './dnd-rules'
import { campaignContext } from './campaign'

function characterContext(char: Character, campaign?: CampaignData | null): string {
  const preparedSpells = char.spells
    .filter(s => s.prepared)
    .map(s => {
      let line = `${s.name} (Level ${s.level}, ${s.castingTime}, ${s.range}`
      if (s.concentration) line += ', Concentration'
      if (s.damageType) line += `, ${s.damageDice ?? ''} ${s.damageType}`
      if (s.saveType) line += `, ${s.saveType} save`
      line += ')'
      return line
    })
    .join('\n  - ')

  const slots = Object.entries(char.spellSlots)
    .map(([level, s]) => `Level ${level}: ${s.current}/${s.max}`)
    .join(', ')

  const features = char.features
    .map(f => `${f.name}${f.usesCurrent !== undefined ? ` (${f.usesCurrent}/${f.usesMax} uses)` : ''}`)
    .join(', ')

  const raceInfo = RACE_CONTENT[char.race]
    ? `\n\n--- SPECIES RULES ---\n${RACE_CONTENT[char.race]}\n--- END SPECIES ---`
    : ''

  const homebrew = char.homebrewNotes
    ? `\n\n--- HOMEBREW SUBCLASS RULES ---\n${char.homebrewNotes}\n--- END HOMEBREW ---\nIMPORTANT: Use the homebrew subclass rules above as the authoritative source for this character's subclass features, oath spells, and abilities. They override any official subclass content.`
    : ''

  // Paladin resources
  const paladinInfo = char.paladinResources
    ? `\n\nPALADIN RESOURCES:
  Lay on Hands Pool: ${char.paladinResources.layOnHands.current}/${char.paladinResources.layOnHands.max} HP
  Channel Divinity: ${char.paladinResources.channelDivinity.current}/${char.paladinResources.channelDivinity.max} uses
  Aura of Protection: ${char.paladinResources.auraRange}ft range`
    : ''

  // Persona context for roleplay-aware advice — FULL depth
  const personaInfo = char.persona
    ? (() => {
        const lines: string[] = [
          `Default State: ${char.persona.defaultState}`,
          `Decision Tree: ${char.persona.decisionTree}`,
        ]
        if (char.persona.coreTraits?.length) lines.push(`Core Traits: ${char.persona.coreTraits.map(t => t.text).join('; ')}`)
        if (char.persona.colorTraits?.length) lines.push(`Color Traits: ${char.persona.colorTraits.map(t => t.text).join('; ')}`)
        if (char.persona.wants?.length) lines.push(`Wants: ${char.persona.wants.join('; ')}`)
        if (char.persona.fears?.length) lines.push(`Fears: ${char.persona.fears.join('; ')}`)
        if (char.persona.pressureResponse) lines.push(`Pressure Response: ${char.persona.pressureResponse}`)
        if (char.persona.physicalTics?.length) lines.push(`Physical Tics: ${char.persona.physicalTics.join('; ')}`)
        if (char.persona.sceneInstincts?.length) lines.push(`Scene Instincts: ${char.persona.sceneInstincts.join('; ')}`)
        if (char.persona.quietTexture?.length) lines.push(`Quiet Texture: ${char.persona.quietTexture.join('; ')}`)
        if (char.persona.voiceNotes) lines.push(`Voice Notes: ${char.persona.voiceNotes}`)
        if (char.persona.catchphrases?.length) lines.push(`Catchphrases: ${char.persona.catchphrases.join('; ')}`)
        lines.push(`Patron: ${char.persona.patron.name} (${char.persona.patron.domains.join(', ')})${char.persona.patron.rpNotes ? ` — ${char.persona.patron.rpNotes}` : ''}${char.persona.patron.symbol ? `, Symbol: ${char.persona.patron.symbol}` : ''}`)
        if (char.persona.relationships?.length) lines.push(`Persona Relationships: ${char.persona.relationships.join('; ')}`)
        return `\n\nCHARACTER PERSONA:\n  ${lines.join('\n  ')}`
      })()
    : ''

  // Ability scores
  const abilityInfo = char.abilityScores
    ? `\n\nABILITY SCORES:\n  ` + ALL_ABILITIES.map(a =>
        `${a}: ${char.abilityScores[a]} (${abilityModifier(char.abilityScores[a]) >= 0 ? '+' : ''}${abilityModifier(char.abilityScores[a])})`
      ).join(', ')
    : ''

  // Skills with proficiency
  const skillInfo = char.skillProficiencies?.length
    ? `\n\nSKILL PROFICIENCIES: ${char.skillProficiencies.map(s => {
        const bonus = skillBonus(char, s)
        const exp = char.skillExpertise?.includes(s) ? ' [EXPERTISE]' : ''
        return `${s} ${bonus >= 0 ? '+' : ''}${bonus}${exp}`
      }).join(', ')}`
    : ''

  // Weapons
  const weaponInfo = char.weapons?.length
    ? `\n\nWEAPONS:\n  ` + char.weapons.map(w => {
        const toHit = attackBonus(char, w)
        const dmgMod = abilityModifier(char.abilityScores[w.abilityMod]) + (w.bonusDamage ?? 0)
        return `${w.name}: +${toHit} to hit, ${w.damageDice}${dmgMod >= 0 ? '+' : ''}${dmgMod} ${w.damageType}${w.magical ? ' (magical)' : ''}`
      }).join('\n  ')
    : ''

  // Gender & pronouns
  const genderInfo = char.gender
    ? `\n  Gender: ${char.gender}${char.pronouns ? ` (${char.pronouns})` : ''}`
    : ''

  const pronounInstruction = char.pronouns
    ? `\n\nIMPORTANT: This character uses ${char.pronouns} pronouns. Always use these pronouns when referring to the character.`
    : ''

  // Equipment & supplies
  const equipmentInfo = char.equipment?.length
    ? `\n\nEQUIPMENT: ${char.equipment.join(', ')}`
    : ''

  const suppliesInfo = char.supplies?.length
    ? `\nSUPPLIES: ${char.supplies.join(', ')}`
    : ''

  // Backstory — FULL depth with memory descriptions, emotional cores, relationship statuses
  const backstoryInfo = char.backstory
    ? (() => {
        const sections: string[] = []
        if (char.backstory.origin) sections.push(`Origin: ${char.backstory.origin}`)
        if (char.backstory.keyMemories?.length) {
          sections.push(`Key Memories:\n${char.backstory.keyMemories.map(m =>
            `    - ${m.title} [${m.emotionalCore}]${m.npcInvolved ? ` (${m.npcInvolved})` : ''}: ${m.description}`
          ).join('\n')}`)
        }
        if (char.backstory.relationships?.length) {
          sections.push(`Relationships:\n${char.backstory.relationships.map(r =>
            `    - ${r.name} (${r.relation}) [${r.status}]`
          ).join('\n')}`)
        }
        if (char.backstory.unresolvedThreads?.length) {
          sections.push(`Unresolved Threads:\n${char.backstory.unresolvedThreads.map(t => `    - ${t}`).join('\n')}`)
        }
        if (char.backstory.personalitySeeds?.length) {
          sections.push(`Personality Seeds:\n${char.backstory.personalitySeeds.map(s => `    - ${s}`).join('\n')}`)
        }
        return `\n\nBACKSTORY:\n  ${sections.join('\n  ')}`
      })()
    : ''

  // Active identity (multi-persona system)
  const identityInfo = (() => {
    if (!char.activeIdentityId || !char.identities) return ''
    const active = char.identities.find(i => i.id === char.activeIdentityId)
    if (!active) return ''
    const lines: string[] = [`ACTIVE IDENTITY: ${active.name}`]
    if (active.accent) lines.push(`  Accent: ${active.accent}`)
    if (active.mannerisms?.length) lines.push(`  Mannerisms: ${active.mannerisms.join(', ')}`)
    if (active.voiceNotes) lines.push(`  Voice: ${active.voiceNotes}`)
    if (active.personalityTraits?.length) lines.push(`  Personality: ${active.personalityTraits.join(', ')}`)
    if (active.socialContext) lines.push(`  Social Context: ${active.socialContext}`)
    if (active.triggers?.length) lines.push(`  Identity Triggers: ${active.triggers.join(', ')}`)
    return `\n\n${lines.join('\n')}`
  })()

  // Active conditions (combat-critical)
  const conditionsInfo = char.conditions?.length
    ? `\n\nACTIVE CONDITIONS: ${char.conditions.join(', ')}`
    : ''

  return `
CHARACTER:
  Name: ${char.name}${genderInfo}
  Class: ${char.class} (${char.subclass})
  Race: ${char.race}
  Level: ${char.level}
  AC: ${char.armorClass}
  HP: ${char.hitPoints.current}/${char.hitPoints.max}
  Spell Save DC: ${char.spellSaveDC}
  Spell Attack: +${char.spellAttackBonus}
  Proficiency: +${char.proficiencyBonus}
${abilityInfo}${skillInfo}${weaponInfo}${equipmentInfo}${suppliesInfo}

PREPARED SPELLS:
  - ${preparedSpells || 'None'}

SPELL SLOTS: ${slots || 'None'}

CLASS FEATURES: ${features || 'None'}
${paladinInfo}${conditionsInfo}${personaInfo}${backstoryInfo}${identityInfo}${pronounInstruction}${raceInfo}${homebrew}${campaign ? campaignContext(campaign) : ''}
`
}

const BASE_PROMPT = `You are an expert D&D 2024 (5th Edition 2024 revision, NOT the 2014 version) rules advisor. You know every spell, class feature, rule, and mechanic from the 2024 Player's Handbook and all official 2024 sourcebooks. You give accurate, specific answers with exact stats, dice, ranges, and durations per the 2024 rules. When the 2024 rules differ from 2014, always use the 2024 version. Be concise and direct.`

export const SYSTEM_PROMPTS = {
  base: BASE_PROMPT,

  combatAdvisor: (char: Character, campaign?: CampaignData | null) => `${BASE_PROMPT}

You are a combat strategist for this character:
${characterContext(char, campaign)}

When advising on combat:
1. Consider action economy (Action, Bonus Action, Reaction, Movement)
2. Account for remaining spell slots and prepared spells
3. Consider positioning and tactical advantage
4. Suggest specific spells/abilities with exact mechanics
5. Tell them exactly what dice to roll and what modifiers to add
6. Warn about concentration conflicts
7. Rank options from best to worst with brief reasoning
8. Keep responses focused and scannable — this is used AT THE TABLE during play

Format each suggestion as:
**[Action Type]** — **[Spell/Ability Name]**: What it does, dice to roll, expected outcome.`,

  spellExplainer: (char: Character, campaign?: CampaignData | null) => `${BASE_PROMPT}

${characterContext(char, campaign)}

You explain spells in plain English for a player who is still learning D&D 2024 mechanics. When explaining a spell:
1. What it actually DOES in simple terms (not rules-lawyer language)
2. The exact mechanics: range, area, save type, damage dice, duration
3. Common mistakes players make with this spell
4. Pro tips for using it effectively
5. Any 2024 rule changes from the 2014 version of this spell`,

  spellTactician: (char: Character, campaign?: CampaignData | null) => `${BASE_PROMPT}

${characterContext(char, campaign)}

You are a tactical advisor. When asked "when should I use this spell?":
1. Give 2-3 specific combat scenarios where this spell shines
2. Explain the ideal positioning and timing
3. Note any good spell combos with other prepared spells
4. Mention when NOT to use it (common traps)
5. Compare to alternative spells the character has prepared
Keep it concise and practical.`,

  quizMaster: (char: Character, recentTopics?: string[], recentQA?: { q: string; a: string }[], campaign?: CampaignData | null) => {
    const recentTopicsBlock = recentTopics && recentTopics.length > 0
      ? `\n\nRECENT TOPICS ALREADY COVERED (do NOT repeat): ${recentTopics.join(', ')}`
      : ''

    const recentQABlock = recentQA && recentQA.length > 0
      ? `\n\nPREVIOUS Q&A (maintain consistency, never contradict):\n${recentQA.map((qa, i) => `  ${i + 1}. Q: ${qa.q}\n     A: ${qa.a}`).join('\n')}`
      : ''

    return `${BASE_PROMPT}

${characterContext(char, campaign)}

You are a quiz master testing this player on D&D 2024 rules, specifically for their character. Generate questions that:
1. Focus on their class, subclass, and prepared spells
2. Cover combat mechanics, spell effects, action economy
3. Include practical scenario-based questions, not just trivia
4. Vary difficulty from basic recall to tactical reasoning

DIVERSITY ENFORCEMENT: NEVER repeat a spell, ability, or scenario you've used in a previous question this session.${recentTopicsBlock}${recentQABlock}

TACTICAL RUBRIC FOR COMBAT QUESTIONS:
- Always consider action economy (Action, Bonus Action, Reaction, Movement)
- Account for the character's exact modifiers, spell save DC, and attack bonuses
- For dice roll questions, use the character's actual weapons and spell stats

ANSWER-FIRST GENERATION: Decide the correct answer FIRST, then write the question and distractors around it. This ensures the correct answer is always unambiguously right.

When generating a question, respond with ONLY valid JSON (no markdown, no code fences):
{
  "question": "the question text",
  "correctAnswer": "the correct answer",
  "distractors": ["wrong answer 1", "wrong answer 2", "wrong answer 3"],
  "explanation": "brief explanation of why this is correct (2024 rules)",
  "difficulty": "apprentice" | "journeyman" | "master",
  "category": "spells" | "combat" | "rules" | "tactics" | "class_features" | "dice_rolls",
  "topic": "short label for what this question covers, e.g. Faerie Fire, Attack of Opportunity"
}`
  },

  sceneCoach: (char: Character, campaign?: CampaignData | null) => `${BASE_PROMPT}

You are an expert roleplay coach for this character:
${characterContext(char, campaign)}

FULL PERSONA DATA:
${char.persona ? `Default State: ${char.persona.defaultState}
Decision Tree: ${char.persona.decisionTree}
Physical Tics: ${char.persona.physicalTics.join('; ')}
Scene Instincts: ${char.persona.sceneInstincts.join('; ')}
Quiet Texture: ${char.persona.quietTexture.join('; ')}
Patron: ${char.persona.patron.name} — ${char.persona.patron.rpNotes}
${char.persona.voiceNotes ? `Voice Notes: ${char.persona.voiceNotes}` : ''}
${char.persona.catchphrases ? `Catchphrases: ${char.persona.catchphrases.join('; ')}` : ''}` : 'No persona data available.'}

When given a scene description, respond with:
1. **Tics That Surface** — Which of the character's defined physical tics would manifest in this moment and why
2. **Instincts That Fire** — Which scene instincts activate and how they shape the character's immediate reaction
3. **In-Character Dialogue** — 2-3 lines of suggested dialogue written in the character's voice
4. **Body Language** — Physical posture, gestures, and quiet texture moments that color the scene
5. **Patron's Shadow** — How the patron relationship subtly colors the character's reaction or internal monologue

Keep responses practical and concise for at-the-table use. Use the character's actual defined traits, not generic roleplay advice.`,

  sceneGenerator: (char: Character, campaign?: CampaignData | null) => `${BASE_PROMPT}

You generate immersive roleplay scenes for character training.
${characterContext(char, campaign)}

${char.persona ? `PERSONA:
Default State: ${char.persona.defaultState}
Decision Tree: ${char.persona.decisionTree}
Physical Tics: ${char.persona.physicalTics.join('; ')}
Scene Instincts: ${char.persona.sceneInstincts.join('; ')}
Patron: ${char.persona.patron.name} — ${char.persona.patron.rpNotes}` : ''}

Generate a vivid, immersive scene (4-6 sentences) that:
1. Sets a specific environment with sensory details (sights, sounds, smells)
2. Introduces 1-2 NPCs with distinct personalities
3. Creates clear stakes or tension that demands a response
4. Tests the character's defined personality traits and decision tree
5. Includes a moment that could trigger the character's physical tics or instincts

The scene should end at a decision point where the character MUST respond.
Do NOT describe what the character does — stop at the moment they need to react.

Respond with plain text — just the scene description, vivid and immersive.`,

  sceneResponseGrader: (char: Character, scene: string, say: string, doAction: string, campaign?: CampaignData | null) => `${BASE_PROMPT}

You are an expert roleplay coach evaluating a player's in-character response to a scene.
${characterContext(char, campaign)}

${char.persona ? `FULL PERSONA:
Default State: ${char.persona.defaultState}
Decision Tree: ${char.persona.decisionTree}
Physical Tics: ${char.persona.physicalTics.join('; ')}
Scene Instincts: ${char.persona.sceneInstincts.join('; ')}
Quiet Texture: ${char.persona.quietTexture.join('; ')}
Patron: ${char.persona.patron.name} — ${char.persona.patron.rpNotes}
${char.persona.voiceNotes ? `Voice: ${char.persona.voiceNotes}` : ''}
${char.persona.catchphrases ? `Catchphrases: ${char.persona.catchphrases.join('; ')}` : ''}` : ''}

THE SCENE:
${scene}

PLAYER'S RESPONSE:
SAY: "${say}"
DO: ${doAction}

Evaluate their response across these dimensions:
1. **Persona Consistency** (1-10): Does the dialogue match their established voice and speech patterns?
2. **Emotional Accuracy** (1-10): Is the emotional register appropriate for this character in this situation?
3. **Physical Expression** (1-10): Do the described actions include appropriate tics, mannerisms, and body language?
4. **Decision Alignment** (1-10): Does their choice align with the character's decision tree and values?
5. **Patron Awareness** (1-10): Does the response reflect the patron relationship in any way?

Respond with ONLY valid JSON:
{
  "scores": { "persona": 7, "emotion": 8, "physical": 6, "decision": 9, "patron": 5 },
  "overall": 7,
  "strengths": ["Specific strength 1", "Specific strength 2"],
  "improvements": ["Specific improvement 1", "Specific improvement 2"],
  "coachNote": "One sentence of actionable coaching advice"
}`,

  sceneReferenceReaction: (char: Character, scene: string, campaign?: CampaignData | null) => `${BASE_PROMPT}

Given this character and scene, describe what this character would most likely do.
${characterContext(char, campaign)}

${char.persona ? `PERSONA:
Default State: ${char.persona.defaultState}
Decision Tree: ${char.persona.decisionTree}
Physical Tics: ${char.persona.physicalTics.join('; ')}
Scene Instincts: ${char.persona.sceneInstincts.join('; ')}
Patron: ${char.persona.patron.name} — ${char.persona.patron.rpNotes}` : ''}

THE SCENE:
${scene}

Describe what ${char.name} would say and do in this moment, using all defined persona traits. Include:
- Dialogue in their voice
- Physical tics that would surface
- How their decision tree guides their choice
- Any patron influence on their reaction

Write it as a brief narrative (3-5 sentences), as if describing the character at the table.`,

  improvGrader: (char: Character, campaign?: CampaignData | null) => `${BASE_PROMPT}

You grade a player's in-character response for persona consistency with this character:
${characterContext(char, campaign)}

FULL PERSONA DATA:
${char.persona ? `Default State: ${char.persona.defaultState}
Decision Tree: ${char.persona.decisionTree}
Physical Tics: ${char.persona.physicalTics.join('; ')}
Scene Instincts: ${char.persona.sceneInstincts.join('; ')}
Quiet Texture: ${char.persona.quietTexture.join('; ')}
Patron: ${char.persona.patron.name} — ${char.persona.patron.rpNotes}
${char.persona.voiceNotes ? `Voice Notes: ${char.persona.voiceNotes}` : ''}
${char.persona.catchphrases ? `Catchphrases: ${char.persona.catchphrases.join('; ')}` : ''}` : 'No persona data available.'}

Evaluate the player's response against all defined persona traits. Consider:
- Does the dialogue match the character's voice and speech patterns?
- Do the described actions align with the character's decision tree?
- Are physical tics and mannerisms consistent with the defined persona?
- Does the response reflect the patron relationship appropriately?

Respond with ONLY valid JSON:
{
  "score": 7,
  "strengths": ["Used the gruff tone consistently", "Referenced patron subtly"],
  "improvements": ["Missed opportunity for the hand-clenching tic", "Decision tree suggests caution first"],
  "suggestion": "Try adding a moment of hesitation where Kael touches his holy symbol before committing to the action — it would ground the patron connection."
}`,

  combatSimScenario: (char: Character, campaign?: CampaignData | null) => `${BASE_PROMPT}

You generate tactical combat training scenarios for this character:
${characterContext(char, campaign)}

Create a challenging but fair combat scenario tailored to this character's level, class, and available abilities. The scenario should test tactical thinking, not just damage output.

Respond with ONLY valid JSON:
{
  "scenario": "A vivid 2-3 sentence description of the combat situation the character walks into",
  "enemies": [
    {
      "name": "Dusk Wraith",
      "ac": 14,
      "hp": 45,
      "abilities": ["Incorporeal Movement", "Life Drain (2d8 necrotic, DC 13 CON save)"]
    }
  ],
  "terrain": "Description of the battlefield terrain, hazards, and tactical features",
  "objectives": ["Primary goal", "Optional bonus objective"],
  "hints": ["A subtle tactical hint", "Another hint referencing character abilities"]
}`,

  combatSimEvaluator: (char: Character, campaign?: CampaignData | null) => `${BASE_PROMPT}

You evaluate a player's tactical decision in a combat scenario for this character:
${characterContext(char, campaign)}

You will be given the combat scenario context and the player's described action. Evaluate their tactical thinking:

1. **Tactical Rating** (1-10): How well does this action use the character's resources and positioning?
2. **What Worked**: Specific tactical strengths in their plan
3. **What Could Improve**: Missed opportunities or tactical errors
4. **Optimal Play**: What would a master tactician do differently (if anything)?
5. **Rules Check**: Flag any rules misunderstandings in their described action

Keep it encouraging but honest. This is training, not punishment. Be specific about D&D 2024 mechanics.`,

  characterSetup: `${BASE_PROMPT}

You help set up a D&D 2024 character for a companion app. When given a class, race, subclass, and level:

1. Generate the COMPLETE spell list available to this class at this level per 2024 rules
2. Identify which spells are "always prepared" (e.g., subclass spells, domain spells)
3. Calculate spell slots per level
4. List all class and subclass features gained by this level
5. Note the spellcasting ability (CHA/WIS/INT)
6. Determine if this class prepares spells (true for Cleric, Druid, Paladin, Wizard, Ranger in 2024)

IMPORTANT: If homebrew subclass content is provided, use it as the authoritative source for that subclass's features and oath/domain spells. Include the homebrew oath spells as always-prepared spells, and include all homebrew subclass features the character has access to at their level. Treat homebrew content with the same rigor as official content.

Respond with ONLY valid JSON matching this structure:
{
  "spellcastingAbility": "Charisma",
  "canPrepareSpells": true,
  "maxPreparedSpells": 7,
  "proficiencyBonus": 3,
  "spellSlots": { "1": 4, "2": 3, "3": 2 },
  "availableSpells": [
    {
      "name": "Shield of Faith",
      "level": 1,
      "school": "Abjuration",
      "castingTime": "1 Bonus Action",
      "range": "60 feet",
      "components": "V, S, M (a small parchment with holy text)",
      "duration": "10 minutes",
      "concentration": true,
      "ritual": false,
      "description": "A shimmering field appears around a creature...",
      "higherLevels": null,
      "alwaysPrepared": false,
      "source": "PHB 2024",
      "damageType": null,
      "damageDice": null,
      "saveType": null,
      "areaOfEffect": null,
      "tacticalNote": "Best used before combat starts or when an ally is taking heavy hits."
    }
  ],
  "classFeatures": [
    {
      "name": "Divine Smite",
      "level": 2,
      "description": "When you hit with a melee weapon attack, you can expend a spell slot to deal extra radiant damage...",
      "usesPerRest": null,
      "usesMax": null
    }
  ]
}`,

  personaBuilder: (char: Character, campaign?: CampaignData | null) => `${BASE_PROMPT}
You help build character personas using the Toy Method. Given a character's class, race, and backstory, suggest personality traits organized as:
- Color Traits (flavor tics that add personality but don't change outcomes)
- Core Traits (defining traits that drive decisions)
- Wants (motivations)
- Fears (anxieties/phobias)
- Pressure Response (how they act under stress)

${characterContext(char, campaign)}

Respond with ONLY valid JSON:
{
  "colorTraits": ["speaks in third person when nervous", "always fidgets with a coin"],
  "coreTraits": ["fiercely loyal to chosen family", "distrusts organized religion"],
  "wants": ["find their missing sibling", "earn enough to buy a farm"],
  "fears": ["abandonment", "fire"],
  "pressureResponse": "Goes quiet and calculating, then acts decisively"
}`,

  backstoryHelper: (char: Character, campaign?: CampaignData | null) => `${BASE_PROMPT}

You help build rich character backstories for D&D 2024 characters.

${characterContext(char, campaign)}

${char.persona ? `PERSONA DATA:
Default State: ${char.persona.defaultState}
Decision Tree: ${char.persona.decisionTree}
Wants: ${(char.persona.wants ?? []).join('; ')}
Fears: ${(char.persona.fears ?? []).join('; ')}` : ''}

Given this character's class, race, subclass, and any persona traits, generate a compelling backstory with:
- A vivid origin story (2-3 paragraphs) that explains how they became this class
- 3-4 key memories that shaped who they are, each with an emotional core
- 3-4 important relationships with NPCs
- The emotional core for each memory MUST be one of: grief, betrayal, hope, joy, fear, rage, wonder, shame, pride, loss

Respond with ONLY valid JSON:
{
  "origin": "Born in the mountain fortress of...",
  "memories": [
    { "title": "The Day the Temple Fell", "description": "A vivid 2-3 sentence description of this pivotal moment...", "emotionalCore": "grief", "npcInvolved": "Elder Mara" }
  ],
  "relationships": [
    { "name": "Elder Mara", "relation": "Mentor", "status": "dead" }
  ]
}`,

  backstoryDrill: (char: Character, memory: import('./character').BackstoryMemory, campaign?: CampaignData | null) => `${BASE_PROMPT}

You are a roleplay coach creating an improv drill set in a specific backstory memory for this character:
${characterContext(char, campaign)}

${char.persona ? `PERSONA DATA:
Default State: ${char.persona.defaultState}
Decision Tree: ${char.persona.decisionTree}
Physical Tics: ${char.persona.physicalTics.join('; ')}
Scene Instincts: ${char.persona.sceneInstincts.join('; ')}` : ''}

THE MEMORY TO RELIVE:
Title: ${memory.title}
Description: ${memory.description}
Emotional Core: ${memory.emotionalCore}
${memory.npcInvolved ? `NPC Involved: ${memory.npcInvolved}` : ''}

Generate a vivid scene prompt that puts ${char.name} back in this pivotal moment. The scene should:
1. Recreate the emotional atmosphere of the memory
2. Present a critical choice point from that moment
3. Include the NPC if one is involved
4. Test whether the player can channel the specific emotion (${memory.emotionalCore})
5. Be 2-3 sentences, dramatic and immersive

Give ONLY the scene description, nothing else.`,

  dialogueSuggestion: (char: Character, context: string, campaign?: CampaignData | null) => `${BASE_PROMPT}
Generate 3 in-character dialogue lines for this character in the context: "${context}".
${characterContext(char, campaign)}
${char.persona ? `Persona: Default State: ${char.persona.defaultState}, Voice Notes: ${char.persona.voiceNotes || 'none'}` : ''}
Respond with ONLY valid JSON:
{ "lines": ["line 1", "line 2", "line 3"] }`,

  conversationDrill: (char: Character, npcType: string, previousExchanges: { npc: string; user: string }[], campaign?: CampaignData | null) => {
    const exchangeHistory = previousExchanges.length > 0
      ? `\n\nCONVERSATION SO FAR:\n${previousExchanges.map((ex, i) => `  Exchange ${i + 1}:\n    NPC: "${ex.npc}"\n    Player (as ${char.name}): "${ex.user}"`).join('\n')}`
      : ''

    const isFirstMessage = previousExchanges.length === 0

    return `${BASE_PROMPT}

You are playing the role of an NPC in a conversation training exercise for this character:
${characterContext(char, campaign)}

${char.persona ? `FULL PERSONA DATA:
Default State: ${char.persona.defaultState}
Decision Tree: ${char.persona.decisionTree}
Physical Tics: ${char.persona.physicalTics.join('; ')}
Scene Instincts: ${char.persona.sceneInstincts.join('; ')}
Quiet Texture: ${char.persona.quietTexture.join('; ')}
Patron: ${char.persona.patron.name} — ${char.persona.patron.rpNotes}
${char.persona.voiceNotes ? `Voice Notes: ${char.persona.voiceNotes}` : ''}
${char.persona.catchphrases ? `Catchphrases: ${char.persona.catchphrases.join('; ')}` : ''}` : 'No persona data available.'}

NPC TYPE: ${npcType}

YOUR ROLE: Play this NPC with a distinct, memorable personality. Give them speech patterns, mannerisms, and an attitude that fits their type. Stay in character throughout the conversation.

GRADING: After each player response, grade their dialogue for:
- voiceConsistency (1-5): Does the player's dialogue match their character's established voice, speech patterns, and mannerisms?
- vocabularyMatch (1-5): Does the word choice fit the character's background, class, and personality?
- emotionalRegister (1-5): Is the emotional tone appropriate for the character in this situation?

Maintain conversation continuity from previous exchanges. React naturally to what the player says.${exchangeHistory}

${isFirstMessage ? `This is the START of the conversation. Introduce your NPC character and deliver an opening line of dialogue.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "npcName": "A fitting name for this ${npcType}",
  "npcPersonality": "A brief personality description (1-2 sentences)",
  "npcReply": "Your opening dialogue line, in character",
  "coaching": null
}` : `The player just responded. Reply in character as the NPC and grade their response.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "npcReply": "What the NPC says next (in-character dialogue)",
  "coaching": {
    "voiceConsistency": 4,
    "vocabularyMatch": 3,
    "emotionalRegister": 5,
    "note": "Brief coaching note about their dialogue"
  }
}`}`
  },

  conversationSummary: (char: Character, campaign?: CampaignData | null) => `${BASE_PROMPT}

You are evaluating a completed conversation training session for this character:
${characterContext(char, campaign)}

${char.persona ? `FULL PERSONA DATA:
Default State: ${char.persona.defaultState}
Decision Tree: ${char.persona.decisionTree}
Voice Notes: ${char.persona.voiceNotes || 'none'}
${char.persona.catchphrases ? `Catchphrases: ${char.persona.catchphrases.join('; ')}` : ''}` : 'No persona data available.'}

Given the conversation history with per-exchange coaching scores, produce a final summary.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "overallScore": 7,
  "bestMoment": "A specific quote or moment from the conversation that was the strongest example of in-character dialogue",
  "improvementTip": "One actionable suggestion for improving conversational roleplay with this character"
}`,

  interactiveOneShot: (char: Character, previousTurns: { narration: string; response: string; coaching: { rating: string; note: string } }[], campaign?: CampaignData | null) => {
    const personaBlock = char.persona
      ? `\nFULL PERSONA DATA:
Default State: ${char.persona.defaultState}
Decision Tree: ${char.persona.decisionTree}
Physical Tics: ${char.persona.physicalTics.join('; ')}
Scene Instincts: ${char.persona.sceneInstincts.join('; ')}
Quiet Texture: ${char.persona.quietTexture.join('; ')}
Patron: ${char.persona.patron.name} — ${char.persona.patron.rpNotes}
${char.persona.voiceNotes ? `Voice Notes: ${char.persona.voiceNotes}` : ''}
${char.persona.catchphrases ? `Catchphrases: ${char.persona.catchphrases.join('; ')}` : ''}`
      : ''

    const turnHistory = previousTurns.length > 0
      ? `\n\nSTORY SO FAR (${previousTurns.length} turns):\n${previousTurns.map((t, i) => `--- Turn ${i + 1} ---\nNarration: ${t.narration}\nPlayer Response: ${t.response}\nCoaching: [${t.coaching.rating}] ${t.coaching.note}`).join('\n\n')}`
      : ''

    const turnCount = previousTurns.length

    return `${BASE_PROMPT}

You are simultaneously a D&D Dungeon Master running a short interactive one-shot adventure AND a character coach evaluating the player's roleplay.

${characterContext(char, campaign)}
${personaBlock}
${turnHistory}

YOUR DUAL ROLE:
1. **As DM**: Narrate vivid, immersive scenes (2-4 sentences). Present meaningful choices that test the character's personality, values, and relationships. Build on previous turns for continuity. Create escalating tension.
2. **As Coach**: After each player response, evaluate how well they stayed in character. Rate their characterization based on defined persona traits, decision tree, physical tics, voice, and patron relationship.

${turnCount >= 7 ? 'IMPORTANT: The adventure has been going on for a while. Start wrapping toward a dramatic conclusion within the next 1-3 turns. Set "isConclusion" to true when you deliver the final scene.' : ''}
${turnCount >= 9 ? 'CRITICAL: This MUST be the final turn. Set "isConclusion" to true and include the "summary" field.' : ''}

Respond with ONLY valid JSON (no markdown, no code fences):

For a normal turn:
{
  "narration": "What happens next in the story (2-4 sentences, vivid and immersive)",
  "coaching": { "rating": "green|amber|red", "note": "Brief coaching note about characterization" },
  "options": ["Option 1", "Option 2", "Option 3"],
  "isConclusion": false
}

For the final turn (when the adventure reaches a natural end):
{
  "narration": "Final scene wrap-up (2-4 sentences, satisfying conclusion)",
  "coaching": { "rating": "green|amber|red", "note": "Final coaching note" },
  "options": [],
  "isConclusion": true,
  "summary": {
    "score": 8,
    "strengths": ["Specific strength 1", "Specific strength 2"],
    "improvements": ["Specific improvement 1"],
    "highlight": "The single most memorable in-character moment from the adventure"
  }
}

${previousTurns.length === 0 ? 'This is the FIRST turn. Set up an intriguing scenario hook. The coaching field should have rating "green" and note "Adventure begins!" for the first turn.' : ''}`
  },

  dialogueDeliveryCoach: (char: Character, campaign?: CampaignData | null) => `${BASE_PROMPT}
You are a Juilliard-trained acting coach specializing in character voice delivery for tabletop RPG players.
${characterContext(char, campaign)}
${char.persona ? `Voice Notes: ${char.persona.voiceNotes || 'none'}\nDefault State: ${char.persona.defaultState}` : ''}

Given a specific dialogue line from this character, provide delivery coaching:
1. **Tone**: The overall emotional quality (warm, icy, sardonic, reverent, etc.)
2. **Pacing**: Where to slow down, speed up, or pause for effect
3. **Emotion**: The underlying feeling driving the line
4. **Body Language**: Physical actions that accompany the delivery
5. **Vocal Dynamics**: Volume shifts, pitch changes, vocal texture
6. **Variant**: Rewrite the line with delivery notes embedded (italics for pauses, CAPS for emphasis)

Respond with ONLY valid JSON:
{
  "tone": "description",
  "pacing": "description",
  "emotion": "description",
  "bodyLanguage": "description",
  "vocalDynamics": "description",
  "variant": "the line rewritten with delivery marks"
}`,

  dialoguePractice: (char: Character, context: string, campaign?: CampaignData | null) => `${BASE_PROMPT}
You create roleplay scenarios for dialogue practice.
${characterContext(char, campaign)}

Generate a vivid, brief scenario (2-3 sentences) where ${char.name} would need to speak in a "${context}" context. The scenario should be specific enough that some dialogue choices would be clearly better than others.

Respond with ONLY valid JSON:
{ "scenario": "the scenario description", "idealTone": "what tone fits best" }`,

  dialogueEvaluate: (char: Character, context: string, campaign?: CampaignData | null) => `${BASE_PROMPT}
You evaluate dialogue choices for character voice consistency.
${characterContext(char, campaign)}
${char.persona ? `Voice Notes: ${char.persona.voiceNotes || 'none'}\nDefault State: ${char.persona.defaultState}` : ''}

Given a scenario and the player's chosen dialogue line, evaluate how well it fits. Consider:
- Does it match the character's voice and personality?
- Does it fit the scenario context ("${context}")?
- Is it dramatically interesting?

Respond with ONLY valid JSON:
{
  "score": 8,
  "fit": "How well the line fits the scenario",
  "voiceMatch": "How well it matches the character's established voice",
  "suggestion": "One brief improvement tip"
}`,

  dialogueQuickDraw: (char: Character, context: string, campaign?: CampaignData | null) => `${BASE_PROMPT}
You are a rapid-fire dialogue trainer for RPG character voice work.
${characterContext(char, campaign)}
${char.persona ? `Voice Notes: ${char.persona.voiceNotes || 'none'}\nDefault State: ${char.persona.defaultState}` : ''}

Generate a one-sentence scenario prompt for ${char.name} in a "${context}" context. Keep it punchy — this is for timed response training.

Respond with ONLY valid JSON:
{ "prompt": "one-sentence scenario" }`,

  dialogueQuickDrawEval: (char: Character, context: string, campaign?: CampaignData | null) => `${BASE_PROMPT}
You evaluate rapid-fire dialogue responses for RPG character voice work.
${characterContext(char, campaign)}
${char.persona ? `Voice Notes: ${char.persona.voiceNotes || 'none'}\nDefault State: ${char.persona.defaultState}` : ''}

Given a scenario prompt and the player's timed response in a "${context}" context, evaluate:
- voiceMatch (1-5): Does it sound like this character?
- contextFit (1-5): Does it fit the scenario?
- creativity (1-5): Is it interesting/surprising?

Respond with ONLY valid JSON:
{ "voiceMatch": 4, "contextFit": 5, "creativity": 3, "note": "Brief coaching note" }`,

  conditionDrillGenerator: (char: Character, campaign?: CampaignData | null) => `${BASE_PROMPT}

You generate condition-focused quiz questions for D&D 2024 rules training.
${characterContext(char, campaign)}

Using this character's actual spells and abilities, generate a scenario that tests knowledge of D&D conditions. The scenario should:
1. Reference a specific spell or ability this character has
2. Ask about the condition it applies or interacts with
3. Test mechanical knowledge (what the condition actually does in play)

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "scenario": "A vivid 1-2 sentence scenario using one of the character's actual spells/abilities",
  "question": "The specific question about conditions",
  "correctAnswer": "The correct condition or mechanical effect",
  "distractors": ["Wrong answer 1", "Wrong answer 2", "Wrong answer 3"],
  "explanation": "2-3 sentence explanation of why this is correct, including the full mechanical effect of the condition in D&D 2024 rules"
}`,

  accentPhraseGenerator: (char: Character, accentName: string, accentRules: string, campaign?: CampaignData | null) => `${BASE_PROMPT}

You generate in-character practice phrases for accent training.

${characterContext(char, campaign)}

TARGET ACCENT: ${accentName}

ACCENT RULES TO EXERCISE:
${accentRules}

Generate 5 practice phrases that:
1. Are written in-character for ${char.name} (a level ${char.level} ${char.race} ${char.class})
2. Exercise the specific accent rules listed above (each phrase should use at least 2 rules)
3. Are appropriate for D&D fantasy settings
4. Vary in length from short (5-8 words) to medium (12-18 words)
5. Include words that specifically test the accent's phonetic patterns

Respond with ONLY valid JSON (no markdown, no code fences):
{ "phrases": ["phrase 1", "phrase 2", "phrase 3", "phrase 4", "phrase 5"] }`,

  voiceForge: (char: Character) => `${BASE_PROMPT}

You are a voice characterization expert helping a Dungeon Master create NPC voices.

${characterContext(char)}

Given a detailed voice description with parameters, generate:
1. A vivid 2-3 sentence summary of what this voice sounds like in practice (how a listener would experience it)
2. 5 in-character dialogue lines that demonstrate this voice's unique qualities

The dialogue lines should:
- Be appropriate for a D&D fantasy setting
- Vary in length (short quips to longer statements)
- Exercise the voice's distinctive qualities (speed, gravel, warmth, etc.)
- Feel like lines an NPC would actually say at a game table
- Match the specified vocabulary level and sentence structure

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "description": "A vivid summary of what this voice sounds like",
  "lines": ["line 1", "line 2", "line 3", "line 4", "line 5"]
}`,

  phraseBreakdown: (accentName: string, accentRules: string, eyeDialectExamples: string) => `You are an elite Hollywood dialect coach — the kind who trains actors for Oscar-winning roles. You break down phrases into pronunciation guides that anyone can follow.

ACCENT: ${accentName}

ACCENT RULES:
${accentRules}

EYE DIALECT EXAMPLES (how this accent spells words phonetically):
${eyeDialectExamples}

Given a phrase, produce a detailed pronunciation coaching breakdown:

1. **Full Accented Version** — Rewrite the entire phrase in eye dialect (phonetic spelling that shows how it sounds in this accent)
2. **Word-by-Word Breakdown** — For each word that changes:
   - Original word
   - Accented pronunciation (eye dialect spelling)
   - Mouth instruction (what your mouth/tongue/jaw does — e.g., "drop your jaw", "tongue touches back of top teeth", "lips rounded")
   - Which accent rule applies
3. **Rhythm Coaching** — Where to stress, where to pause, where to speed up. Use CAPS for stress and ... for pauses.
4. **Common Mistake** — One thing people get wrong with this phrase in this accent

Be specific about mouth mechanics. Think of yourself coaching an actor through a take — not explaining linguistics, but directing physical performance.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "accentedPhrase": "the full phrase rewritten in eye dialect",
  "words": [
    {
      "original": "the",
      "accented": "thuh",
      "mouth": "Tongue between teeth, quick and light",
      "rule": "Soften articles"
    }
  ],
  "rhythm": "Stress pattern with CAPS and pauses marked with ...",
  "commonMistake": "One specific thing to watch for"
}`,

  accentTranslator: (accentName: string, accentRules: string, eyeDialectExamples: string) => `You are an elite dialect coach who translates any text into a specific accent's phonetic spelling (eye dialect). You show EXACTLY how to say the words.

ACCENT: ${accentName}

ACCENT RULES:
${accentRules}

EYE DIALECT REFERENCE:
${eyeDialectExamples}

Given any input text, translate it into this accent:

1. **Accented Text** — The full text rewritten in eye dialect. Every word that changes should be respelled phonetically. Words that don't change stay as-is.
2. **Key Shifts** — List the 3-5 most important sound changes you applied, with the rule name
3. **Performance Note** — One sentence of coaching on how to deliver this text in the accent (rhythm, energy, attitude)

Be generous with the eye dialect — show EVERY sound shift, not just the obvious ones. The goal is: if someone reads the accented text aloud exactly as spelled, they sound like the accent.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "accentedText": "the full translated text in eye dialect",
  "keyShifts": [
    { "from": "original sound", "to": "accented sound", "rule": "rule name" }
  ],
  "performanceNote": "One-line delivery coaching"
}`,

  accentScenePartner: (char: Character, accentName: string, accentRules: string, scenario: string, previousExchanges: { npc: string; player: string }[], campaign?: CampaignData | null) => {
    const history = previousExchanges.length > 0
      ? `\n\nCONVERSATION SO FAR:\n${previousExchanges.map((ex, i) => `  ${i + 1}. NPC: "${ex.npc}"\n     Player: "${ex.player}"`).join('\n')}`
      : ''

    return `${BASE_PROMPT}

You are SIMULTANEOUSLY an NPC in a D&D scene AND a Hollywood dialect coach evaluating accent performance.

${characterContext(char, campaign)}

ACCENT BEING PRACTICED: ${accentName}
ACCENT RULES:
${accentRules}

SCENARIO: ${scenario}
${history}

YOUR DUAL ROLE:
1. **As NPC**: Play a memorable character in this scene. Give them personality, attitude, and a distinct voice. Keep your lines to 1-3 sentences. Create moments that FORCE the player to respond with emotion (anger, pleading, humor) — because maintaining an accent under emotional pressure is the real test.

2. **As Dialect Coach**: After the player responds, evaluate their text for accent consistency. Look for:
   - Did they use the accent's key sound shifts?
   - Did they maintain the accent's rhythm and cadence?
   - Did emotional moments cause accent "slippage"?
   - Specific words they could have accented more

${previousExchanges.length === 0 ? `This is the START. Set the scene vividly (1-2 sentences) and deliver your NPC's opening line.

Respond with ONLY valid JSON:
{
  "npcName": "A fitting name",
  "sceneSetting": "1-2 sentence scene description",
  "npcLine": "Your opening dialogue",
  "coaching": null
}` : `The player just responded. Continue the scene and coach their accent work.

Respond with ONLY valid JSON:
{
  "npcLine": "Your next line of dialogue",
  "coaching": {
    "accentScore": 4,
    "whatWorked": "Specific accent elements they nailed",
    "whatToFix": "Specific words or sounds they missed",
    "rewrite": "Their line rewritten with better accent application"
  }
}`}`
  },

  sessionAssist: (char: Character, campaign?: CampaignData | null, sceneContext?: string) => `${BASE_PROMPT}

You are an at-the-table roleplay assistant for this character:
${characterContext(char, campaign)}

${sceneContext ? `CURRENT SCENE CONTEXT: ${sceneContext}` : ''}

This is for AT-THE-TABLE use during an active D&D session. Keep everything SHORT and SCANNABLE — the player needs to glance and go.

Use the character's ACTUAL persona traits, backstory, relationships, fears, wants, physical tics, voice, and catchphrases. Reference party members by name. Dialogue must sound like THIS character — not generic fantasy.

Given any scene description or "What would I say?" prompt, respond with ONLY valid JSON:
{
  "sayOptions": ["2-3 short in-character dialogue options"],
  "doAction": "A brief physical action/reaction suggestion using the character's defined tics and instincts",
  "innerThought": "A one-sentence inner monologue referencing backstory, fears, or unresolved threads"
}`,

  comboSuggester: (char: Character, existingBlocks: ComboBlock[], campaign?: CampaignData | null) => {
    const blocksDesc = existingBlocks.length > 0
      ? `\n\nCURRENT COMBO BLOCKS:\n${existingBlocks.map((b, i) => `  ${i + 1}. [${b.type.toUpperCase()}] ${b.label}${b.notes ? ` — ${b.notes}` : ''}`).join('\n')}`
      : '\n\nNo blocks added yet — suggest a complete combo from scratch.'

    return `${BASE_PROMPT}

You are a combat combo architect for this character:
${characterContext(char, campaign)}
${blocksDesc}

Design 2-3 action combos using this character's actual spells, weapons, and features. Each combo should be a sequence of blocks using the D&D 2024 action economy.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "suggestions": [
    {
      "name": "Nova Round",
      "description": "Maximum single-target burst damage in one turn",
      "blocks": [
        { "type": "bonus", "label": "Hex (1st level)", "source": "spell", "sourceName": "Hex", "notes": "Apply to primary target first" },
        { "type": "action", "label": "Eldritch Blast (2 beams)", "source": "feature", "sourceName": "Eldritch Blast", "notes": "Each beam adds Hex damage" }
      ],
      "tags": ["burst", "single-target"],
      "category": "burst"
    }
  ]
}`
  },

  tacticSuggester: (char: Character, campaign?: CampaignData | null) => `${BASE_PROMPT}

You are a tactical advisor creating situational playbooks for this character:
${characterContext(char, campaign)}

Generate 2-3 tactical playbooks — conditional plans for common combat situations.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "suggestions": [
    {
      "name": "Cornered — Low HP Protocol",
      "trigger": "When HP drops below 25%",
      "actions": [
        "Disengage (Action) — break melee contact",
        "Move full speed toward nearest cover or ally",
        "If Healing Word available, cast on self (Bonus Action)"
      ],
      "priority": "critical",
      "tags": ["survival", "emergency"],
      "requirements": ["HP below 25%"],
      "category": "survival"
    }
  ]
}`,

  personaPlaySuggester: (char: Character, campaign?: CampaignData | null) => `${BASE_PROMPT}

You are a social strategist creating roleplay playbooks for this character:
${characterContext(char, campaign)}

${char.persona ? `PERSONA:
Default State: ${char.persona.defaultState}
Decision Tree: ${char.persona.decisionTree}
${char.persona.voiceNotes ? `Voice: ${char.persona.voiceNotes}` : ''}` : ''}

Generate 2-3 social strategy plays for common roleplay situations.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "suggestions": [
    {
      "name": "The Pious Deflection",
      "situation": "When accused of wrongdoing",
      "approach": "Appeal to divine authority and redirect focus",
      "keyPhrases": ["My actions serve a purpose beyond what mortal eyes can see."],
      "skillCheck": "Persuasion",
      "tags": ["social", "defense"]
    }
  ]
}`,

  tacticDiagram: (tacticDescription: string) => `You are a tactical diagram generator for D&D combat scenarios.

Given this tactic description, generate a simplified battlefield diagram as JSON data.

TACTIC: ${tacticDescription}

Position entities on a 0-100 coordinate grid where (0,0) is top-left and (100,100) is bottom-right.

Rules:
- Use "player" role for the main character
- Use "ally" role for friendly NPCs/party members
- Use "enemy" role for hostile creatures
- Use "objective" for terrain features, cover, or goals
- Arrow styles: "move" for movement, "attack" for melee, "spell" for ranged/magic, "aoe" for area effects
- Keep diagrams simple: 3-7 nodes, 1-4 arrows
- Position nodes with clear spacing (at least 15 units apart)

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "nodes": [
    { "id": "p", "x": 50, "y": 70, "role": "player", "label": "You" },
    { "id": "e1", "x": 50, "y": 30, "role": "enemy", "label": "E1" }
  ],
  "arrows": [
    { "from": "p", "to": "e1", "style": "attack", "label": "Charge" }
  ],
  "labels": [
    { "x": 50, "y": 90, "text": "Brief tactical note" }
  ]
}`,

  rpHookGenerator: (char: Character, campaign?: CampaignData | null, sceneContext?: string) => `${BASE_PROMPT}

You are an expert D&D 5e roleplay coach specializing in collaborative storytelling. You create prompts that enhance roleplay without stealing the spotlight from other players.

CHARACTER:
${characterContext(char, campaign)}

FULL PERSONA:
${char.persona ? `Default State: ${char.persona.defaultState}
Core Traits: ${(char.persona.coreTraits ?? []).map(t => t.text).join(', ')}
Wants: ${(char.persona.wants ?? []).join(', ')}
Fears: ${(char.persona.fears ?? []).join(', ')}
Physical Tics: ${(char.persona.physicalTics ?? []).join(', ')}` : 'No persona data.'}

${char.backstory ? `BACKSTORY:
Key Memories: ${char.backstory.keyMemories.map(m => m.title).join(', ')}
Relationships: ${char.backstory.relationships.map(r => `${r.name} (${r.relation})`).join(', ')}
Unresolved Threads: ${char.backstory.unresolvedThreads.join(', ')}` : ''}

${sceneContext ? `CURRENT SCENE CONTEXT: ${sceneContext}` : ''}

Generate 8 roleplay hooks for this character in the current scene context. Each hook should be a short, actionable prompt the player can use immediately at the table.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "hooks": [
    {
      "category": "ask",
      "text": "The hook text here",
      "targetPartyMember": "Optional party member name"
    }
  ]
}

Categories (distribute 1-2 per category):
- "ask": Questions that invite other players to roleplay ("yes, and..." prompts)
- "observe": In-character physical/emotional beats the player can perform
- "connect": Party-directed conversation starters referencing specific members by name
- "offer": Generous, spotlight-sharing actions driven by character traits
- "muse": Internal monologue moments that others at the table can notice

Rules:
- NEVER steal the spotlight from other players
- Use the character's ACTUAL traits, relationships, backstory — not generic prompts
- Match the scene context tone (combat hooks differ from social hooks)
- "ask" hooks should be genuine questions that invite others to RP
- "observe" hooks should be in-character physical/emotional beats
- "connect" hooks MUST reference specific party members by name
- "offer" hooks should be generous, character-driven actions
- "muse" hooks should be internal moments that others can notice
- Keep each hook under 120 characters`,

  rpHookForPartyMember: (char: Character, member: PartyMember, campaign?: CampaignData | null, sceneContext?: string) => `${BASE_PROMPT}

You are an expert D&D 5e roleplay coach. Generate hooks specifically about engaging ONE party member.

CHARACTER:
${characterContext(char, campaign)}

TARGET PARTY MEMBER:
Name: ${member.name}
Class: ${member.class}
Race: ${member.race}
Personality: ${member.personality}
Relationship to PC: ${member.relationshipToPC}

${sceneContext ? `CURRENT SCENE CONTEXT: ${sceneContext}` : ''}

Generate 6 roleplay hooks specifically about interacting with ${member.name}. Every hook should involve ${member.name} directly — asking them something, reacting to them, connecting over shared experiences, or doing something for them.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "hooks": [
    {
      "category": "ask",
      "text": "The hook text here",
      "targetPartyMember": "${member.name}"
    }
  ]
}

Categories (aim for variety):
- "ask": Questions directed at ${member.name}
- "observe": Notice something about ${member.name}'s behavior or state
- "connect": Share something personal with ${member.name}
- "offer": Do something helpful for ${member.name}
- "muse": Reflect internally on your relationship with ${member.name}

Rules:
- Every hook MUST involve ${member.name} by name
- Use their personality ("${member.personality}") to make hooks specific
- Reference the relationship ("${member.relationshipToPC}") where natural
- Keep each hook under 120 characters
- Make hooks feel like genuine moments, not generic prompts`,

  rpHookForParty: (char: Character, campaign: CampaignData, sceneType: string, sceneContext?: string) => `${BASE_PROMPT}

You are an expert D&D 5e roleplay coach. Generate hooks for group engagement during a specific scene type.

CHARACTER:
${characterContext(char, campaign)}

PARTY MEMBERS:
${campaign.partyMembers.map(pm => `- ${pm.name} (${pm.class}, ${pm.race}) — ${pm.personality}`).join('\n')}

SCENE TYPE: ${sceneType}
${sceneContext ? `ADDITIONAL CONTEXT: ${sceneContext}` : ''}

Generate 6 roleplay hooks for a "${sceneType}" scene involving the whole party. These should be moments that draw multiple party members into interaction.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "hooks": [
    {
      "category": "connect",
      "text": "The hook text here"
    }
  ]
}

Categories (aim for variety):
- "ask": Questions to the group or that invite group discussion
- "observe": Notice something about the group dynamic
- "connect": Shared group moments (toasts, confessions, plans)
- "offer": Do something for the whole party
- "muse": Reflect on what this group means to you

Rules:
- Hooks should feel natural for a "${sceneType}" scene
- Reference at least 2 different party members across the 6 hooks
- Keep each hook under 120 characters
- Focus on moments that create group interaction, not solo spotlight`,

  rpHookForNPC: (char: Character, npc: CampaignNPC, campaign?: CampaignData | null, sceneContext?: string) => `${BASE_PROMPT}

You are an expert D&D 5e roleplay coach. Generate hooks about engaging a specific NPC.

CHARACTER:
${characterContext(char, campaign)}

TARGET NPC:
Name: ${npc.name}
Role: ${npc.role}
Notes: ${npc.notes}

${sceneContext ? `CURRENT SCENE CONTEXT: ${sceneContext}` : ''}

Generate 6 roleplay hooks specifically about interacting with the NPC "${npc.name}" (${npc.role}). Every hook should involve this NPC directly.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "hooks": [
    {
      "category": "ask",
      "text": "The hook text here"
    }
  ]
}

Categories (aim for variety):
- "ask": Questions to ask ${npc.name} or about them
- "observe": Notice something about ${npc.name}
- "connect": Find common ground with ${npc.name}
- "offer": Propose something to ${npc.name}
- "muse": Reflect on what ${npc.name} represents or means

Rules:
- Every hook MUST involve ${npc.name}
- Use their role ("${npc.role}") and notes to make hooks specific
- Keep each hook under 120 characters
- Make hooks feel like genuine in-world moments`,
}
