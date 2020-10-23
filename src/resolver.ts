import { CamlDocument, CamlList, CamlType, CamlValue } from "./ast";

export function resolve(document: CamlDocument): List {
	return walk(document.root);
}

function walk(list: CamlList): List {
	return list.associative ? walkObj(list) : walkArray(list);
}

function walkObj(list: CamlList): AssociativeList {
	let obj: any = {};

	for (const entry of list.entries) {
		obj[entry.key!.value] = resolveValue(entry.value);
	}

	return obj;
}

function walkArray(list: CamlList): NonAssociativeList {
	return list.entries.map((entry) => resolveValue(entry.value));
}

function resolveValue(value: CamlValue): Value {
	if (value.type === CamlType.LIST) {
		return walk(value);
	}

	return value.value;
}

export type Value = number | boolean | string | List;
export type List = AssociativeList | NonAssociativeList;
export type AssociativeList = { [key: string]: Value };
export type NonAssociativeList = Value[];
