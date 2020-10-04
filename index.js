let filenames = process.argv.slice(2)

if (filenames.length === 0) {
	console.log('launching repl')
} else {
	console.log('reading files', filenames)
}
