class Noun {
	readonly root: string;

	constructor(root: string) {
		this.root = root;
	}

	count(n: number): string {
		return `${n} ${n === 1 ? this.root : this.root + "s"}`;
	}
}

export function noun(word: string): Noun {
	return new Noun(word);
}
