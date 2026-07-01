import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'path'
import { fileURLToPath } from 'url'
import { searchHistory } from '../index.js'

const claudeDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'claude-dir'
)

const stripAnsi = (str) => str.replace(/\x1b\[[0-9;]*m/g, '')

async function run(query, options = {}) {
  const lines = []
  const original = console.log
  console.log = (...args) => lines.push(args.join(' '))
  try {
    const total = await searchHistory(query, { claudeDir, ...options })
    return { total, output: stripAnsi(lines.join('\n')) }
  } finally {
    console.log = original
  }
}

test('finds matches in history.jsonl and conversations', async () => {
  const { total, output } = await run('webpack')
  assert.equal(total, 3)
  assert.match(output, /Your Prompts/)
  assert.match(output, /Conversations/)
  assert.match(output, /how do I configure webpack for svg imports/)
})

test('extracts text from string message.content', async () => {
  const { output } = await run('webpack')
  assert.match(output, /handle SVG imports/)
})

test('extracts text from message.content block arrays', async () => {
  const { output } = await run('svgr')
  assert.match(output, /Add a webpack rule using svgr/)
})

test('shows session metadata for conversation matches', async () => {
  const { output } = await run('webpack')
  assert.match(output, /session: abc123/)
  assert.match(output, /cwd: \/home\/user\/demo/)
})

test('ignores non-message entry types like file-history-snapshot', async () => {
  const { total } = await run('SNAPSHOT_ONLY_TOKEN')
  assert.equal(total, 0)
})

test('ignores matches that only appear in non-text blocks', async () => {
  // "webpack" appears in a thinking block on the databases line; only the
  // two real text matches plus one history prompt should count
  const { total } = await run('databases')
  assert.equal(total, 2)
})

test('regex metacharacters in the query do not crash', async () => {
  const { total, output } = await run('config(')
  assert.equal(total, 1)
  assert.match(output, /fix the config\( parser bug/)
})

test('search is case-insensitive by default', async () => {
  const { total } = await run('WEBPACK')
  assert.equal(total, 3)
})

test('case-sensitive option respects case', async () => {
  const { total } = await run('WEBPACK', { caseSensitive: true })
  assert.equal(total, 0)
})

test('newest results appear last', async () => {
  // "config" matches both "configure webpack..." (older) and
  // "fix the config( parser bug" (newer)
  const { output } = await run('config')
  const older = output.indexOf('how do I configure webpack')
  const newer = output.indexOf('fix the config( parser bug')
  assert.ok(older !== -1 && newer !== -1)
  assert.ok(older < newer, 'older prompt should print before newer prompt')
})

test('returns zero for no matches', async () => {
  const { total, output } = await run('zzz-no-such-term')
  assert.equal(total, 0)
  assert.match(output, /Found 0 matches/)
})
