import { Token, TokenLocation, TokenType } from "./tokens";

type CharCode = number;

const COLON = 0x3a;
const EQUALS = 0x3d;
const QUESTION = 0x3f;
const SLASH = 0x2f;
const HASH = 0x23;
const SPACE = 0x20;
const TAB = 0x09;
const NEWLINE = 0x0a;

const WHITESPACE = new Set([SPACE, TAB]);
function isWhitespace(charCode: CharCode): boolean {
	return WHITESPACE.has(charCode);
}

class Scanner {
	readonly source: string;
	readonly tokens: Token[] = [];
	depth = 0;
	/** The start of the current token */
	protected offset = 0;
	/** The end of the current token (non-inclusive) */
	protected cursor = 0;
	/** The line number of the current token */
	protected line = 1;

	constructor(source: string) {
		this.source = source;
	}

	/**
	 * Add another character to the current token and return its char code. If there are no
	 * more characters to consume, returns NaN.
	 */
	advance(): CharCode {
		if (this.isAtEnd()) return NaN;

		return this.source.charCodeAt(this.cursor++);
	}

	/**
	 * Remove the last character of the current token and reset the scanner to the position
	 * just before it. Note that this will have no effect if the current token is empty.
	 */
	backup(): void {
		if (this.cursor > this.offset) {
			this.cursor--;
		}
	}

	/**
	 * Preview the char code of the next character without consuming it. If there are no
	 * more characters to consume, returns NaN.
	 */
	peek(): CharCode {
		let charCode = this.advance();
		this.backup();
		return charCode;
	}

	/**
	 * Ignore all characters in the current token.
	 */
	ignore(): void {
		this.offset = this.cursor;
	}

	/**
	 * Add the next character to the current token if it is found in the given string of
	 * acceptable characters. Returns true if a character was consumed, false otherwise.
	 */
	match(chars: string): boolean {
		let next = this.advance();

		for (const char of chars) {
			if (char.charCodeAt(0) === next) {
				return true;
			}
		}

		this.backup();
		return false;
	}

	/**
	 * Add characters to the current token so long as they are found in the given string of
	 * acceptable characters. Returns true if any characters were consumed, false otherwise.
	 */
	matchRun(chars: string): boolean {
		let matched = 0;

		while (this.match(chars)) {
			matched++;
		}

		return matched > 0;
	}

	/**
	 * Ignore any spaces or tabs.
	 */
	skipWhitespace(): void {
		while (isWhitespace(this.peek())) {
			this.advance();
			this.ignore();
		}
	}

	/**
	 * Emit the current token with the given type.
	 */
	emit(type: TokenType): Token {
		let token: Token = {
			type,
			value: this.source.slice(this.offset, this.cursor),
			loc: this.loc(),
		};

		// Setup state for the next token
		this.offset = this.cursor;
		if (type === TokenType.NEWLINE) {
			this.line++;
		}
		if (type === TokenType.INDENT) {
			this.depth = token.value.length;
		}

		this.tokens.push(token);

		return token;
	}

	/**
	 * Emit an error token with the given message and, optionally, a given location. If no
	 * location is provided, the location of the current token is used.
	 */
	error(message: string, loc: TokenLocation = this.loc()): null {
		this.tokens.push({
			type: TokenType.ERROR,
			value: message,
			loc,
		});

		return null;
	}

	/**
	 * Returns true if there are no more characters to consume, otherwise returns false.
	 */
	isAtEnd(): boolean {
		return this.cursor >= this.source.length;
	}

	/**
	 * Returns true if the current token has characters, otherwise returns false.
	 */
	hasAdvanced(): boolean {
		return this.cursor > this.offset;
	}

	/**
	 * Get the location of the current token.
	 */
	loc(): TokenLocation {
		return {
			offset: this.offset,
			line: this.line,
		};
	}
}

export function scan(source: string): Token[] {
	let scanner = new Scanner(source);

	let state: ScanState | null = scanIndent;
	while (state !== null) {
		state = state(scanner);
	}

	scanner.emit(TokenType.EOF);

	return scanner.tokens;
}

const scanIndent: ScanState = (scanner) => {
	if (scanner.isAtEnd()) return null;

	scanner.matchRun("\t");
	scanner.emit(TokenType.INDENT);

	if (scanner.peek() === HASH) {
		return scanComment;
	}

	return scanKeyText;
};

