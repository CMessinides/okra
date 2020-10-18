export enum TokenType {
	// Meta
	ERROR = "ERROR",
	EOF = "EOF",
	// Whitespace
	INDENT = "INDENT",
	NEWLINE = "NEWLINE",
	// Text data
	TEXT = "TEXT",
	ESCAPE = "ESCAPE",
	// Punctuation
	COLON = "COLON",
	EQUALS = "EQUALS",
	QUESTION = "QUESTION",
	SLASH = "SLASH",
}

export interface Token {
	type: TokenType;
	value: string;
	loc: TokenLocation;
}

export interface TokenLocation {
	offset: number;
	line: number;
	col: number;
}
