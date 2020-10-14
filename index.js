const { readFileSync } = require("fs");
const { scan } = require("./dist/scanner");
const { parse } = require("./dist/parser");

const commands = new Set(["scan", "parse"]);
if (!commands.has(process.argv[2])) {
	if (process.argv[2] !== undefined) {
		console.error(`ERROR: Unrecognized command: ${process.argv[2]}.`);
	} else {
		console.error("ERROR: No command provided.");
	}
	console.error("Available commands:");
	console.error("\tcaml scan [file]");
	console.error("\tcaml parse [file]");
	process.exit(1);
}

let command = process.argv[2];

if (process.argv[3] === undefined) {
	console.error("ERROR: No input file provided.");
	console.error(`Usage: caml ${command} [file]`);
	process.exit(1);
}

let file = process.argv[3];
let data;
try {
	data = readFileSync(file, "utf-8");
} catch (e) {
	console.error(`ERROR: Could not read input file ${file}:`);
	console.error(e.message);
	process.exit(1);
}

if (command === "scan") {
	console.log(JSON.stringify(scan(data), null, 2));
	process.exit(0);
}

if (command === "parse") {
	console.log(JSON.stringify(parse(data), null, 2));
	process.exit(0);
}
