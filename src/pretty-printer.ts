import chalk from "chalk";
import { SyntaxError } from "./ast";
import { Token, TokenType } from "./tokens";

class PrettyPrinter {
	readonly LINE_NUMBER_COLS: number;
	protected readonly lines: string[];
	protected readonly tokens: Map<number, Token[]>;

	constructor(source: string, tokens: Token[]) {
		this.lines = source.split("\n");
		this.tokens = tokens.reduce((table, token) => {
			if (!table.has(token.loc.line)) {
				table.set(token.loc.line, []);
			}

			if (token.type !== TokenType.NEWLINE) {
				table.get(token.loc.line)!.push(token);
			}

			return table;
		}, new Map<number, Token[]>());

		this.LINE_NUMBER_COLS = this.lines.length.toString().length;
	}

	line(line: number): LinePrinter | null {
		if (line < 1 || line > this.lines.length) {
			return null;
		}

		return new LinePrinter(
			line,
			this.lines[line - 1],
			this.tokens.get(line) ?? [],
			this
		);
	}

	print() {
		let lines: LinePrinter[] = [];

		for (let i = 0; i < this.lines.length; i++) {
			lines.push(this.line(i + 1)!);
		}

		return lines.map((line) => line.print()).join("\n");
	}
}

enum TextMode {
	KEY,
	STRING,
	NUMBER,
	BOOLEAN,
}

const TEXT_FMTS = new Map([
	[TextMode.KEY, chalk.bold.blue],
	[TextMode.STRING, chalk.green],
	[TextMode.NUMBER, chalk.yellow],
	[TextMode.BOOLEAN, chalk.magenta],
]);

class LinePrinter {
	readonly line: number;
	readonly text: string;
	readonly tokens: Token[];
	protected readonly parent: PrettyPrinter;
	protected mode = TextMode.KEY;
	protected errors: SyntaxError[] = [];

	constructor(
		line: number,
		text: string,
		tokens: Token[],
		parent: PrettyPrinter
	) {
		this.line = line;
		this.text = text;
		this.tokens = tokens;
		this.parent = parent;
	}

	withErrors(...errors: SyntaxError[]) {
		this.errors.push(...errors);
		return this;
	}

	print() {
		let formatted = this.lineNum() + this.prettyText();

		if (this.hasError()) {
			formatted += "\n" + this.underlineErrors();
		}

		return formatted.replace(/\t/g, "    ");
	}

	prettyText() {
		let mode = TextMode.KEY;
		let highlighted = "";
		let col = 1;

		for (const token of this.tokens) {
			let { loc } = token;

			if (col < loc.col) {
				highlighted += this.text.slice(col - 1, loc.col - 1);
			}

			let substr = token.value;
			let isError = this.errors.some(
				(error) => error.token.loc.offset === token.loc.offset
			);

			if (isError) {
				substr = chalk.red.italic(substr);
			} else if (token.type === TokenType.COMMENT) {
				substr = chalk.gray(substr);
			} else if (token.type === TokenType.TEXT) {
				let fmt = TEXT_FMTS.get(mode)!;
				substr = fmt(substr);
			}

			if (token.type === TokenType.COLON) {
				mode = TextMode.STRING;
			} else if (token.type === TokenType.EQUALS) {
				mode = TextMode.NUMBER;
			} else if (token.type === TokenType.QUESTION) {
				mode = TextMode.BOOLEAN;
			}

			highlighted += substr;
			col = loc.col + token.value.length;
		}

		return highlighted;
	}

	lineNum() {
		let num = this.line.toString().padStart(this.parent.LINE_NUMBER_COLS);

		if (this.hasError()) {
			num = chalk.red(num);
		}

		return chalk.gray(`  ${num} │ `);
	}

	lineNumContinuation() {
		let padding = " ".repeat(this.parent.LINE_NUMBER_COLS);
		return chalk.gray(`  ${padding} │ `);
	}

	underlineErrors() {
		let underline = "";
		let col = 1;

		for (const error of this.errors) {
			let { loc } = error.token;

			while (col < loc.col) {
				let char = this.text[col - 1];
				underline += char === "\t" ? "    " : " ";
				col++;
			}

			let errorLength = 0;
			for (const char of error.token.value) {
				errorLength += char === "\t" ? 4 : 1;
			}

			underline += chalk.red("^".repeat(Math.max(1, errorLength)));
		}

		return this.lineNumContinuation() + underline;
	}

	hasError() {
		return this.errors.length > 0;
	}
}

export function prettyPrint(source: string, tokens: Token[]) {
	return new PrettyPrinter(source, tokens).print();
}

export function prettyPrintError(
	error: SyntaxError,
	source: string,
	tokens: Token[]
) {
	let { loc } = error.token;
	let printer = new PrettyPrinter(source, tokens);

	let excerpt = [
		printer.line(loc.line - 1),
		printer.line(loc.line)?.withErrors(error),
		printer.line(loc.line + 1),
	];

	return excerpt
		.map((line) => line?.print() ?? null)
		.filter((line) => line !== null)
		.join("\n");
}
