import chalk from "chalk";
import type { Renderer } from "../../printer";
import type { SyntaxError } from "../../ast";
import { Token, TokenType } from "../../tokens";

const TAB_WIDTH = 4;

export function createPrettyRenderer(): Renderer {
	return {
		key(token) {
			return chalk.bold.blue(token.value);
		},
		delimiter(token) {
			return token.value;
		},
		string(token) {
			return chalk.green(token.value);
		},
		number(token) {
			return chalk.yellow(token.value);
		},
		boolean(token) {
			return chalk.magenta(token.value);
		},
		comment(token) {
			return chalk.gray(token.value);
		},
		indent(token) {
			return token.value;
		},
		newline(token) {
			return token.value;
		},
		error(chars) {
			return chalk.italic.red(chars);
		},
		ignored(chars) {
			return chars;
		},
		beforeLine() {
			return "";
		},
		afterLine() {
			return "";
		},
	};
}

export function createErrorRenderer(
	error: SyntaxError,
	lineCount: number
): Renderer {
	const LINE_NUMBER_COLS = lineCount.toString().length;

	let pretty = createPrettyRenderer();

	function checkError(fmt: (token: Token) => string): (token: Token) => string {
		return function (token) {
			if (token.loc.offset === error.token.loc.offset) {
				return pretty.error(token.value);
			}

			return fmt(token);
		};
	}

	function replaceWhitespace(input: string): string {
		let output = "";

		for (let char of input) {
			if (char === "\t") {
				output += chalk.dim("→".padEnd(TAB_WIDTH));
			} else if (char === " " || (char !== "\n" && char.match(/\s/))) {
				output += chalk.dim("·");
			} else {
				output += char;
			}
		}

		return output;
	}

	function showWhitespace(
		fmt: (token: Token) => string
	): (token: Token) => string {
		return (token) =>
			fmt({
				...token,
				value: replaceWhitespace(token.value),
			});
	}

	return {
		error: (chars) => pretty.error(replaceWhitespace(chars)),
		key: showWhitespace(checkError(pretty.key)),
		delimiter: showWhitespace(checkError(pretty.delimiter)),
		comment: showWhitespace(checkError(pretty.comment)),
		indent: showWhitespace(checkError(pretty.indent)),
		newline: showWhitespace(checkError(pretty.newline)),
		string: showWhitespace(checkError(pretty.string)),
		number: showWhitespace(checkError(pretty.number)),
		boolean: showWhitespace(checkError(pretty.boolean)),
		ignored: (chars) => pretty.ignored(replaceWhitespace(chars)),
		beforeLine(line) {
			let isError = line === error.token.loc.line;
			let prefix = isError ? "> " : "  ";
			prefix += line.toString().padStart(LINE_NUMBER_COLS);
			return chalk.gray((isError ? chalk.red(prefix) : prefix) + " │ ");
		},
		afterLine(line, text, tokens) {
			let isError = line === error.token.loc.line;
			if (!isError) return "";

			let underline = chalk.gray(" ".repeat(LINE_NUMBER_COLS + 2) + " │ ");
			let col = 1;

			while (col < error.token.loc.col) {
				let char = text[col - 1];
				underline += char === "\t" ? " ".repeat(TAB_WIDTH) : " ";
				col++;
			}

			let errorLength = 0;
			for (const char of error.token.value) {
				errorLength += char === "\t" ? TAB_WIDTH : 1;
			}

			underline += chalk.red("^".repeat(Math.max(1, errorLength)));

			if (tokens[tokens.length - 1]?.type !== TokenType.NEWLINE) {
				underline = "\n" + underline;
			}

			return underline + "\n";
		},
		shouldRenderLine(line) {
			return line > error.token.loc.line - 2 && line < error.token.loc.line + 2;
		},
	};
}
