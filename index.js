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
	let rows = tokens.map(({ type, lexeme, loc }) => [
		loc.offset,
		type,
		JSON.stringify(lexeme),
		`${loc.line}:${loc.col}`,
	]);
	let lines = padAll(rows);
	console.log("--- [ TOKENS ] ---");
	for (const line of lines) {
		console.log(line);
	}
	console.log("------------------");
}

/**
 *
 * @param {(string|number)[][]} rows
 */
function padAll(rows) {
	let columnMaxes = [];

	for (const row of rows) {
		for (let i = 0; i < row.length; i++) {
			let length = row[i].toString().length;
			let currentMax = columnMaxes[i] || 0;
			if (currentMax < length) {
				columnMaxes[i] = length;
			}
		}
	}

	return rows.map((row) =>
		row
			.map((cell, i) => {
				let max = columnMaxes[i];
				if (typeof cell === "number") {
					return cell.toString().padStart(max, "0");
				} else {
					return cell.toString().padEnd(max, " ");
				}
			})
			.join(" ".repeat(4))
	);
}
