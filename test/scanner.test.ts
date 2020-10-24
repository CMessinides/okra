import { test } from "uvu";
import * as assert from "uvu/assert";
import { scan } from "../src/scanner";
import { allCases } from "./helpers/cases";

let tests = allCases(test, { source: "source.caml", tokens: "tokens.json" });
for (let t of tests) {
	t(({ source, tokens }) => {
		const result = scan(source);
		assert.fixture(JSON.stringify(result, null, 2), tokens);
	});
}

test.run();
