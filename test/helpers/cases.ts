import { test as uvuTest, Callback } from "uvu";
import fs from "fs";
import path from "path";
import { sentenceCase } from "sentence-case";

export function collectCases(dir: string) {
	return fs
		.readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => {
			const { name } = entry;
			return TestCase.from(name, path.join(dir, name));
		});
}

class TestCase {
	readonly name: string;
	readonly dir: string;
	readonly flag?: string;

	static from(name: string, dir: string) {
		let flag: string | undefined;
		const hasFlag = name.startsWith("skip.") || name.startsWith("only.");
		if (hasFlag) {
			const [flagValue, ...rest] = name.split(".");
			flag = flagValue;
			name = rest.join(".");
		}

		name = sentenceCase(name);

		return new TestCase(name, dir, flag);
	}

	constructor(name: string, dir: string, flag?: string) {
		this.name = name;
		this.dir = dir;
		this.flag = flag;
	}

	define(test: typeof uvuTest, fn: Callback<Record<string, any>>) {
		if (this.flag === "only") {
			test.only(this.name, fn);
		} else if (this.flag === "skip") {
			test.skip(this.name, fn);
		} else {
			test(this.name, fn);
		}
	}

	load(input: string, output: string): Promise<[string, string]> {
		const inputFile = path.join(this.dir, input);
		const outputFile = path.join(this.dir, output);

		return Promise.all(
			[inputFile, outputFile].map((file) => fs.promises.readFile(file, "utf-8"))
		).catch((error) => {
			if (fileDoesNotExist(error)) {
				throw new MissingCaseFileError(error.path);
			} else {
				throw error;
			}
		}) as Promise<[string, string]>;
	}
}

class MissingCaseFileError extends Error {
	constructor(filePath: string) {
		let name = path.basename(filePath);
		super(
			`Test case is missing file: ${name}. Be sure that ${path.relative(
				process.cwd(),
				filePath
			)} exists.`
		);
	}
}

interface FileDoesNotExistError extends Error {
	code: "ENOENT";
	path: string;
}

function fileDoesNotExist(error: any): error is FileDoesNotExistError {
	return error.code === "ENOENT";
}
