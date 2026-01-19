# clgrep

**"Wait, didn't I already solve this with Claude?"**

Search your entire Claude Code history instantly. Find that mass prompt, solution, or conversation you know you had somewhere.

```bash
npm install -g clgrep
```

## The Problem

You've been using Claude Code for weeks. You *know* you solved a similar problem before. You *know* you had a great conversation about webpack configs, or that regex pattern, or that API design. But where?

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
   file: projects/-home-user-myproject/a1b2c3d4.jsonl

  [2024-12-15 14:32] (user)
    how do I configure webpack to handle SVG imports...
  [2024-12-15 14:32] (assistant)
    You'll need to add a rule to your webpack config...

Found 42 matches
```

## Features

- **Instant search** across all your Claude Code conversations
- **Zero dependencies** - just Node.js builtins
- **Color-coded output** - timestamps, roles, and matches highlighted
- **Full context** - see the project directory, session ID, and timestamps
- **Finds both** your prompts AND Claude's responses

## Install

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

# Find that regex you wrote
clgrep "regex"

# Find conversations in a specific project
clgrep "myproject"

# Case-insensitive by default
clgrep "React"
```

## How It Works

Claude Code stores your conversation history in `~/.claude/`:

- `history.jsonl` - Your prompt history
- `projects/*//*.jsonl` - Full conversation logs per session

`clgrep` searches through all of these files and presents results with full context.

## Requirements

- Node.js >= 14
- Claude Code (obviously)

## Why "clgrep"?

`cl` (Claude) + `grep` (the OG search tool) = `clgrep`

## License

AGPL-3.0

---

**Pro tip:** Alias it in your shell:

```bash
alias cg="clgrep"
```

Then just: `cg "that thing I asked about"`

---

Made for developers who talk to Claude more than their coworkers.
