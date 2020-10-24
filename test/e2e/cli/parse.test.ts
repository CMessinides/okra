import { fork } from "child_process";
import path from "path";
import type { Readable } from "stream";
import { test } from "uvu";
import * as assert from "uvu/assert";
import type { CamlDocument } from "../../../src/ast";
import { allCases } from "../../helpers/cases";

async function consume(stream: Readable) {
	let data = "";

	for await (let chunk of stream) {
		data += chunk;
	}

	return data;
}

let tests = allCases(test, {
	document: "ast.json",
	stdout: "output.json",
	stderr: ["cli/parse/stderr.txt", { optional: true }],
});
for (let t of tests) {
	t(async ({ document, stdout, stderr }, { filepath }) => {
		let { ok } = JSON.parse(document) as CamlDocument;

		let cmd = fork(
			"bin/caml.js",
			["parse", path.join(filepath, "source.caml")],
			{
				stdio: "pipe",
				env: {
					FORCE_COLOR: "0",
				},
			}
		);

		if (ok) {
			assert.fixture(await consume(cmd.stdout!), stdout + "\n");
		} else {
			assert.fixture(await consume(cmd.stderr!), stderr!);
		}
	});
}

test.run();
