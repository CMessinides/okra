import { CAML } from "./ast";
import { JS } from "./js-interop";

export function resolve(document: CAML.Document): JS.List {
	return walk(document.root);
}

function walk(list: CAML.List): JS.List {
	return list.associative ? walkObj(list) : walkArray(list);
}

function walkObj(list: CAML.List): JS.Obj {
	let obj: any = {};

	for (const entry of list.entries) {
		if (entry.key === null) continue;
		obj[entry.key.value] = resolveValue(entry.value);
	}

	return obj;
}

function walkArray(list: CAML.List): JS.Array {
	return list.entries.map((entry) => resolveValue(entry.value));
}

function resolveValue(value: CAML.Value): JS.Value {
	if (value.type === CAML.Type.LIST) {
		return walk(value);
	}

	return value.value;
}
