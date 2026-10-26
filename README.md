# Pretty Punctuation

An Obsidian plugin that shows smart punctuation without changing your files. Type `--` and the file keeps `--`, but Obsidian shows `–`.

Plugins like [Smart Typography](https://github.com/mgmeyers/obsidian-smart-typography) rewrite characters as you type. That changes the file, which breaks plain-text conventions, search, and anything else that reads the markdown. Pretty Punctuation only changes what's displayed.

## What it shows

| You type | You see |
| --- | --- |
| `--` | – |
| `---` | — |
| `...` | … |
| `->` `<-` `<->` `<=>` | → ← ↔ ⇔ |
| `"quotes"` `'quotes'` `it's` | “quotes” ‘quotes’ it’s |

- **Live Preview:** the line with the cursor or selection shows the raw characters so you can edit them. Source mode shows everything raw.
- **Reading view:** only the rendered text changes.
- **Left alone:** code blocks, inline code, frontmatter, links, URLs, HTML, math, comments, tags, horizontal rules, and table separator rows.

## Install

No build step. Copy `main.js` and `manifest.json` into `<vault>/.obsidian/plugins/pretty-punctuation/`, then enable **Pretty Punctuation** in Settings → Community plugins.

## Limitations

- Quote direction is guessed from the previous character, so a leading apostrophe (`'90s`) shows as ‘ instead of ’.
- Live Preview works one line at a time, so a quote that spans two lines can curl the wrong way.
- Skipping code and links relies on Obsidian's internal syntax names and some pattern matching, so an unusual case can slip through.
