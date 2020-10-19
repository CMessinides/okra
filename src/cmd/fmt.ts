import * as path from "path";
import chalk from "chalk";
import { ParseError } from "../ast";
import { Token, TokenType } from "../tokens";

export function error(e: Error) {
	return `${chalk.bold.red("ERROR")}: ${e.message}`;
}

/**
 * Please forgive this awful bit of string munging.
 */
export function parseError(
	error: ParseError,
	source: string,
	tokens: Token[],
	filepath: string
) {
	let { loc } = error.token;
	let lines = source.split("\n");

	// Output dimensions
	let errLen = error.token.value.replace(/\t/g, "    ").length;
	let lineNumWidth = lines.length.toString().length;

	let lineNum = (line?: number) => {
		let n = (line !== undefined ? line.toString() : "").padStart(
			lineNumWidth,
			" "
		);

		if (line === loc.line) {
			n = chalk.red(n);
		}

		return chalk.gray(`  ${n} ${BOX_VERTICAL}`);
	};

	let excerpt = lines
		.map((line, i) => ({ num: i + 1, line }))
		.filter(
			({ num }) =>
				num === loc.line || num === loc.line - 1 || num === loc.line + 1
		);

	return [
		`${chalk.bold.cyan(path.relative(process.cwd(), filepath))}:${chalk.yellow(
			loc.line + ":" + loc.col
		)} - ${chalk.red("error")} - ${error.message}`,
		...excerpt.map(({ num, line }) => {
			let i = 0;
			let highlightedLine = "";
			for (const token of tokens.filter(
				(token) => token.type !== TokenType.NEWLINE && token.loc.line === num
			)) {
				let j = token.loc.col - 1;
				if (j > i) {
					let diff = line.slice(i, j);
					highlightedLine += diff;
				}

				let sub = token.value;
				if (token.loc.offset === error.token.loc.offset) {
					sub = chalk.red.italic(sub);
				} else if (token.type === TokenType.COMMENT) {
					sub = chalk.gray(sub);
				} else if (token.type === TokenType.TEXT) {
					sub = chalk.blue(sub);
				}

				highlightedLine += sub;
				i = j + token.value.length;
			}

			let out = `${lineNum(num)} ${highlightedLine.replace(/\t/g, "    ")}`;

			if (num === loc.line) {
				let underline = "";
				for (let i = 0; i < loc.col - 1; i++) {
					const char = line[i];
					underline += char === "\t" ? char : " ";
				}

				underline += "^".repeat(Math.max(1, errLen));

				out += `\n${lineNum()} ${chalk.red(underline.replace(/\t/g, "    "))}`;
			}

			return out;
		}),
	].join("\n");
}

const BOX_VERTICAL = "\u2502";
