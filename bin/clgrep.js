#!/usr/bin/env node

import { searchHistory } from '../index.js'

const query = process.argv[2]

if (!query) {
  console.error('Usage: clgrep <search-term>')
  console.error('')
  console.error('Search through Claude Code conversation history')
  process.exit(1)
}

searchHistory(query)
