import { readFile } from "fs/promises";
import yargs from "yargs";
import { parse } from "../parser";
import { resolve } from "../resolver";
import { scan } from "../scanner";
import * as fmt from "./fmt";

yargs
	.scriptName("caml")
	.command(
		"$0 [files..]",
		"Parse the given CAML files and print them as JSON",
		(yargs) => {
			yargs.positional("files", {
				describe: "CAML files to read and parse",
				normalize: true,
			});
		},
		main
	)
	.help()
	.version()
	.parse();

async function main({ files }: yargs.Arguments<{ files: string[] }>) {
	if (!files) {
		console.error(fmt.error(new Error(`No files provided`)));
		yargs.showHelp();
		process.exitCode = 1;
		return;
	}

	let sources = new Map(
		await Promise.all(
			files.map(async (file) => {
				try {
					let data = await readFile(file, "utf-8");
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

	for (const [file, data] of sources) {
		if (data === null) continue;

		let doc = parse(scan(data));
		if (!doc.ok) {
			console.error(fmt.fileHeader(file));

			for (const error of doc.errors) {
				console.error(fmt.error(error) + "\n");
				console.error(fmt.sourceCode(data, error));
			}
			process.exitCode = 1;
		} else {
			console.log(JSON.stringify(resolve(doc), null, 2));
		}
	}
}
