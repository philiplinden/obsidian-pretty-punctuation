// Pretty Punctuation: shows smart typography in Live Preview and Reading view
// without ever changing the characters in the file.
const { Plugin, editorLivePreviewField } = require('obsidian');
const { ViewPlugin, Decoration, WidgetType } = require('@codemirror/view');
const { RangeSetBuilder } = require('@codemirror/state');
const { syntaxTree } = require('@codemirror/language');

// Order matters: longer patterns first.
const SYMBOLS = /<->|<=>|->|<-|---|--|\.\.\.|"|'/g;
const REPLACE = { '<->': '↔', '<=>': '⇔', '->': '→', '<-': '←', '---': '—', '--': '–', '...': '…' };
// Inline spans left alone: code, wikilinks, link targets, URLs, HTML tags/comments, tags.
const SKIP_SPANS = /`[^`]*`|\[\[[^\]]*\]\]|\]\([^)]*\)|[a-z][a-z0-9+.-]*:\/\/\S+|<!--.*?-->|<\/?[A-Za-z][^>\n]*>|(^|\s)#[^\s#]+/gi;
// Whole lines left alone: horizontal rules / frontmatter delimiters, table separators.
const SKIP_LINE = /^\s*([-*_]\s*){3,}$|^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-*:?\s*\|?\s*$/;
// Obsidian's syntax node names that mark code, frontmatter, links, HTML, math, comments, tags.
const SKIP_NODE = /code|frontmatter|url|link|html|math|comment|tag/;

function quote(ch, prev) {
	const opening = !prev || /[\s([{—–-]/.test(prev);
	if (ch === '"') return opening ? '“' : '”';
	return opening ? '‘' : '’';
}

// Returns [{from, to, text}] for one line of text. `prev` is the char before it.
function substitutions(text, prev = '') {
	if (SKIP_LINE.test(text)) return [];
	const skip = [];
	for (const m of text.matchAll(SKIP_SPANS)) skip.push([m.index, m.index + m[0].length]);
	const out = [];
	for (const m of text.matchAll(SYMBOLS)) {
		const from = m.index, to = from + m[0].length;
		if (skip.some(([a, b]) => from < b && to > a)) continue;
		const before = from > 0 ? text[from - 1] : prev;
		const sub = REPLACE[m[0]] ?? quote(m[0], before);
		out.push({ from, to, text: sub });
	}
	return out;
}

class CharWidget extends WidgetType {
	constructor(text) { super(); this.text = text; }
	eq(other) { return other.text === this.text; }
	toDOM() {
		const span = document.createElement('span');
		span.textContent = this.text;
		return span;
	}
	ignoreEvent() { return false; }
}

function buildDecorations(view) {
	const builder = new RangeSetBuilder();
	if (!view.state.field(editorLivePreviewField, false)) return builder.finish();
	const { doc, selection } = view.state;
	const activeLines = new Set();
	for (const r of selection.ranges) {
		for (let n = doc.lineAt(r.from).number; n <= doc.lineAt(r.to).number; n++) activeLines.add(n);
	}
	for (const { from, to } of view.visibleRanges) {
		const skip = [];
		syntaxTree(view.state).iterate({
			from, to,
			enter: (node) => { if (SKIP_NODE.test(node.name)) skip.push([node.from, node.to]); },
		});
		let pos = from;
		while (pos <= to) {
			const line = doc.lineAt(pos);
			if (!activeLines.has(line.number)) {
				const prev = line.from > 0 ? doc.sliceString(line.from - 1, line.from) : '';
				for (const s of substitutions(line.text, prev)) {
					const a = line.from + s.from, b = line.from + s.to;
					if (skip.some(([x, y]) => a < y && b > x)) continue;
					builder.add(a, b, Decoration.replace({ widget: new CharWidget(s.text) }));
				}
			}
			pos = line.to + 1;
		}
	}
	return builder.finish();
}

const livePreviewPlugin = ViewPlugin.fromClass(class {
	constructor(view) { this.decorations = buildDecorations(view); }
	update(u) {
		const modeChanged = u.startState.field(editorLivePreviewField, false) !== u.state.field(editorLivePreviewField, false);
		if (u.docChanged || u.viewportChanged || u.selectionSet || modeChanged) this.decorations = buildDecorations(u.view);
	}
}, { decorations: (v) => v.decorations });

function renderElement(el) {
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
		acceptNode: (node) => node.parentElement?.closest('code, pre, script, style, .math, .frontmatter, .frontmatter-container, a.external-link, a.internal-link, .tag')
			? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
	});
	let prev = '';
	const nodes = [];
	while (walker.nextNode()) nodes.push(walker.currentNode);
	for (const node of nodes) {
		const text = node.nodeValue;
		const subs = substitutions(text, prev);
		if (text.length) prev = text[text.length - 1];
		if (!subs.length) continue;
		let result = '', last = 0;
		for (const s of subs) { result += text.slice(last, s.from) + s.text; last = s.to; }
		node.nodeValue = result + text.slice(last);
	}
}

module.exports = class PrettyPunctuation extends Plugin {
	onload() {
		this.registerEditorExtension(livePreviewPlugin);
		this.registerMarkdownPostProcessor((el) => renderElement(el));
	}
};
