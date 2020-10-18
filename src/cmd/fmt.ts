import * as path from "path";
import chalk from "chalk";
import { ParseError } from "../ast";
import { highlight } from "./syntax";

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

	let excerpt = [{ line: loc.line, text: lines[loc.line - 1] }];

	if (loc.line - 1 > 0) {
		excerpt.unshift({
			line: loc.line - 1,
			text: lines[loc.line - 2],
		});
	}

	if (loc.line < lines.length) {
		excerpt.push({
			line: loc.line + 1,
			text: lines[loc.line],
		});
	}

	return excerpt
		.map(({ line, text }) => {
			let lineNumber = line.toString().padStart(4, " ");
			let output = `${chalk.gray(
				BOX_VERTICAL +
					" " +
					(line === loc.line ? chalk.red(lineNumber) : lineNumber) +
					" " +
					BOX_VERTICAL
			)} ${highlight(text)}`;

			if (line === loc.line) {
				output += "\n" + " ".repeat(9 + loc.col - 1) + chalk.red("^");
				let tokenLength = error.token.value.replace(/\t/g, " ".repeat(4))
					.length;
				if (tokenLength > 1) {
					output += chalk.red("~".repeat(tokenLength - 1));
				}
			}

			return output;
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
	let w = process.stdout.columns;
	return chalk.gray(BOX_HORIZONTAL.repeat(w));
}

function box(text: string, fmt?: chalk.Chalk) {
	let w = process.stdout.columns;
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
