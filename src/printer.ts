import chalk from "chalk";
import { SyntaxError } from "./ast";
import { scan } from "./scanner";
import { Token, TokenType } from "./tokens";

export interface Renderer {
	key(token: Token): string;
	delimiter(token: Token): string;
	string(token: Token): string;
	number(token: Token): string;
	boolean(token: Token): string;
	comment(token: Token): string;
	indent(token: Token): string;
	newline(token: Token): string;
	error(chars: string): string;
	ignored(chars: string): string;
	beforeLine(line: number, text: string, tokens: Token[]): string;
	afterLine(line: number, text: string, tokens: Token[]): string;
	shouldRenderLine?(line: number, text: string): boolean;
}

function createDefaultRenderer(): Renderer {
	function passthrough(item: Token | string) {
		return typeof item === "string" ? item : item.value;
	}

	return {
		key: passthrough,
		delimiter: passthrough,
		string: passthrough,
		number: passthrough,
		boolean: passthrough,
		comment: passthrough,
		indent: passthrough,
		newline: passthrough,
		error: passthrough,
		ignored: passthrough,
		beforeLine: () => "",
		afterLine: () => "",
	};
}

export class Printer {
	readonly lines: string[];
	readonly tokens: Map<number, Token[]>;
	protected renderer: Renderer;
	protected mode = TextMode.KEY;

	constructor(source: string, tokens: Token[] = scan(source)) {
		this.lines = source.split("\n");
		this.tokens = tokens.reduce((table, token) => {
			if (!table.has(token.loc.line)) {
				table.set(token.loc.line, []);
			}

			table.get(token.loc.line)!.push(token);

			return table;
		}, new Map<number, Token[]>());
		this.renderer = createDefaultRenderer();
	}

	withRenderer(renderer: Renderer): this {
		this.renderer = renderer;
		return this;
	}

	print(): string {
		let output = "";

		for (let i = 0; i < this.lines.length; i++) {
			let line = i + 1;
			let text = this.lines[i];
			if (!this.shouldPrintLine(line, text)) continue;

			let tokens = this.tokens.get(line) ?? [];
			let col = 1;

			output += this.renderer.beforeLine(line, text, tokens);

			for (const token of tokens) {
				let { loc } = token;

				if (col < loc.col) {
					output += this.renderer.ignored(text.slice(col - 1, loc.col - 1));
				}

				if (token.type === TokenType.INDENT) {
					output += this.renderer.indent(token);
				} else if (token.type === TokenType.NEWLINE) {
					output += this.renderer.newline(token);
				} else if (token.type === TokenType.COMMENT) {
					output += this.renderer.comment(token);
				} else if (token.type === TokenType.TEXT) {
					output += this.renderText(token);
				} else if (
					token.type === TokenType.COLON ||
					token.type === TokenType.EQUALS ||
					token.type === TokenType.QUESTION ||
					token.type === TokenType.SLASH
				) {
					output += this.renderer.delimiter(token);
				}

				if (token.type === TokenType.NEWLINE) {
					this.mode = TextMode.KEY;
				} else if (token.type === TokenType.COLON) {
					this.mode = TextMode.STRING;
				} else if (token.type === TokenType.EQUALS) {
					this.mode = TextMode.NUMBER;
				} else if (token.type === TokenType.QUESTION) {
					this.mode = TextMode.BOOLEAN;
				}

				col = loc.col + token.value.length;
			}

			output += this.renderer.afterLine(line, text, tokens);
		}

		return output;
	}

	protected renderText(token: Token): string {
		const RENDER_TABLE = new Map([
			[TextMode.KEY, this.renderer.key],
			[TextMode.STRING, this.renderer.string],
			[TextMode.NUMBER, this.renderer.number],
			[TextMode.BOOLEAN, this.renderer.boolean],
		]);

		let render = RENDER_TABLE.get(this.mode)!;
		return render.call(this.renderer, token);
	}

	protected shouldPrintLine(line: number, text: string): boolean {
		if (typeof this.renderer.shouldRenderLine === "function") {
			return this.renderer.shouldRenderLine(line, text);
		}

		return true;
	}
}

class PrettyPrinter {
	readonly LINE_NUMBER_COLS: number;
	protected readonly lines: string[];
	protected readonly tokens: Map<number, Token[]>;
	protected readonly renderer: Renderer;

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
		this.renderer = createDefaultRenderer();
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
