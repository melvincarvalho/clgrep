import fs from 'fs'
import path from 'path'
import os from 'os'
import readline from 'readline'

const CLAUDE_DIR = path.join(os.homedir(), '.claude')

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

function formatTimestamp(ts) {
  if (!ts) return '?'
  const date = typeof ts === 'number' ? new Date(ts) : new Date(ts)
  return date.toISOString().replace('T', ' ').slice(0, 16)
}

function truncate(str, len = 200) {
  if (!str) return ''
  str = str.replace(/\n/g, ' ').replace(/\s+/g, ' ')
  return str.length > len ? str.slice(0, len) + '...' : str
}

function highlight(text, query) {
  const regex = new RegExp(`(${query})`, 'gi')
  return text.replace(regex, `${c.yellow}${c.bold}$1${c.reset}`)
}

async function searchFile(filePath, query, results) {
  const lowerQuery = query.toLowerCase()

  return new Promise((resolve) => {
    const stream = fs.createReadStream(filePath)
    const rl = readline.createInterface({ input: stream })

    rl.on('line', (line) => {
      if (line.toLowerCase().includes(lowerQuery)) {
        try {
          const obj = JSON.parse(line)
          results.push({ file: filePath, data: obj })
        } catch {
          // Skip malformed lines
        }
      }
    })

    rl.on('close', resolve)
    rl.on('error', resolve)
  })
}

async function findJsonlFiles(dir) {
  const files = []

  async function walk(currentDir) {
    let entries
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true })
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

export async function searchHistory(query) {
  console.log(`${c.bold}${c.cyan}Searching for:${c.reset} "${c.yellow}${query}${c.reset}"\n`)

  // Search main history file
  const historyFile = path.join(CLAUDE_DIR, 'history.jsonl')
  const historyResults = []

  if (fs.existsSync(historyFile)) {
    await searchFile(historyFile, query, historyResults)
  }

  if (historyResults.length > 0) {
    console.log(`${c.bold}${c.green}═══ Your Prompts ═══${c.reset}\n`)
    for (const r of historyResults) {
      const d = r.data
      const time = formatTimestamp(d.timestamp)
      const project = d.project || '?'

      console.log(`${c.cyan}[${time}]${c.reset}`)
      console.log(`${c.dim}  dir:${c.reset} ${c.blue}${project}${c.reset}`)
      console.log(`${c.dim}  msg:${c.reset} ${highlight(truncate(d.display), query)}`)
      console.log('')
    }
  }

  // Search project conversations
  const projectsDir = path.join(CLAUDE_DIR, 'projects')
  const conversationResults = []

  if (fs.existsSync(projectsDir)) {
    const jsonlFiles = await findJsonlFiles(projectsDir)

    for (const file of jsonlFiles) {
      await searchFile(file, query, conversationResults)
    }
  }

  if (conversationResults.length > 0) {
    console.log(`${c.bold}${c.magenta}═══ Conversations ═══${c.reset}\n`)

    // Group by file
    const byFile = {}
    for (const r of conversationResults) {
      if (!byFile[r.file]) byFile[r.file] = []
      byFile[r.file].push(r.data)
    }

    for (const [file, entries] of Object.entries(byFile)) {
      // Extract project path from the file path
      const relPath = file.replace(CLAUDE_DIR + '/projects/', '')
      const sessionFile = path.basename(file)

      // First entry often has cwd
      const cwd = entries[0]?.cwd || '?'
      const sessionId = entries[0]?.sessionId || sessionFile.replace('.jsonl', '')

      console.log(`${c.bold}${c.blue}───────────────────────────────────────${c.reset}`)
      console.log(`${c.dim}session:${c.reset} ${c.cyan}${sessionId}${c.reset}`)
      console.log(`${c.dim}    cwd:${c.reset} ${c.blue}${cwd}${c.reset}`)
      console.log(`${c.dim}   file:${c.reset} ${c.gray}${relPath}${c.reset}`)
      console.log('')

      for (const entry of entries.slice(0, 10)) {
        const time = formatTimestamp(entry.timestamp)
        const type = entry.type || '?'
        const content = entry.content || entry.display || ''

        // Color code by type
        let typeColor = c.gray
        if (type === 'user') typeColor = c.green
        else if (type === 'assistant') typeColor = c.cyan
        else if (type === 'system') typeColor = c.yellow

        console.log(`  ${c.dim}[${time}]${c.reset} ${typeColor}(${type})${c.reset}`)
        console.log(`    ${highlight(truncate(content, 150), query)}`)
      }

      if (entries.length > 10) {
        console.log(`${c.dim}  ... and ${entries.length - 10} more matches${c.reset}`)
      }
      console.log('')
    }
  }

  const total = historyResults.length + conversationResults.length
  console.log(`${c.bold}${c.green}Found ${total} matches${c.reset}`)
}
