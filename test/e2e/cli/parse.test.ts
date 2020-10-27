import { fork } from "child_process";
import path from "path";
import type { Readable } from "stream";
import { test } from "uvu";
import * as assert from "uvu/assert";
import { CASES, slurpCaseFiles } from "../../__helpers/cases";

async function consume(stream: Readable) {
	let data = "";

	for await (let chunk of stream) {
		data += chunk;
	}

	return data;
}

function runParseCmd(...filepaths: string[]) {
	let cmd = fork("src/bin/okra.ts", ["parse", ...filepaths], {
		stdio: "pipe",
		execArgv: ["-r", "ts-node/register/transpile-only"],
		env: {
			FORCE_COLOR: "0",
		},
	});

	return {
		stdout() {
			return consume(cmd.stdout!);
		},
		stderr() {
			return consume(cmd.stderr!);
		},
	};
}

test("no file provided", async () => {
	let cmd = runParseCmd();

	assert.match(await cmd.stderr(), "No files provided");
});

test("file does not exist", async () => {
	let cmd = runParseCmd("does-not-exist.okra");

	assert.match(await cmd.stderr(), "Could not read 'does-not-exist.okra'");
});

test("all case files", async () => {
	let sources = CASES.map(({ filepath }) => path.join(filepath, "source.okra"));
	let fixtures = await slurpCaseFiles({
		stdout: "output.json",
		stderr: ["cli/parse/stderr.txt", { optional: true }],
	});

	let stdout =
		fixtures
			.filter(({ stderr }) => stderr === null)
			.map(({ stdout }) => stdout)
			.join("\n") + "\n";
	let stderr = fixtures
		.map(({ stderr }) => stderr)
		.filter(Boolean)
		.join("");

	let cmd = runParseCmd(...sources);

	assert.equal(await cmd.stdout(), stdout);
	assert.equal(await cmd.stderr(), stderr);
});

test.run();
