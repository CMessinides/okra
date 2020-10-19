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

	let errorMsgs: string[] = [];
	for (const [file, source] of sources) {
		if (source === null) continue;

		let tokens = scan(source);
		let doc = parse(tokens);
		if (!doc.ok) {
			for (const error of doc.errors) {
				errorMsgs.push(fmt.parseError(error, source, tokens, file));
			}
		} else {
			console.log(JSON.stringify(resolve(doc), null, 2));
		}
	}

	if (errorMsgs.length) {
		process.exitCode = 1;
		console.error(errorMsgs.join("\n\n"));
	}
}
