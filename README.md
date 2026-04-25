<div align="center">

# ◌ pi-glance

**A calm input surface for [pi](https://github.com/badlogic/pi-mono)**

A rounded multiline editor with a quiet inline glance for model, context, tokens, cost, and git branch.

[![license](https://img.shields.io/badge/license-MIT-64748b?style=flat-square)](LICENSE)
[![pi package](https://img.shields.io/badge/pi-package-7c3aed?style=flat-square)](https://github.com/badlogic/pi-mono)

</div>

---

## Preview

> Demo GIF coming soon.

```text
╭─ pi-glance ───────────────────── 󰚩 Sonnet 4 high · 󰔟 23% · 󰄨 ↑12.4k ↓3.1k ·  main ──────╮
│ Ask pi to improve the input surface...                                                   │
│                                                                                          │
│                                                                                          │
│                                                                                          │
╰──────────────────────────────────────────────────────────────────────────────────────────╯
```

## Install

```bash
pi install npm:pi-glance
```

Or try it locally:

```bash
pi -e ./src/index.ts
```

## Use

Open the configuration pane:

```text
/glance
```

That's the only command.

## What it does

- Replaces pi's default prompt area with a rounded multiline input surface
- Keeps pi's default editor behavior, keybindings, autocomplete, paste, and slash commands
- Shows the current project folder as the top-left title
- Shows inline status on the top-right border:
  - model + thinking level
  - context usage
  - token usage
  - session cost
  - git branch
- Uses a global config file:

```text
~/.pi/agent/pi-glance/config.json
```

## Configuration

Inside `/glance`:

| Key | Action |
|:---:|--------|
| `Tab` | Switch section |
| `↑` `↓` | Navigate |
| `Enter` / `Space` | Toggle or cycle |
| `J` / `K` | Move segment down / up |
| `S` | Save |
| `R` | Reset draft |
| `Esc` / `Q` | Cancel |

Configurable items are intentionally small:

- Enable / disable pi-glance
- Light / dark theme
- Nerd / plain icons
- Min rows: `2`, `3`, or `4`
- Provider display mode
- Segment order and visibility

## Design notes

pi-glance is deliberately simple:

- no pi core patches
- no private API access
- no render-time shell commands
- no render-time file or network work
- one user-facing command: `/glance`

It uses public pi extension APIs:

- `ctx.ui.setEditorComponent()` for the input surface
- `CustomEditor` to preserve default editor behavior
- `ctx.ui.setFooter()` as a hidden bridge for public footer data
- `ctx.ui.custom()` for the config pane

## Development

```bash
npm run check
pi --no-extensions --model <provider/model> -e ./src/index.ts --mode json -p "Say ok"
```

Dry-run npm package contents:

```bash
npm run pack:dry
```

## License

[MIT](LICENSE) © 2026 linys77
