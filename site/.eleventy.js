const outdent = require("outdent");
const { Printer, createRenderer } = require("@okra-lang/okra/dist/printer");

/**
 * @param {string} type
 * @returns {(chars: string) => string}
 */
function colorizeChars(type) {
	return function (chars) {
		return `<span class="okra-${type}">${chars}</span>`;
	};
}

/**
 * @param {string} type
 * @returns {(token: import('@okra-lang/okra/dist/tokens').Token) => string}
 */
function colorizeToken(type) {
	let colorize = colorizeChars(type);
	return function (token) {
		return colorize(token.value);
	};
}

const HTMLRenderer = createRenderer({
	comment: colorizeToken("comment"),
	boolean: colorizeToken("boolean"),
	delimiter: colorizeToken("delimiter"),
	error: colorizeChars("error"),
	key: colorizeToken("key"),
	number: colorizeToken("number"),
	string: colorizeToken("string"),
});

module.exports = function (eleventyConfig) {
	eleventyConfig.addPairedShortcode("okra", function (content) {
		let source = outdent.string("\n" + content);
		let code = new Printer(source).withRenderer(HTMLRenderer).print();

		return `<code>${code}</code>`;
	});

	eleventyConfig.addWatchTarget("./styles.css");
};
