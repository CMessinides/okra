import yargs from "yargs";
import { parse } from "./cmd/parse";

yargs
	.scriptName("okra")
	.command(
		"parse [files..]",
		"Parse the given Okra files and print them as JSON",
		(yargs) => {
			yargs.positional("files", {
				describe: "Okra files to read and parse",
				normalize: true,
			});
		},
		parse
	)
	.help()
	.version()
	.parse();
