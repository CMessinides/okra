import path from "path";
import { test } from "uvu";
import * as assert from "uvu/assert";
import { parseDocument } from "../src/parser";
import { collectCases } from "./helpers/cases";

for (const testCase of collectCases(path.join(__dirname, "cases"))) {
	testCase.define(test, async () => {
		const [input, output] = await testCase.load("tokens.json", "ast.json");
		const result = parseDocument(JSON.parse(input));

		assert.fixture(JSON.stringify(result, null, 2), output);
	});
}

test.run();
