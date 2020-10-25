import { noun } from "./natural-language";
import { Token, TokenType } from "./tokens";

export namespace CAML {
	export enum Type {
		DOCUMENT = "document",
		LIST = "list",
		ENTRY = "entry",
		KEY = "key",
		STRING = "string",
		NUMBER = "number",
		BOOLEAN = "boolean",
	}

	export interface Document {
		type: Type.DOCUMENT;
		ok: boolean;
		root: List;
		errors: ParseError[];
	}

	export interface List {
		type: Type.LIST;
		associative: boolean;
		entries: Entry[];
	}

	export interface Entry {
		type: Type.ENTRY;
		key: Key | null;
		value: Value;
	}

	export interface Key {
		type: Type.KEY;
		value: string;
	}

	export type Value = List | String | Number | Boolean;

	export interface String {
		type: Type.STRING;
		value: string;
	}

	export interface Number {
		type: Type.NUMBER;
		value: number;
	}

	export interface Boolean {
		type: Type.BOOLEAN;
		value: boolean;
	}

	export enum ErrorCode {
		UNEXPECTED_TOKEN = "CAML_UNEXPECTED_TOKEN",
		UNEXPECTED_EOF = "CAML_UNEXPECTED_EOF",
		INAVLID_INDENT = "CAML_INVALID_INDENT",
		INVALID_BOOLEAN = "CAML_INVALID_BOOLEAN",
		INVALID_NUMBER = "CAML_INVALID_NUMBER",
		UNKNOWN = "CAML_UNKNOWN",
	}

	export class ParseError extends Error {
		readonly token: Token;
		readonly code: ErrorCode;

		static unexpectedToken(token: Token, detail?: string) {
			let message: string;
			let code = ErrorCode.UNEXPECTED_TOKEN;

			switch (token.type) {
				case TokenType.EOF:
					message = "Unexpected end of file";
					code = ErrorCode.UNEXPECTED_EOF;
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

			return new ParseError(message, token, code);
		}

		static invalidIndentation(indent: Token, expected: number) {
			let actual = indent.value.length;
			return new ParseError(
				`Invalid indentation: expected ${noun("tab").count(
					expected
				)}, but got ${actual}`,
				indent,
				ErrorCode.INAVLID_INDENT
			);
		}

		constructor(message: string, token: Token, code = ErrorCode.UNKNOWN) {
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
}
