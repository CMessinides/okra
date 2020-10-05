import { SourceLocation } from "./source";
import { Token, TokenType } from "./tokens";

class ScanError extends Error {}

const NEWLINE = "\n".charCodeAt(0);
const COLON = ":".charCodeAt(0);

const SCANNER_TABLE = new Map([
	[
		NEWLINE,
		singleCharScanner(TokenType.NEWLINE, (state) => {
			state.loc = { ...state.loc, line: state.loc.line + 1 };
			return state;
		}),
	],
	[COLON, singleCharScanner(TokenType.COLON)],
]);

const text: Scanner = (source, state) => {
	let start = state.loc.offset;

	// Skip leading spaces
	while (start < source.length && source.charAt(start) === " ") {
		start++;
	}

	let current = start;
	let lexeme = "";
	let next: Scanner | undefined;

	while (current < source.length) {
		let nextScanner = getNextScanner(source.charCodeAt(current));
		if (nextScanner !== text) {
			next = nextScanner;
			break;
		}

		lexeme += source.charAt(current);
		current++;
	}

	return {
		loc: {
			...state.loc,
			offset: current,
		},
		next,
		tokens: state.tokens.concat({
			type: TokenType.TEXT,
			lexeme,
			loc: {
				...state.loc,
				offset: start,
			},
		}),
		errors: state.errors,
	};
};

export function scan(source: string): ScanResult {
	let state: ScanState = {
		loc: { offset: 0, line: 1 },
		next: text,
		tokens: [],
		errors: [],
	};

	while (state.next) {
		state = state.next(source, state);
	}

	let { tokens, errors } = state;
	tokens = tokens.concat({
		type: TokenType.EOF,
		lexeme: "<EOF>",
		loc: state.loc,
	});

	return {
		ok: errors.length === 0,
		tokens,
		errors,
	};
}

function getNextScanner(charCode: number): Scanner {
	if (SCANNER_TABLE.has(charCode)) {
		return SCANNER_TABLE.get(charCode)!;
	} else {
		return text;
	}
}

function singleCharScanner(
	type: TokenType,
	changeState?: (state: ScanState) => ScanState
): Scanner {
	return (source, state) => {
		let current = state.loc.offset;

		let tokens = state.tokens.concat({
			type,
			lexeme: source.charAt(current++),
			loc: state.loc,
		});

		let next: Scanner | undefined;
		if (current < source.length) {
			next = getNextScanner(source.charCodeAt(current));
		}

		let nextState: ScanState = {
			loc: {
				...state.loc,
				offset: current,
			},
			next,
			tokens,
			errors: state.errors,
		};

		if (typeof changeState === "function") {
			nextState = changeState(nextState);
		}

		return nextState;
	};
}

interface ScanResult {
	ok: boolean;
	tokens: readonly Token[];
	errors: readonly ScanError[];
}

interface ScanState {
	loc: Readonly<SourceLocation>;
	next?: Scanner;
	tokens: readonly Token[];
	errors: readonly ScanError[];
}

type Scanner = (source: string, state: Readonly<ScanState>) => ScanState;
