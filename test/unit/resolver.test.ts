import { test } from "uvu";
import * as assert from "uvu/assert";
import { resolve } from "../../src/resolver";
import { allCases } from "../__helpers/cases";

let tests = allCases(test, { document: "ast.json", output: "output.json" });
for (let t of tests) {
	t(({ document, output }) => {
		const result = resolve(JSON.parse(document));
		assert.fixture(JSON.stringify(result, null, 2), output);
	});
}

test.run();
