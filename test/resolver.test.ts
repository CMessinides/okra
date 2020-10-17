import path from "path";
import { test } from "uvu";
import * as assert from "uvu/assert";
import { resolve } from "../src/resolver";
import { collectCases } from "./helpers/cases";

for (const testCase of collectCases(path.join(__dirname, "cases"))) {
	testCase.define(test, async () => {
		const [input, output] = await testCase.load("ast.json", "output.json");
		const result = resolve(JSON.parse(input));

		assert.fixture(JSON.stringify(result, null, 2), output);
	});
}

test.run();
