import * as path from "path";
import chalk from "chalk";
import { SyntaxError } from "../../ast";
import { Token } from "../../tokens";
import { prettyPrintError } from "../../pretty-printer";

export function error(e: Error) {
	return `${chalk.bold.red("ERROR")}: ${e.message}`;
}

export function parseError(
	error: SyntaxError,
	source: string,
	tokens: Token[],
	filepath: string
) {
	let { loc } = error.token;

	return [
		`${chalk.bold.cyan(path.relative(process.cwd(), filepath))}:${chalk.yellow(
			loc.line + ":" + loc.col
		)} - ${chalk.red("error")} - ${error.message}`,
		prettyPrintError(error, source, tokens),
	].join("\n\n");
}
