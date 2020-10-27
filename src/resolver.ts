import { Okra } from "./ast";
import { JS } from "./js-interop";

export function resolve(document: Okra.Document): JS.List {
	return walk(document.root);
}

function walk(list: Okra.List): JS.List {
	return list.associative ? walkObj(list) : walkArray(list);
}

function walkObj(list: Okra.List): JS.Obj {
	let obj: any = {};

	for (const entry of list.entries) {
		if (entry.key === null) continue;
		obj[entry.key.value] = resolveValue(entry.value);
	}

	return obj;
}

function walkArray(list: Okra.List): JS.Array {
	return list.entries.map((entry) => resolveValue(entry.value));
}

function resolveValue(value: Okra.Value): JS.Value {
	if (value.type === Okra.Type.LIST) {
		return walk(value);
	}

	return value.value;
}
