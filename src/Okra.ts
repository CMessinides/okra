import { parseDocument } from "./parser";
import { resolve } from "./resolver";
import { scan } from "./scanner";

export function parse(source: string) {
	let tokens = scan(source);
	let doc = parseDocument(tokens);

	if (!doc.ok) {
		throw new SyntaxError(doc.errors[0].message);
	}

	return resolve(doc);
}

export { stringify } from "./stringifier";
