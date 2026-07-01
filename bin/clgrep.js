#!/usr/bin/env node

import { createRequire } from 'module'
import { searchHistory } from '../index.js'

const pkg = createRequire(import.meta.url)('../package.json')

const HELP = `Usage: clgrep [options] <search-term...>

Search through Claude Code conversation history in ~/.claude

Options:
  -s, --case-sensitive   Match case exactly (default: case-insensitive)
  -h, --help             Show this help
  -V, --version          Show version

Exit codes:
  0  matches found
  1  no matches
  2  usage or runtime error`

let caseSensitive = false
const terms = []

for (const arg of process.argv.slice(2)) {
  if (arg === '-h' || arg === '--help') {
    console.log(HELP)
    process.exit(0)
  } else if (arg === '-V' || arg === '--version') {
    console.log(pkg.version)
    process.exit(0)
  } else if (arg === '-s' || arg === '--case-sensitive') {
    caseSensitive = true
  } else {
    terms.push(arg)
  }
}

const query = terms.join(' ')

if (!query) {
  console.error(HELP)
  process.exit(2)
}

const options = { caseSensitive }
if (process.env.CLGREP_CLAUDE_DIR) options.claudeDir = process.env.CLGREP_CLAUDE_DIR

try {
  const total = await searchHistory(query, options)
  process.exit(total > 0 ? 0 : 1)
} catch (err) {
  console.error(`clgrep: ${err.message}`)
  process.exit(2)
}
