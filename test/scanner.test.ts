import path from "path";
import { test } from "uvu";
import * as assert from "uvu/assert";
import { scan } from "../src/scanner";
import { collectCases } from "./helpers/cases";

for (const testCase of collectCases(path.join(__dirname, "scanner", "cases"))) {
	testCase.define(test, async () => {
		const [input, output] = await testCase.load();
		const result = scan(input);

		assert.fixture(JSON.stringify(result, null, 2), output);
	});
}

test.run();