const scanComment: ScanState = (scanner) => {
	while (scanner.peek() !== NEWLINE) {
		scanner.advance();
		scanner.ignore();
		if (scanner.isAtEnd()) return null;
	}

	return scanNewline;
};

const scanNewline: ScanState = (scanner) => {
	scanner.advance();
	scanner.emit(TokenType.NEWLINE);
	return scanIndent;
};

const scanValueText = scanText();
const scanMultilineText = scanBlock(scanValueText);
const scanDoubleColon: ScanState = (scanner) => {
	scanner.advance();
	scanner.emit(TokenType.DOUBLE_COLON);
	scanner.skipWhitespace();

	if (scanner.isAtEnd()) return null;

	scanNewline(scanner);
	return scanMultilineText;
};
const scanColon: ScanState = (scanner) => {
	scanner.advance();

	if (scanner.peek() === COLON) {
		return scanDoubleColon;
	}

	scanner.emit(TokenType.COLON);
	scanner.skipWhitespace();

	return scanValueText;
};
const scanEquals = scanDelimiter("=", TokenType.EQUALS, scanValueText);
const scanQuestion = scanDelimiter("?", TokenType.QUESTION, scanValueText);
const scanSlash = scanDelimiter("/", TokenType.SLASH, scanNewline);

const DELIMITER_TABLE = new Map([
	[COLON, scanColon],
	[EQUALS, scanEquals],
	[QUESTION, scanQuestion],
	[SLASH, scanSlash],
]);

const scanKeyText = scanText(
	new Map([
		[COLON, scanColon],
		[EQUALS, scanEquals],
		[QUESTION, scanQuestion],
		[SLASH, scanSlash],
	])
);

function scanText(branches: Map<CharCode, ScanState> = new Map()): ScanState {
	return function (scanner) {
		let next: ScanState | null = null;

		while (!scanner.isAtEnd()) {
			let c = scanner.peek();

			if (c === NEWLINE) {
				next = scanNewline;
				break;
			}

			if (branches.has(c)) {
				next = branches.get(c)!;
				break;
			}

			scanner.advance();
		}

		if (scanner.hasAdvanced()) {
			scanner.emit(TokenType.TEXT);
		}

		return next;
	};
}

/**
 * Create a scan state that consumes a block of lines that are all indented to the same
 * depth.
 * @param scanAfterIndent The state to enter after each indent in the block has been consumed.
 */
function scanBlock(scanAfterIndent: ScanState): ScanState {
	return function (scanner) {
		let targetDepth = scanner.depth + 1;

		// Save a reference to the state we should enter after we exit this block
		let scanAfterBlock = scanIndent(scanner);

		/*
			A block ends either when:
			
			1) we reach the end of the file (i.e. scanAfterBlock is null); or
			2) the depth of the current line is less than the target depth
		 */
		while (scanAfterBlock && scanner.depth >= targetDepth) {
			if (scanner.depth > targetDepth) {
				// We can guarantee the last token was an indent
				let indent = scanner.tokens[scanner.tokens.length - 1];
				let actualDepth = indent.value.length;

				// We emit an error, but in the spirit of forgiveness, we proceed as normal.
				// The worst case is a completely misinterpreted line -- but once we move to the
				// next line or exit the block, we reset the state and try again.
				scanner.error(
					`Invalid indentation: expected ${targetDepth} ${
						targetDepth === 1 ? "tab" : "tabs"
					}, got ${actualDepth}`,
					// Use the location of the offending indentation
					indent.loc
				);
			}

			let { line } = scanner.loc();
			let scanWithinLine: ScanState | null = scanAfterIndent;

			/*
				A line ends either when:
				
				1) we reach the end of the file (i.e. scanWithinLine is null); or
				2) the scanner moves to a new line.
			 */
			while (scanWithinLine && scanner.loc().line === line) {
				scanWithinLine = scanWithinLine(scanner);
			}

			// Having consumed the line, update the exit state
			scanAfterBlock = scanIndent(scanner);
		}

		return scanAfterBlock;
	};
}

function scanDelimiter(
	delimiter: string,
	type: TokenType,
	next: ScanState
): ScanState {
	return (scanner) => {
		for (let i = 0; i < delimiter.length; i++) {
			scanner.advance();
		}

		scanner.emit(type);
		scanner.skipWhitespace();

		return next;
	};
}

type ScanState = (scanner: Scanner) => ScanState | null;
