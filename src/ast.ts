import { noun } from "./natural-language";
import { Token, TokenType } from "./tokens";

export enum CamlErrorCode {
	UNEXPECTED_TOKEN = "CAML_UNEXPECTED_TOKEN",
	UNEXPECTED_EOF = "CAML_UNEXPECTED_EOF",
	INAVLID_INDENT = "CAML_INVALID_INDENT",
	INVALID_BOOLEAN = "CAML_INVALID_BOOLEAN",
	INVALID_NUMBER = "CAML_INVALID_NUMBER",
	UNKNOWN = "CAML_UNKNOWN",
}

export class CamlError extends Error {
	readonly token: Token;
	readonly code: CamlErrorCode;

	static unexpectedToken(token: Token, detail?: string) {
		let message: string;
		let code = CamlErrorCode.UNEXPECTED_TOKEN;

		switch (token.type) {
			case TokenType.EOF:
				message = "Unexpected end of file";
				code = CamlErrorCode.UNEXPECTED_EOF;
				break;
			case TokenType.NEWLINE:
				message = "Unexpected line break";
				break;
			case TokenType.INDENT:
				message = "Unexpected indentation";
				break;
			default:
				message = `Unexpected token: "${token.value}"`;
				break;
		}

		if (detail) {
			message += "; " + detail;
		}

		return new CamlError(message, token, code);
	}

	static invalidIndentation(indent: Token, expected: number) {
		let actual = indent.value.length;
		return new CamlError(
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
	errors: CamlError[];
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
