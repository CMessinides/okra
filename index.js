const { readFileSync } = require("fs");
const { scan } = require("./dist/scanner");

if (process.argv[2] === undefined) {
	console.error("ERROR: No input file provided.");
	console.error("Usage: caml [file]");
	process.exit(1);
} else {
	let file = process.argv[2];
	let data;
	try {
		data = readFileSync(file, "utf-8");
	} catch (e) {
		console.error(`ERROR: Could not read input file ${file}:`);
		console.error(e.message);
		process.exit(1);
	}

	let tokens = scan(data);
	console.log(JSON.stringify(tokens, null, 2));
}
