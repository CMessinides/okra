import {
	CamlBoolean,
	CamlDocument,
	CamlEntry,
	CamlKey,
	CamlList,
	CamlNumber,
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

	backup(): Token {
		if (this.offset > 0) {
			this.offset--;
		}
		return this.peek();
	}

	peek(): Token {
		return this.tokens[this.offset];
	}

	previous(): Token {
		return this.tokens[this.offset - 1];
	}

	match(type: TokenType): Token {
		let next = this.peek();
		if (next.type !== type) {
			this.error(ParseError.unexpectedToken(next));
		}

		return this.advance();
	}

	error(message: string, token?: Token): never;
	error(error: ParseError): never;
	error(reason: ParseError | string, token: Token = this.previous()): never {
		let error =
			typeof reason === "string" ? new ParseError(reason, token) : reason;
		this.errors.push(error);
		throw error;
	}

	synchronize() {
		while (!this.isAtEnd() && this.previous().type !== TokenType.NEWLINE) {
			this.advance();
		}
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

	while (!parser.isAtEnd()) {
		try {
			let indent = parser.match(TokenType.INDENT);

			// Skip empty lines
			if (parser.peek().type === TokenType.NEWLINE || parser.isAtEnd()) {
				parser.advance();
				continue;
			}

			if (indent.value.length < parser.depth) {
				parser.backup();
				break;
			}

			if (indent.value.length > parser.depth) {
				parser.error(ParseError.invalidIndentation(indent, parser.depth));
			}

			let entry = parseEntry(parser);

			if (mode === ListMode.UNKNOWN) {
				mode =
					entry.key !== null ? ListMode.ASSOCIATIVE : ListMode.NOT_ASSOCIATIVE;
			} else {
				// TODO: Check for mode mismatch and error
			}

			entries.push(entry);
		} catch (e) {
			if (e instanceof ParseError) {
				parser.synchronize();
				continue;
			}

			throw e;
		}
	}

	parser.depth--;
	return {
		type: CamlType.LIST,
		associative: mode !== ListMode.NOT_ASSOCIATIVE,
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
	[TokenType.EQUALS, parseNumber],
	[TokenType.SLASH, parseNestedList],
]);

function parseString(parser: Parser): CamlString {
	let value = parser.advance().value;

	if (!parser.isAtEnd()) {
		parser.match(TokenType.NEWLINE);
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
	let token = parser.match(TokenType.TEXT);

	let value = toBooleanValue(token)!;

	if (!parser.isAtEnd()) {
		parser.match(TokenType.NEWLINE);
	}

	return {
		type: CamlType.BOOLEAN,
		value,
	};
}

function parseNumber(parser: Parser): CamlNumber {
	let token = parser.match(TokenType.TEXT);

	let value = parseFloat(token.value);

	if (Number.isNaN(value)) {
		// TODO: Parser error
	}

	if (!parser.isAtEnd()) {
		parser.match(TokenType.NEWLINE);
	}

	return {
		type: CamlType.NUMBER,
		value,
	};
}

function parseNestedList(parser: Parser): CamlList {
	if (!parser.isAtEnd()) {
		parser.match(TokenType.NEWLINE);
	}

	return parseList(parser);
}
