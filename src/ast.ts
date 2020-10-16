export class ParseError extends Error {}

export enum CamlType {
	DOCUMENT = "document",
	LIST = "list",
	ENTRY = "entry",
	KEY = "key",
	STRING = "string",
	NUMBER = "number",
	BOOLEAN = "boolean",
}

export interface CamlDocument {
	type: CamlType.DOCUMENT;
	ok: boolean;
	root: CamlList;
	errors: ParseError[];
}

export interface CamlList {
	type: CamlType.LIST;
	associative: boolean;
	entries: CamlEntry[];
}

export interface CamlEntry {
	type: CamlType.ENTRY;
	key: CamlKey | null;
	value: CamlValue;
}

export interface CamlKey {
	type: CamlType.KEY;
	value: string;
}

export type CamlValue = CamlList | CamlString | CamlNumber | CamlBoolean;

export interface CamlString {
	type: CamlType.STRING;
	value: string;
}

export interface CamlNumber {
	type: CamlType.NUMBER;
	value: number;
}

export interface CamlBoolean {
	type: CamlType.BOOLEAN;
	value: boolean;
}
