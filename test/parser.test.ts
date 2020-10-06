import path from "path";
import { test } from "uvu";
import * as assert from "uvu/assert";
import { parse } from "../src/parser";
import { collectCases } from "./helpers/cases";

for (const testCase of collectCases(path.join(__dirname, "cases"))) {
	testCase.define(test, async () => {
		const [input, output] = await testCase.load("source.caml", "ast.json");
		const result = parse(input);

		assert.fixture(JSON.stringify(result, null, 2), output);
	});
}

test.run();
