import { test } from "uvu";
import * as assert from "uvu/assert";
import { parseDocument } from "../src/parser";
import { allCases } from "./helpers/cases";

let tests = allCases(test, { tokens: "tokens.json", document: "ast.json" });
for (let t of tests) {
	t(({ tokens, document }) => {
		const result = parseDocument(JSON.parse(tokens));
		assert.fixture(JSON.stringify(result, null, 2), document);
	});
}

test.run();
