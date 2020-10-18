import chalk from "chalk";
import { scan } from "../scanner";
import { Token, TokenType } from "../tokens";

class Highlighter {
	protected readonly source: string;
	protected readonly tokens: Token[];
	protected consumed = 0;
	output = "";
	protected cursor = 0;

	constructor(source: string) {
		this.source = source;
		this.tokens = scan(source);
	}

	advance() {
		if (!this.isAtEnd()) {
			this.cursor++;
		}

		return this.previous();
	}

	previous() {
		return this.tokens[this.cursor - 1];
	}

	peek() {
		return this.tokens[this.cursor];
	}

	write(fmt?: chalk.Chalk) {
		let { value, loc } = this.previous();

		if (this.consumed < loc.offset) {
			this.output += chalk.gray(this.source.slice(this.consumed, loc.offset));
		}

		this.output += fmt ? fmt(value) : value;
		this.consumed = loc.offset + value.length;
	}

	isAtEnd() {
		return this.peek().type === TokenType.EOF;
	}
}

export function highlight(source: string) {
	let h = new Highlighter(source);
	let state = highlightIndent;

	while (!h.isAtEnd()) {
		state = state(h);
	}

	return h.output;
}

const highlightIndent: HighlightStateFn = (h) => {
	h.advance();
	h.write();
	return highlightKey;
};

const highlightKey: HighlightStateFn = (h) => {
	let next = h.peek();

	if (next.type === TokenType.NEWLINE) {
		return highlightNewline;
	}

	if (next.type === TokenType.TEXT) {
		h.advance();
		h.write(chalk.bold.blue);
	}

	return highlightDelimiter;
};

const highlightDelimiter: HighlightStateFn = (h) => {
	let next = h.peek();

	if (next.type === TokenType.COLON) {
		h.advance();
		h.write();
		return highlightString;
	}

	if (next.type === TokenType.EQUALS) {
		h.advance();
		h.write();
		return highlightNumber;
	}

	if (next.type === TokenType.QUESTION) {
		h.advance();
		h.write();
		return highlightBoolean;
	}

	h.advance();
	h.write();
	return highlightNewline;
};

const highlightNewline: HighlightStateFn = (h) => {
	h.advance();
	h.write();
	return highlightIndent;
};

const highlightString: HighlightStateFn = (h) => {
	h.advance();
	h.write(chalk.green);
	return highlightNewline;
};

const highlightNumber: HighlightStateFn = (h) => {
	h.advance();
	h.write(chalk.yellow);
	return highlightNewline;
};

const highlightBoolean: HighlightStateFn = (h) => {
	h.advance();
	h.write(chalk.magenta);
	return highlightNewline;
};

type HighlightStateFn = (h: Highlighter) => HighlightStateFn;
