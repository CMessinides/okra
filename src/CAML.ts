import { parseDocument } from "./parser";
import {
	resolve,
	List,
	NonAssociativeList,
	AssociativeList,
	Value,
} from "./resolver";
import { scan } from "./scanner";

export function parse(source: string): List {
	let tokens = scan(source);
	let doc = parseDocument(tokens);

	if (!doc.ok) {
		throw new SyntaxError(doc.errors[0].message);
	}

	return resolve(doc);
}

export function stringify(object: List): string {
	return stringifyObject(object, { depth: 0 });
}

function stringifyObject(object: List, state: StringiferState): string {
	return Array.isArray(object)
		? stringifyArray(object, state)
		: stringifyDict(object, state);
}

function stringifyArray(
	array: NonAssociativeList,
	state: StringiferState
): string {
	let output = "";

	for (const value of array) {
		output +=
			"\t".repeat(state.depth) +
			stringifyValue(value, { ...state, depth: state.depth + 1 });
	}

	return output;
}

function stringifyDict(
	object: AssociativeList,
	state: StringiferState
): string {
	let output = "";

	for (const [key, value] of Object.entries(object)) {
		output +=
			"\t".repeat(state.depth) +
			key +
			stringifyValue(value, { ...state, depth: state.depth + 1 });
	}

	return output;
}

function stringifyValue(value: Value, state: StringiferState): string {
	if (typeof value === "object" && value !== null) {
		return "/\n" + stringifyObject(value, { ...state, depth: state.depth + 1 });
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

	throw new TypeError(`"${value}" cannot be converted to CAML`);
}

interface StringiferState {
	depth: number;
}
