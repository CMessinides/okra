import fs from "fs";
import path from "path";
import { uvu } from "uvu";
import { sentenceCase } from "sentence-case";

enum CaseFlag {
	SKIP,
	ONLY,
	NONE,
}

interface CaseDefinition {
	name: string;
	filepath: string;
	flag: CaseFlag;
}

const DIR = "test/__cases";
export const CASES: CaseDefinition[] = fs
	.readdirSync(DIR, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => {
		let { name } = entry;
		let filepath = path.join(DIR, name);

		let flag = CaseFlag.NONE;
		if (name.startsWith("skip.")) {
			flag = CaseFlag.SKIP;
			name = name.slice(5);
		} else if (name.startsWith("only.")) {
			flag = CaseFlag.ONLY;
			name = name.slice(5);
		}

		name = sentenceCase(name);

		return {
			name,
			filepath,
			flag,
		};
	});

type FileConfig = Record<string, string | [string, FileConfigOptions]>;
interface FileConfigOptions {
	optional?: boolean;
}

type CaseFiles<F extends FileConfig> = {
	[k in keyof F]: F[k] extends [string, { optional: true }]
		? string | null
		: string;
};
type CaseCallback<F extends FileConfig> = (
	ctx: CaseFiles<F>,
	info: CaseDefinition
) => Promise<void> | void;
type CaseTest<F extends FileConfig> = (callback: CaseCallback<F>) => void;

export function allCases<F extends FileConfig>(
	test: uvu.Test<any>,
	config: F
): CaseTest<F>[] {
	return CASES.map((info) => {
		return function (callback) {
			let { flag, name } = info;

			if (flag === CaseFlag.SKIP) {
				test.skip(name);
			} else if (flag === CaseFlag.ONLY) {
				test.only(name, preload(callback, info, config));
			} else {
				test(name, preload(callback, info, config));
			}
		};
	});
}

export function slurpCaseFiles<F extends FileConfig>(config: F) {
	let configs = CASES.map(({ filepath }) => normalizeConfig(filepath, config));

	return Promise.all(
		configs.map(async (caseFiles) => {
			let ctx: Record<string, string | null> = {};

			for (const { key, contents } of await Promise.all(
				caseFiles.map(readCaseFile)
			)) {
				ctx[key] = contents;
			}

			return ctx as CaseFiles<F>;
		})
	);
}

function preload<F extends FileConfig>(
	callback: CaseCallback<F>,
	info: CaseDefinition,
	config: F
): uvu.Callback<any> {
	let caseFiles = normalizeConfig(info.filepath, config);

	return async function () {
		let ctx: Record<string, string | null> = {};

		for (const { key, contents } of await Promise.all(
			caseFiles.map(readCaseFile)
		)) {
			ctx[key] = contents;
		}

		return callback(ctx as CaseFiles<F>, info);
	};
}

async function readCaseFile({ key, filepath, optional }: CaseFile) {
	try {
		return {
			key,
			contents: await fs.promises.readFile(filepath, "utf-8"),
		};
	} catch (error) {
		if (!fileDoesNotExist(error)) {
			throw error;
		}

		if (!optional) {
			throw new MissingCaseFileError(filepath);
		}

		return { key, contents: null };
	}
}

interface CaseFile {
	key: string;
	filepath: string;
	optional: boolean;
}

function normalizeConfig(dir: string, config: FileConfig): CaseFile[] {
	return Object.entries(config).map(([key, value]) => {
		let name = Array.isArray(value) ? value[0] : value;
		let filepath = path.join(dir, name);
		let options = Array.isArray(value) ? value[1] : {};

		return {
			key,
			filepath,
			optional: options.optional ?? false,
		};
	});
}

class MissingCaseFileError extends Error {
	constructor(filepath: string) {
		let name = path.basename(filepath);
		super(
			`Test case is missing file: ${name}. Be sure that ${filepath} exists.`
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
