import path from "path";
import chalk from "chalk";
import fs from "fs";
import type { Arguments } from "yargs";
import { parseDocument } from "../../parser";
import { Printer } from "../../printer";
import { resolve } from "../../resolver";
import { scan } from "../../scanner";
import * as fmt from "../lib/fmt";
import { createErrorRenderer } from "../lib/pretty-print";
export type ParseArguments = Arguments<{ files: string[] }>;

export async function parse({ files }: ParseArguments) {
	if (!files) {
		console.error(fmt.error(new Error(`No files provided`)));
		process.exitCode = 1;
		return;
	}

	let sources = new Map(
		await Promise.all(
			files.map(async (file) => {
				try {
					let data = await fs.promises.readFile(file, "utf-8");
					return [file, data] as [string, string];
				} catch (e) {
					console.error(
						fmt.error(new Error(`Could not read '${file}': ${e.message}`))
					);
					process.exitCode = 1;
					return [file, null] as [string, null];
				}
			})
		)
	);

	for (const [file, source] of sources) {
		if (source === null) continue;

		let tokens = scan(source);
		let doc = parseDocument(tokens);
		if (!doc.ok) {
			process.exitCode = 1;
			for (const error of doc.errors) {
				let printer = new Printer(source, tokens);
				printer = printer.withRenderer(
					createErrorRenderer(error, printer.lines.length)
				);
				console.error(
					`${chalk.bold.cyan(
						path.relative(process.cwd(), file)
					)}:${chalk.yellow(
						error.token.loc.line + ":" + error.token.loc.col
					)} - ${chalk.red("error")} - ${error.message}` +
						"\n" +
						printer.print() +
						"\n"
				);
			}
		} else {
			console.log(JSON.stringify(resolve(doc), null, 2));
		}
	}
}
