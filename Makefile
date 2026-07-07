.PHONY: build

build:
	npm install
	npm run compile
	npx vsce package
