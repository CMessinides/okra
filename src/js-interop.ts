export type JSValue = number | boolean | string | JSList;
export type JSList = JSObj | JSArray;
export type JSObj = { [key: string]: JSValue };
export type JSArray = JSValue[];

export namespace JS {
	export type Value = number | boolean | string | List;
	export type List = Obj | Array;
	export type Obj = { [key: string]: Value };
	export type Array = Value[];
}
