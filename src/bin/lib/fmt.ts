import chalk from "chalk";

export function error(e: Error) {
	return `${chalk.bold.red("ERROR")}: ${e.message}`;
}
