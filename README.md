<div align="center">
  <h1>clgrep</h1>
  <p><strong>Search through your Claude Code conversation history</strong></p>

  ![License](https://img.shields.io/github/license/melvincarvalho/clgrep?style=flat-square)
  ![Version](https://img.shields.io/github/package-json/v/melvincarvalho/clgrep?style=flat-square)
  ![Node](https://img.shields.io/badge/node-%3E%3D18-green?style=flat-square)
  ![GitHub Stars](https://img.shields.io/github/stars/melvincarvalho/clgrep?style=flat-square)
  ![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)

</div>

---

**"Wait, didn't I already solve this with Claude?"**

Search your entire Claude Code history instantly. Find that prompt, solution, or conversation you know you had somewhere.

## Quick Start

```bash
npm install -g clgrep
clgrep "webpack"
```

## The Problem

You've been using Claude Code for weeks. You *know* you solved a similar problem before. But where?

Your `~/.claude` folder has hundreds of conversation files. Good luck finding anything.

## The Solution

```bash
clgrep "webpack"
```

```
═══ Your Prompts ═══

[2024-12-15 14:32]
  dir: /home/user/myproject
  msg: how do I configure webpack to handle SVG imports...

═══ Conversations ═══

───────────────────────────────────────
session: a1b2c3d4-e5f6-7890
    cwd: /home/user/myproject

  [2024-12-15 14:32] (user)
    how do I configure webpack to handle SVG imports...
  [2024-12-15 14:32] (assistant)
    You'll need to add a rule to your webpack config...

Found 42 matches
```

## Features

- **Instant search** - Scans all Claude Code conversations
- **Zero dependencies** - Just Node.js builtins
- **Color-coded output** - Timestamps, roles, and matches highlighted
- **Full context** - Project directory, session ID, timestamps
- **Comprehensive** - Searches both your prompts AND Claude's responses
- **Signal, not noise** - Matches actual message text, not raw JSON, tool output, or file snapshots
- **Newest at the bottom** - Most recent prompts and sessions right above your cursor

## Installation

```bash
npm install -g clgrep
```

Or run directly:

```bash
npx clgrep "your search term"
```

## Usage

```bash
# Find all conversations about authentication
clgrep "auth"

# Multi-word queries work with or without quotes
clgrep webpack svg imports

# Case-sensitive matching
clgrep -s "MyClass"

# Help and version
clgrep --help
clgrep --version
```

Exit codes follow grep conventions: `0` when matches are found, `1` when none, `2` on usage or runtime errors.

## How It Works

Claude Code stores conversation history in `~/.claude/`:

| File | Contains |
|------|----------|
| `history.jsonl` | Your prompt history |
| `projects/*/*.jsonl` | Full conversation logs per session |

`clgrep` searches through all of these and presents results with full context.

## Requirements

- Node.js >= 18
- Claude Code installed

## Pro Tip

Add an alias to your shell:

```bash
alias cg="clgrep"
```

Then just: `cg "that thing I asked about"`

## Contributing

Contributions welcome! Feel free to open issues or submit PRs.

## License

AGPL-3.0 - see [LICENSE](LICENSE) for details.

---

<div align="center">
  <p>Made for developers who talk to Claude more than their coworkers.</p>
</div>
