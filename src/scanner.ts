import { Source, SourceLocation } from "./source";
import { Token, TokenType } from "./tokens";

const NEWLINE = "\n".charCodeAt(0);
const TAB = "\t".charCodeAt(0);
const SPACE = " ".charCodeAt(0);
const COLON = ":".charCodeAt(0);
const SLASH = "/".charCodeAt(0);
const EQUALS = "=".charCodeAt(0);

const SCANNER_TABLE = new Map([
	[
		NEWLINE,
		singleCharScanner(TokenType.NEWLINE, (lookahead) => {
			if (lookahead === TAB) {
				return indent;
			}

			return getNextScanner(lookahead);
		}),
	],
	[COLON, singleCharScanner(TokenType.COLON)],
	[SLASH, singleCharScanner(TokenType.SLASH)],
	[EQUALS, singleCharScanner(TokenType.EQUALS)],
]);

const indent: Scanner = (source, tokens) => {
	let token: Token = {
		type: TokenType.INDENT,
		lexeme: "",
		loc: source.loc(),
	};

	while (!source.isAtEnd() && source.peek() === TAB) {
		token.lexeme += String.fromCharCode(source.advance());
	}

	tokens.push(token);

	if (source.isAtEnd()) {
		return null;
	}

	return getNextScanner(source.peek());
};

const text: Scanner = (source, tokens) => {
	// Skip leading spaces
	while (!source.isAtEnd() && source.peek() === SPACE) {
		source.advance();
	}

	let token: Token = {
		type: TokenType.TEXT,
		lexeme: "",
		loc: source.loc(),
	};
	let next: Scanner | null = null;

	while (!source.isAtEnd()) {
		token.lexeme += String.fromCharCode(source.advance());

		let nextScanner = getNextScanner(source.peek());
		if (nextScanner !== text) {
			next = nextScanner;
			break;
		}
	}

	tokens.push(token);
	return next;
};

export function scan(input: string | Source): Token[] {
	let source = typeof input === "string" ? Source.from(input) : input;
	let next: Scanner | null = text;
	let tokens: Token[] = [];

	while (next) {
		next = next(source, tokens);
	}

	tokens.push({
		type: TokenType.EOF,
		lexeme: "",
		loc: source.loc(),
	});

	return tokens;
}

function getNextScanner(charCode: number): Scanner {
	if (SCANNER_TABLE.has(charCode)) {
		return SCANNER_TABLE.get(charCode)!;
	} else {
		return text;
	}
}

function singleCharScanner(type: TokenType, getNext = getNextScanner): Scanner {
	return (source, tokens) => {
		let loc = source.loc();
		let lexeme = String.fromCharCode(source.advance());

		tokens.push({ type, lexeme, loc });

		if (source.isAtEnd()) {
			return null;
		}

		return getNext(source.peek());
	};
}

type Scanner = (source: Source, tokens: Token[]) => Scanner | null;
