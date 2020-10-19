import { readFile } from "fs/promises";
import type { Arguments } from "yargs";
import { parseDocument } from "../../parser";
import { resolve } from "../../resolver";
import { scan } from "../../scanner";
import * as fmt from "../lib/fmt";

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
		let doc = parseDocument(tokens);
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
		for (const errorMsg of errorMsgs) {
			console.error(errorMsg + "\n");
		}
	}
}
