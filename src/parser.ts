import { Source, SourceLocation } from "./source";

const TAB = "\t".charCodeAt(0);
const NEWLINE = "\n".charCodeAt(0);
const DOT = ".".charCodeAt(0);
const LOWER_E = "e".charCodeAt(0);

const PARSER_TABLE = new Map<string, ValueParser>([
	[":", parseString],
	["=", parseNumber],
]);

function getValueParser(delimiter: string) {
	return PARSER_TABLE.get(delimiter) ?? null;
}

class ParseError extends Error {
	readonly loc: SourceLocation;
	protected readonly source: Source;

	constructor(message: string, loc: SourceLocation, source: Source) {
		super(message);
		this.loc = loc;
		this.source = source;
	}

	toJSON() {
		return {
			loc: this.loc,
			message: this.message,
		};
	}
}

export function parse(input: string): ParseResult {
	let source = Source.from(input);
	let errors: ParseError[] = [];

	let error: ErrorFn = (msg, loc = source.loc()) => {
		let e = new ParseError(msg, loc, source);
		errors.push(e);
		return e;
	};

	let root = parseList(source, error, 0);

	return {
		ok: errors.length === 0,
		root,
		errors,
	};
}

function parseList(source: Source, error: ErrorFn, depth: number): CamlList {
	let items: CamlItem[] = [];

	while (!source.isAtEnd()) {
		try {
			let indent = source.advanceWhileChar((charCode) => charCode === TAB);

			if (indent.length < depth) {
				break;
			}

			if (indent.length > depth) {
				throw error(
					`Indentation error: expected ${depth} ${
						depth === 1 ? "tab" : "tabs"
					}, but got ${indent.length}.`
				);
			}

			items.push(parseItem(source, error, depth));
		} catch (e) {
			if (e instanceof ParseError) {
				synchronize(source);
				continue;
			}

			throw e;
		}
	}

	return {
		type: CamlType.LIST,
		items,
	};
}

function parseItem(source: Source, error: ErrorFn, depth: number): CamlItem {
	source.skipSpaces();

	let key = parseKey(source);
	let parseValue = getValueParser(source.advanceIfRegExp(/^[:=]/));

	if (!parseValue) {
		if (source.isAtEnd()) {
			throw error("Unexpected end of file.");
		}

		let nextChar = String.fromCharCode(source.peek());
		throw error(
			`${JSON.stringify(
				nextChar
			)} is not a valid delimiter; expected one of: ":", "=".`
		);
	}

	let value = parseValue(source, error, depth);

	let newlines = source.advanceWhileChar((charCode) => charCode === NEWLINE);
	if (!source.isAtEnd() && newlines.length === 0) {
		throw error("Expected newline after value.");
	}

	return {
		type: CamlType.ITEM,
		key,
		value,
	};
}

function parseKey(source: Source): CamlKey | null {
	let literal = source.advanceIfRegExp(/^(?:\\.|[^:=])+/).trimEnd();

	if (!literal) {
		return null;
	}

	return {
		type: CamlType.KEY,
		literal,
		value: literal,
	};
}

function parseString(source: Source): CamlString {
	let literal = String.fromCharCode(
		...source.advanceWhileChar((charCode) => charCode !== NEWLINE)
	).trim();

	return {
		type: CamlType.STRING,
		literal,
		value: literal,
	};
}

function parseNumber(source: Source, error: ErrorFn): CamlNumber {
	source.skipSpaces();

	let format = NumberFormat.INT;
	let intLiteral = source.advanceIfRegExp(/^\d+/);

	if (!intLiteral) {
		throw error("Numbers must start with a digit.");
	}

	if (!source.match(DOT)) {
		// Number is an integer
		return {
			type: CamlType.NUMBER,
			format,
			literal: intLiteral,
			value: parseInt(intLiteral),
		};
	}

	format = NumberFormat.FLOAT;

	let floatLiteral = source.advanceIfRegExp(/^\d+/);
	if (!floatLiteral) {
		throw error("Decimal point must be followed by a digit.");
	}

	let literal = intLiteral + "." + floatLiteral;

	if (source.match(LOWER_E)) {
		let exponent = source.advanceIfRegExp(/^-?\d+/);

		if (!exponent) {
			throw error(
				'Exponent notation ("e") must be followed by a positive or negative number.'
			);
		}

		literal += "e" + exponent;
	}

	return {
		type: CamlType.NUMBER,
		format,
		literal,
		value: parseFloat(literal),
	};
}

function synchronize(source: Source) {
	source.advanceWhileChar((charCode) => charCode !== NEWLINE);
}

interface ParseResult {
	ok: boolean;
	root: CamlList;
	errors: ParseError[];
}

enum CamlType {
	LIST = "list",
	ITEM = "item",
	KEY = "key",
	STRING = "string",
	NUMBER = "number",
}

interface CamlList {
	type: CamlType.LIST;
	items: CamlItem[];
}

interface CamlItem {
	type: CamlType.ITEM;
	key: CamlKey | null;
	value: CamlValue;
}

interface CamlKey {
	type: CamlType.KEY;
	literal: string;
	value: string;
}

type CamlValue = CamlString | CamlNumber | CamlList;

interface CamlString {
	type: CamlType.STRING;
	literal: string;
	value: string;
}

enum NumberFormat {
	INT = "int",
	FLOAT = "float",
}

interface CamlNumber {
	type: CamlType.NUMBER;
	format: NumberFormat;
	literal: string;
	value: number;
}

type ValueParser = (source: Source, error: ErrorFn, depth: number) => CamlValue;
type ErrorFn = (msg: string, loc?: SourceLocation) => ParseError;
