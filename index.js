import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import os from 'os'
import readline from 'readline'

const DEFAULT_CLAUDE_DIR = path.join(os.homedir(), '.claude')

// Transcript lines also include types like 'file-history-snapshot' and
// 'summary' that embed file contents or metadata, not conversation text.
const MESSAGE_TYPES = new Set(['user', 'assistant', 'system'])

const FILE_CONCURRENCY = 8

// ANSI color codes
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  // Colors
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
}

function toMillis(ts) {
  if (!ts) return 0
  const ms = new Date(ts).getTime()
  return Number.isNaN(ms) ? 0 : ms
}

function formatTimestamp(ts) {
  const ms = toMillis(ts)
  if (!ms) return '?'
  const date = new Date(ms)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function truncate(str, len = 200) {
  if (!str) return ''
  str = str.replace(/\n/g, ' ').replace(/\s+/g, ' ')
  return str.length > len ? str.slice(0, len) + '...' : str
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlight(text, query, caseSensitive) {
  const regex = new RegExp(`(${escapeRegex(query)})`, caseSensitive ? 'g' : 'gi')
  return text.replace(regex, `${c.yellow}${c.bold}$1${c.reset}`)
}

// Extract the human-readable text from a JSONL entry across schema variants:
// history.jsonl uses `display`, older transcripts a top-level `content`, and
// current transcripts `message.content` (a string or an array of blocks).
function extractText(entry) {
  if (typeof entry.display === 'string') return entry.display
  const content = entry.message?.content ?? entry.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join(' ')
  }
  return ''
}

async function searchFile(filePath, query, { caseSensitive = false } = {}) {
  const needle = caseSensitive ? query : query.toLowerCase()
  const results = []

  await new Promise((resolve) => {
    const stream = fs.createReadStream(filePath)
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

    rl.on('line', (line) => {
      // Cheap pre-filter on the raw line before paying for JSON.parse
      const rawHaystack = caseSensitive ? line : line.toLowerCase()
      if (!rawHaystack.includes(needle)) return

      let obj
      try {
        obj = JSON.parse(line)
      } catch {
        return // Skip malformed lines
      }

      if (obj.type && !MESSAGE_TYPES.has(obj.type)) return

      const text = extractText(obj)
      const textHaystack = caseSensitive ? text : text.toLowerCase()
      if (!textHaystack.includes(needle)) return

      results.push({ file: filePath, data: obj, text })
    })

    rl.on('close', resolve)
    stream.on('error', resolve)
  })

  return results
}

async function findJsonlFiles(dir) {
  const files = []

  async function walk(currentDir) {
    let entries
    try {
      entries = await fsp.readdir(currentDir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.name.endsWith('.jsonl')) {
        files.push(fullPath)
      }
    }
  }

  await walk(dir)
  return files
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker)
  await Promise.all(workers)
  return results
}

export async function searchHistory(query, options = {}) {
  const { claudeDir = DEFAULT_CLAUDE_DIR, caseSensitive = false } = options

  console.log(`${c.bold}${c.cyan}Searching for:${c.reset} "${c.yellow}${query}${c.reset}"\n`)

  // Search main history file
  const historyFile = path.join(claudeDir, 'history.jsonl')
  let historyResults = []

  if (fs.existsSync(historyFile)) {
    historyResults = await searchFile(historyFile, query, { caseSensitive })
  }

  // Oldest first so the newest results land at the bottom of the terminal
  historyResults.sort((a, b) => toMillis(a.data.timestamp) - toMillis(b.data.timestamp))

  if (historyResults.length > 0) {
    console.log(`${c.bold}${c.green}═══ Your Prompts ═══${c.reset}\n`)
    for (const r of historyResults) {
      const d = r.data
      const time = formatTimestamp(d.timestamp)
      const project = d.project || '?'

      console.log(`${c.cyan}[${time}]${c.reset}`)
      console.log(`${c.dim}  dir:${c.reset} ${c.blue}${project}${c.reset}`)
      console.log(`${c.dim}  msg:${c.reset} ${highlight(truncate(r.text), query, caseSensitive)}`)
      console.log('')
    }
  }

  // Search project conversations
  const projectsDir = path.join(claudeDir, 'projects')
  let conversationResults = []

  if (fs.existsSync(projectsDir)) {
    const jsonlFiles = await findJsonlFiles(projectsDir)
    const perFile = await mapWithConcurrency(jsonlFiles, FILE_CONCURRENCY, (file) =>
      searchFile(file, query, { caseSensitive })
    )
    conversationResults = perFile.flat()
  }

  if (conversationResults.length > 0) {
    console.log(`${c.bold}${c.magenta}═══ Conversations ═══${c.reset}\n`)

    // Group by file
    const byFile = new Map()
    for (const r of conversationResults) {
      if (!byFile.has(r.file)) byFile.set(r.file, [])
      byFile.get(r.file).push(r)
    }

    // Chronological within a session, newest sessions last (bottom of output)
    const sessions = [...byFile.entries()].map(([file, matches]) => {
      matches.sort((a, b) => toMillis(a.data.timestamp) - toMillis(b.data.timestamp))
      return { file, matches, latest: toMillis(matches[matches.length - 1].data.timestamp) }
    })
    sessions.sort((a, b) => a.latest - b.latest)

    for (const { file, matches } of sessions) {
      // Extract project path from the file path
      const relPath = file.replace(claudeDir + '/projects/', '')
      const sessionFile = path.basename(file)

      // First entry often has cwd
      const cwd = matches[0]?.data.cwd || '?'
      const sessionId = matches[0]?.data.sessionId || sessionFile.replace('.jsonl', '')

      console.log(`${c.bold}${c.blue}───────────────────────────────────────${c.reset}`)
      console.log(`${c.dim}session:${c.reset} ${c.cyan}${sessionId}${c.reset}`)
      console.log(`${c.dim}    cwd:${c.reset} ${c.blue}${cwd}${c.reset}`)
      console.log(`${c.dim}   file:${c.reset} ${c.gray}${relPath}${c.reset}`)
      console.log('')

      if (matches.length > 10) {
        console.log(`${c.dim}  ... ${matches.length - 10} earlier matches${c.reset}`)
      }

      for (const match of matches.slice(-10)) {
        const entry = match.data
        const time = formatTimestamp(entry.timestamp)
        const type = entry.type || '?'

        // Color code by type
        let typeColor = c.gray
        if (type === 'user') typeColor = c.green
        else if (type === 'assistant') typeColor = c.cyan
        else if (type === 'system') typeColor = c.yellow

        console.log(`  ${c.dim}[${time}]${c.reset} ${typeColor}(${type})${c.reset}`)
        console.log(`    ${highlight(truncate(match.text, 150), query, caseSensitive)}`)
      }

      console.log('')
    }
  }

  const total = historyResults.length + conversationResults.length
  console.log(`${c.bold}${c.green}Found ${total} matches${c.reset}`)
  return total
}
