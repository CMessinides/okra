import { noun } from "./natural-language";
import { Token } from "./tokens";

enum CamlErrorCode {
	UNEXPECTED_TOKEN = "CAML_UNEXPECTED_TOKEN",
	INAVLID_INDENT = "CAML_INVALID_INDENT",
	UNKNOWN = "CAML_UNKNOWN",
}

export class ParseError extends Error {
	readonly token: Token;
	readonly code: CamlErrorCode;

	static unexpectedToken(token: Token) {
		return new ParseError(
			`Unexpected token: '${JSON.stringify(token.value)}'`,
			token,
			CamlErrorCode.UNEXPECTED_TOKEN
		);
	}

	static invalidIndentation(indent: Token, expected: number) {
		let actual = indent.value.length;
		return new ParseError(
			`Invalid indentation: expected ${noun("tab").count(
				expected
			)}, but got ${actual}`,
			indent,
			CamlErrorCode.INAVLID_INDENT
		);
	}

	constructor(message: string, token: Token, code = CamlErrorCode.UNKNOWN) {
		super(message);
		this.code = code;
		this.token = token;
	}

	toJSON() {
		return {
			code: this.code,
			message: this.message,
			token: this.token,
		};
	}
}

export enum CamlType {
	DOCUMENT = "document",
	LIST = "list",
	ENTRY = "entry",
	KEY = "key",
	STRING = "string",
	NUMBER = "number",
	BOOLEAN = "boolean",
}

export interface CamlDocument {
	type: CamlType.DOCUMENT;
	ok: boolean;
	root: CamlList;
	errors: ParseError[];
}

export interface CamlList {
	type: CamlType.LIST;
	associative: boolean;
	entries: CamlEntry[];
}

export interface CamlEntry {
	type: CamlType.ENTRY;
	key: CamlKey | null;
	value: CamlValue;
}

export interface CamlKey {
	type: CamlType.KEY;
	value: string;
}

export type CamlValue = CamlList | CamlString | CamlNumber | CamlBoolean;

export interface CamlString {
	type: CamlType.STRING;
	value: string;
}

export interface CamlNumber {
	type: CamlType.NUMBER;
	value: number;
}

export interface CamlBoolean {
	type: CamlType.BOOLEAN;
	value: boolean;
}
