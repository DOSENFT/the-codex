import { SPELLS } from '../../../src/canon'
const withAttack = SPELLS.filter(s => s.attackRoll)
console.log('spells with attackRoll:', withAttack.length)
for (const s of withAttack.slice(0, 8)) console.log(' ', s.name, '|', JSON.stringify(s.attackRoll))
const heals = SPELLS.filter(s => s.healing?.dice)
console.log('\nspells with healing.dice:', heals.length)
for (const s of heals) console.log(' ', s.name, '|', JSON.stringify(s.healing))
const sf = SPELLS.find(s => s.id === 'shield-of-faith')
console.log('\nShield of Faith:', JSON.stringify({attackRoll: sf?.attackRoll, damage: sf?.damage, healing: sf?.healing, save: sf?.save}))
