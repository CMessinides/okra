import { test } from "uvu";
import * as assert from "uvu/assert";
import { stringify } from "../../src/stringifier";

test("empty lists", () => {
	assert.equal(stringify({}), ``);
	assert.equal(stringify([]), ``);
});

test("key-value pairs", () => {
	assert.equal(stringify({ foo: "bar" }), "foo: bar\n");
	assert.equal(stringify({ 2: true }), "2? true\n");
	assert.equal(stringify({ π: 3.14 }), "π= 3.14\n");
});

test("array items", () => {
	assert.equal(stringify([1]), "= 1\n");
	assert.equal(
		stringify([true, "a string", false]),
		`
? true
: a string
? false
`.trimStart()
	);
});

test("nesting", () => {
	assert.equal(
		stringify({
			top_level: {
				nested: true,
			},
		}),
		`
top_level/
	nested? true
`.trimStart()
	);
});

test("kitchen sink", () => {
	assert.equal(
		stringify({
			todos: {
				"improve test coverage": true,
				"run benchmarks": {
					parser: false,
					cli: false,
				},
			},
			empty: [],
			also_empty: {},
			nesting: [
				[
					[
						[
							4,
							{
								description: "a string",
							},
						],
					],
				],
			],
		}),
		`
todos/
	improve test coverage? true
	run benchmarks/
		parser? false
		cli? false
empty/
also_empty/
nesting/
	/
		/
			/
				= 4
				/
					description: a string
`.trimStart()
	);
});

test("invalid values: null and undefined", () => {
	assert.throws(
		//@ts-expect-error
		() => stringify(null),
		/cannot be converted to Okra/
	);
	assert.throws(
		//@ts-expect-error
		() => stringify(undefined),
		/cannot be converted to Okra/
	);
	assert.throws(
		//@ts-expect-error
		() => stringify({ foo: null }),
		/cannot be converted to Okra/
	);
});

test.run();
