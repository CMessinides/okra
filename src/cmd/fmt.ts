import * as path from "path";
import chalk from "chalk";
import { ParseError } from "../ast";

export function error(e: Error) {
	return `${chalk.bold.red("ERROR")}: ${e.message}`;
}

export function fileHeader(filename: string) {
	let relativePath = path.relative(process.cwd(), filename);

	return box(relativePath, chalk.bold.white);
}

export function sourceCode(source: string, error: ParseError) {
	let lines = source.split("\n");
	let { loc } = error.token;
	let col = loc.offset;
	for (const line of lines) {
		if (col <= line.length + 1) {
			break;
		}

		col -= line.length + 1;
	}

	let excerpt = [{ num: loc.line, text: lines[loc.line - 1] }];

	if (loc.line - 1 > 0) {
		excerpt.unshift({
			num: loc.line - 1,
			text: lines[loc.line - 2],
		});
	}

	if (loc.line < lines.length) {
		excerpt.push({
			num: loc.line + 1,
			text: lines[loc.line],
		});
	}

	return excerpt
		.map(({ num, text }) => {
			let lineNumber = num.toString().padStart(4, " ");
			let line = `${chalk.gray(
				BOX_VERTICAL +
					" " +
					(num === loc.line ? chalk.red(lineNumber) : lineNumber) +
					" " +
					BOX_VERTICAL
			)} ${text}`;

			if (num === loc.line) {
				line += "\n" + " ".repeat(9 + col) + chalk.red("^");
				let tokenLength = error.token.value.replace(/\t/g, " ".repeat(4))
					.length;
				if (tokenLength > 1) {
					line += chalk.red("~".repeat(tokenLength - 1));
				}
			}

			return line;
		})
		.concat(hr())
		.join("\n")
		.replace(/\t/g, " ".repeat(4));
}

const BOX_HORIZONTAL = "\u2500";
const BOX_VERTICAL = "\u2502";
const BOX_CORNER_NW = "\u250C";
const BOX_CORNER_NE = "\u2510";
const BOX_CORNER_SE = "\u2518";
const BOX_CORNER_SW = "\u2514";

function hr() {
	let w = Math.min(120, process.stdout.columns);
	return chalk.gray(BOX_HORIZONTAL.repeat(w));
}

function box(text: string, fmt?: chalk.Chalk) {
	let w = Math.min(120, process.stdout.columns);
	let pw = Math.max(w - 2, 0);
	let cw = Math.max(pw - 2, 0);

	if (text.length > cw) {
		text = text.substr(0, cw - 3) + "...";
	} else {
		text = text.padEnd(cw, " ");
	}

	if (fmt) {
		text = fmt(text);
	}

	return [
		chalk.gray(BOX_CORNER_NW + BOX_HORIZONTAL.repeat(pw) + BOX_CORNER_NE),
		chalk.gray(BOX_VERTICAL) + " " + text + " " + chalk.gray(BOX_VERTICAL),
		chalk.gray(BOX_CORNER_SW + BOX_HORIZONTAL.repeat(pw) + BOX_CORNER_SE),
	].join("\n");
}
