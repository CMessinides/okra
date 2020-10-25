import { fork } from "child_process";
import path from "path";
import type { Readable } from "stream";
import { test } from "uvu";
import * as assert from "uvu/assert";
import type { CAML } from "../../../src/ast";
import { allCases } from "../../__helpers/cases";

async function consume(stream: Readable) {
	let data = "";

	for await (let chunk of stream) {
		data += chunk;
	}

	return data;
}

function runParseCmd(filepath?: string) {
	let args = ["parse"];

	if (filepath) {
		args.push(filepath);
	}

	let cmd = fork("src/bin/caml.ts", args, {
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

let tests = allCases(test, {
	document: "ast.json",
	stdout: "output.json",
	stderr: ["cli/parse/stderr.txt", { optional: true }],
});
for (let t of tests) {
	t(async ({ document, stdout, stderr }, { filepath }) => {
		let { ok } = JSON.parse(document) as CAML.Document;

		let cmd = runParseCmd(path.join(filepath, "source.caml"));

		if (ok) {
			assert.fixture(await cmd.stdout(), stdout + "\n");
		} else {
			assert.fixture(await cmd.stderr(), stderr!);
		}
	});
}

test("no file provided", async () => {
	let cmd = runParseCmd();

	assert.match(await cmd.stderr(), "No files provided");
});

test("file does not exist", async () => {
	let cmd = runParseCmd("does-not-exist.caml");

	assert.match(await cmd.stderr(), "Could not read 'does-not-exist.caml'");
});

test.run();
