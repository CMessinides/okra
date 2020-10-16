import {
	CamlBoolean,
	CamlDocument,
	CamlEntry,
	CamlKey,
	CamlList,
	CamlString,
	CamlType,
	CamlValue,
	ParseError,
} from "./ast";
import { Token, TokenType } from "./tokens";

class Parser {
	readonly tokens: Token[];
	depth = -1;
	readonly errors: ParseError[] = [];
	protected offset = 0;

	constructor(tokens: Token[]) {
		this.tokens = tokens;
	}

	advance(): Token {
		if (!this.isAtEnd()) this.offset++;
		return this.previous();
	}

	peek(): Token {
		return this.tokens[this.offset];
	}

	previous(): Token {
		return this.tokens[this.offset - 1];
	}

	match(type: TokenType, explain: string | ((token: Token) => string)): Token {
		if (this.peek().type !== type) {
			let message =
				typeof explain === "function" ? explain(this.peek()) : explain;
			let error = new ParseError(`Unexpected token: ${message}`);
			this.errors.push(error);
			throw error;
		}

		return this.advance();
	}

	isAtEnd(): boolean {
		return this.peek().type === TokenType.EOF;
	}
}

export function parse(tokens: Token[]): CamlDocument {
	let parser = new Parser(tokens);
	let root = parseList(parser);

	return {
		type: CamlType.DOCUMENT,
		ok: parser.errors.length === 0,
		root,
		errors: parser.errors,
	};
}

enum ListMode {
	UNKNOWN,
	ASSOCIATIVE,
	NOT_ASSOCIATIVE,
}

function parseList(parser: Parser): CamlList {
	let entries: CamlEntry[] = [];
	let mode = ListMode.UNKNOWN;
	parser.depth++;

	while (parser.peek().type !== TokenType.EOF) {
		let indent = parser.match(
			TokenType.INDENT,
			(token) => `Expected indentation, got '${token.value}' instead`
		);

		if (indent.value.length < parser.depth) {
			break;
		}

		if (indent.value.length > parser.depth) {
			// TODO: Parser error
			continue;
		}

		let entry = parseEntry(parser);

		if (mode === ListMode.UNKNOWN) {
			mode =
				entry.key !== null ? ListMode.ASSOCIATIVE : ListMode.NOT_ASSOCIATIVE;
		} else {
			// TODO: Check for mode mismatch and error
		}

		entries.push(entry);
	}

	parser.depth--;
	return {
		type: CamlType.LIST,
		associative: mode === ListMode.ASSOCIATIVE,
		entries,
	};
}

function parseEntry(parser: Parser): CamlEntry {
	let key: CamlKey | null = null;

	if (parser.peek().type === TokenType.TEXT) {
		key = {
			type: CamlType.KEY,
			value: parser.advance().value,
		};
	}

	let parseValue = VALUE_TABLE.get(parser.advance().type)!;
	let value = parseValue(parser);

	return {
		type: CamlType.ENTRY,
		key,
		value,
	};
}

const VALUE_TABLE = new Map<TokenType, (parser: Parser) => CamlValue>([
	[TokenType.COLON, parseString],
	[TokenType.QUESTION, parseBoolean],
]);

function parseString(parser: Parser): CamlString {
	let value = parser.advance().value;

	if (!parser.isAtEnd()) {
		parser.match(
			TokenType.NEWLINE,
			(token) => `Expected line break after string, got ${token}.`
		);
	}

	return {
		type: CamlType.STRING,
		value,
	};
}

const TRUE_STRINGS = new Set(["true", "yes", "y"]);
const FALSE_STRINGS = new Set(["false", "no", "n"]);
function toBooleanValue(token: Token) {
	let v = token.value.toLowerCase();

	if (TRUE_STRINGS.has(v)) {
		return true;
	}

	if (FALSE_STRINGS.has(v)) {
		return false;
	}

	return null;
}

function parseBoolean(parser: Parser): CamlBoolean {
	let token = parser.match(
		TokenType.TEXT,
		(token) => `Expected boolean, got ${token}`
	);

	let value = toBooleanValue(token)!;

	if (!parser.isAtEnd()) {
		parser.match(
			TokenType.NEWLINE,
			(token) => `Expected line break after boolean, got ${token}.`
		);
	}

	return {
		type: CamlType.BOOLEAN,
		value,
	};
}
