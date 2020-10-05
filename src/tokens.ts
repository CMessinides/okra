import { SourceLocation } from "./source";

export enum TokenType {
	// Single characters
	COLON = "COLON",
	SLASH = "SLASH",
	EQUAL = "EQUAL",
	QUESTION = "QUESTION",
	// Two characters
	DOUBLE_COLON = "DOUBLE_COLON",
	// Whitespace
	INDENT = "INDENT",
	NEWLINE = "NEWLINE",
	// Variable length
	TEXT = "TEXT",
	// End of file
	EOF = "EOF",
}

export interface Token {
	type: TokenType;
	lexeme: string;
	loc: SourceLocation;
}
