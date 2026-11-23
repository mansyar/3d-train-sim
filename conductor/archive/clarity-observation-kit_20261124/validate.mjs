import { readFileSync } from 'node:fs'

const read = (url) => readFileSync(new URL(url, import.meta.url), 'utf8')

const card = read('./quick-card.md')
const log = read('./session-log.md')
const comparison = read('../../archive/clarity-audit_20261110/comparison.md')

const errors = []

const requireAll = (label, text, phrases) => {
  const haystack = text.toLowerCase()
  for (const phrase of phrases) {
    if (!haystack.includes(phrase.toLowerCase())) {
      errors.push(`${label}: missing required phrase "${phrase}"`)
    }
  }
}

requireAll('quick-card.md', card, [
  '# Clarity Quick Card',
  '20:00',
  'opened or the device wakes',
  'first self-directed ride',
  'first self-directed placement',
  'disengages from the app or an adult gives help',
  'Sibling interruption',
  'Device fails',
  'No ride within the cap',
  'Observers disagree',
  'iPad Safari',
  'Android Chrome',
  'human-only',
  'not measured',
  'no names',
  'no photos',
  'no video',
  'no audio',
])

requireAll('session-log.md', log, [
  '# Clarity Session Log',
  'Child 1',
  'Child 2',
  'Child 3',
  'not measured',
  'affected-child count then severity',
  'no names',
  'no photos',
  'no video',
  'no audio',
  'consent is withdrawn',
  'protocol.md',
  'report.md',
  'comparison.md',
  'product.md',
])

const forbidden = [
  [/3\/3/i, 'three-of-three child claim'],
  [/three of three/i, 'three-of-three child claim'],
  [/ship gate (is )?(met|passed|complete)/i, 'ship-gate claim'],
  [/clarity (score|value) is \d/i, 'invented clarity value'],
]

for (const [name, text] of [['quick-card.md', card], ['session-log.md', log]]) {
  for (const [pattern, label] of forbidden) {
    if (pattern.test(text)) errors.push(`${name}: forbidden ${label}`)
  }
}

const resultRows = log.split(/\r?\n/).filter((line) => /^\|\s*Child\s+[123]\s*\|/.test(line))
if (resultRows.length !== 3) errors.push(`session-log.md: expected 3 child result rows, found ${resultRows.length}`)

for (const row of resultRows) {
  const cells = row.split('|').slice(2, -1).map((cell) => cell.trim())
  for (const cell of cells) {
    if (/\d/.test(cell)) errors.push(`session-log.md: numeric value in result cell "${cell}"`)
  }
}

const resultCells = (log.match(/\|\s*not measured\s*\|/g) ?? []).length
if (resultCells < 12) errors.push(`session-log.md: expected at least 12 not-measured result cells, found ${resultCells}`)

const awaiting = (comparison.match(/awaiting observation/g) ?? []).length
if (awaiting < 8) errors.push(`comparison.md: expected at least 8 awaiting-observation cells, found ${awaiting}`)
if (comparison.includes('v0.15.0')) errors.push('comparison.md: stale v0.15.0 baseline label')

if (errors.length > 0) {
  console.error('VALIDATOR FAIL')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('VALIDATOR PASS')
console.log('quick-card.md: required flow, clocks, cap, interruption and human-only prompts present')
console.log('session-log.md: anonymous rows, not-measured cells, friction ranking and privacy rules present')
console.log('comparison.md: 8 awaiting-observation cells preserved, no v0.15.0 label')
