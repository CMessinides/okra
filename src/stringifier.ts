import { JS } from "./js-interop";

export function stringify(object: JS.List): string {
	if (object === null || object === undefined) {
		throw new TypeError(`"${object}" cannot be converted to Okra`);
	}

	return stringifyObject(object, { depth: 0 });
}

function stringifyObject(object: JS.List, state: StringiferState): string {
	return Array.isArray(object)
		? stringifyArray(object, state)
		: stringifyDict(object, state);
}

function stringifyArray(array: JS.Array, state: StringiferState): string {
	let output = "";

	for (const value of array) {
		output +=
			"\t".repeat(state.depth) +
			stringifyValue(value, { ...state, depth: state.depth + 1 });
	}

	return output;
}

function stringifyDict(object: JS.Obj, state: StringiferState): string {
	let output = "";

	for (const [key, value] of Object.entries(object)) {
		output +=
			"\t".repeat(state.depth) +
			key +
			stringifyValue(value, { ...state, depth: state.depth + 1 });
	}

	return output;
}

function stringifyValue(value: JS.Value, state: StringiferState): string {
	if (typeof value === "object" && value !== null) {
		return "/\n" + stringifyObject(value, state);
	}

	if (typeof value === "string") {
		return ": " + value + "\n";
	}

	if (typeof value === "boolean") {
		return "? " + value + "\n";
	}

	if (typeof value === "number") {
		return "= " + value + "\n";
	}

	throw new TypeError(`"${value}" cannot be converted to Okra`);
}

interface StringiferState {
	depth: number;
}
