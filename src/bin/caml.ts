import yargs from "yargs";
import { parse } from "./cmd/parse";

yargs
	.scriptName("caml")
	.command(
		"parse [files..]",
		"Parse the given CAML files and print them as JSON",
		(yargs) => {
			yargs.positional("files", {
				describe: "CAML files to read and parse",
				normalize: true,
			});
		},
		parse
	)
	.help()
	.version()
	.parse();
