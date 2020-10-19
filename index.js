const { readFileSync } = require("fs");
const { scan } = require("./dist/scanner");
const { prettyPrint } = require("./dist/pretty-printer");
const { parse } = require("./dist/parser");
const { resolve } = require("./dist/resolver");

const commands = new Set(["scan", "print", "parse", "resolve"]);
if (!commands.has(process.argv[2])) {
	if (process.argv[2] !== undefined) {
		console.error(`ERROR: Unrecognized command: ${process.argv[2]}.`);
	} else {
		console.error("ERROR: No command provided.");
	}
	console.error("Available commands:");
	for (let command of commands) {
		console.error(`\tcaml ${command} [file]`);
	}
	process.exit(1);
}

let command = process.argv[2];

if (process.argv[3] === undefined) {
	console.error("ERROR: No input file provided.");
	console.error(`Usage: caml ${command} [file]`);
	process.exit(1);
}

let file = process.argv[3];
let source;
try {
	source = readFileSync(file, "utf-8");
} catch (e) {
	console.error(`ERROR: Could not read input file ${file}:`);
	console.error(e.message);
	process.exit(1);
}

let tokens = scan(source);
if (command === "scan") {
	console.log(JSON.stringify(tokens, null, 2));
	process.exit(0);
}

if (command === "print") {
	console.log(prettyPrint(source, tokens));
	process.exit(0);
}

let document = parse(tokens);
if (command === "parse") {
	console.log(JSON.stringify(document, null, 2));
	process.exit(0);
}

// command === "resolve"
console.log(JSON.stringify(resolve(document), null, 2));
