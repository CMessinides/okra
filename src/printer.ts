import { scan } from "./scanner";
import { Token, TokenType } from "./tokens";

enum TextMode {
	KEY,
	STRING,
	NUMBER,
	BOOLEAN,
}

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

export function createRenderer(config: Partial<Renderer>): Renderer {
	return {
		...createDefaultRenderer(),
		...config,
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
