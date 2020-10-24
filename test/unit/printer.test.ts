import { test } from "uvu";
import * as assert from "uvu/assert";
import { Printer, Renderer, createRenderer } from "../../src/printer";

test("default printer (no-op)", () => {
	let source = `
key: value
my list/
	= 2
	= 4
	`;

	let printer = new Printer(source);

	assert.equal(printer.print(), source);
});

test("printer with custom renderer", () => {
	let source = `
# A comment
key: value
	`.trim();

	let customRenderer: Renderer = createRenderer({
		key(token) {
			return `**${token.value}**`;
		},
		comment(token) {
			return `<span style="color: gray;">${token.value}</span>`;
		},
	});

	let printer = new Printer(source).withRenderer(customRenderer);

	assert.equal(
		printer.print(),
		`
<span style="color: gray;"># A comment</span>
**key**: value
		`.trim()
	);
});

test.run();
