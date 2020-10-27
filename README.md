# Okra

A digestible language for data and configuration.

**Okra is an early alpha right now.** I'm gathering feedback on the language at the moment, and there is nothing close to a formal spec yet. The code in this repo should be considered a prototype.

## Example

```okra
# Okra consists of simple key-value pairs.
# Each value's type is indicated by the delimiter after the key.

# Strings are delimited by ":"
hello: okra
# Keys and strings can contain spaces.
biological name: Abelmoschus esculentus

# Numbers, delimited by "="
cpus= 16
# Floats and scientific notation are supported.
threshold= 0.8
minimum= 1.1e-10

# Booleans, delimited by "?"
autocomplete? true
# Plain English and shorthand booleans
validate config? yes
dev? n
# Booleans are case insensitive.
verbose? Y
skip tests? False

# (Comments are supported, too.)

# Lists are opened with "/"
packages/
	# Okra uses indentation for nesting
	cli: 0.1.2
	validator: 2.3.18

# Leave off the keys to create a sequential list (array)
benchmarks/
	= 4.101
	= 4.533
	= 3.970

# Sequential lists can contain any type
mixed bag/
	= 2
	: text
	? true
	/
		nested lists? true
```

## Inspiration

Okra is designed for intuitive reading and writing by humans, for use in configuration files, manifests, and the like. It draws inspiration from many sources:

- Like [YAML](https://www.yaml.org), Okra uses indentation for nesting and tries to avoid syntactic noise like brackets, braces, and quote marks.
- Like [JSON](https://www.json.org), values are strongly and clearly typed.
- Like [TOML](https://toml.io), Okra doesn't aim to cover every possible data structure. You can't encode a string, number, or boolean on its own like you can in JSON, for instance; the root data must be a list.

## Roadmap

- [ ] Backslash escapes
  - [ ] Unicode
  - [ ] Whitespace
  - [ ] Delimiters
- [ ] Raw characters type
- [ ] Multiline strings
- [ ] Null type

## License

MIT
