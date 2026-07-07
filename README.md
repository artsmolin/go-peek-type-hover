<p align="right">English · <a href="README.md">Русский</a></p>

<h1 align="center">Go Peek Type Hover</h1>

<p align="center">
  A VS Code extension that shows the <b>full type definition</b> of a variable right inside the hover tooltip in Go files — no jump required.
</p>

---

## Why

The default `gopls` hover only shows the type's name:

```go
var cfg AppConfig
//       ^ hover: var cfg pkg.AppConfig
```

To see what's actually inside `AppConfig`, you have to jump to its definition (`Go to Definition`) and lose your place. **Go Peek Type Hover** fixes that: hover over a variable and instantly see the full struct or interface body without leaving the current line.

## Features

- 🔍 **Full type definition in the hover tooltip** — the body of a `struct { ... }`, `interface { ... }`, or the declaration line of an alias type.
- 🧩 **Complements, not replaces**, the standard `gopls` hover — both blocks are shown together.
- 🛡️ **Reliable fallback** — if `gopls` is temporarily unavailable, a built-in brace parser kicks in.
- ⚙️ **Configurable output length** so huge structs don't flood the tooltip.

## How it works

1. When a hover is requested in a Go file, the extension calls the built-in `vscode.executeTypeDefinitionProvider` command, which uses `gopls` (via the `golang.go` extension) to return the location of the variable's type declaration.
2. `vscode.executeDocumentSymbolProvider` is then used to find the symbol enclosing that location, and its full text is extracted.
3. If no symbol is found (e.g. `gopls` is temporarily unavailable), a fallback brace parser scans the file text directly.
4. The result is appended as a separate **Peek type definition** block — VS Code merges hovers from multiple providers, so the regular `gopls` hover stays in place too.

## Requirements

- The official [Go extension (`golang.go`)](https://marketplace.visualstudio.com/items?itemName=golang.Go) must be installed — it's used as the `gopls` backend, since this command relies on the same LSP provider.

## Installation

### From `.vsix`

```bash
code --install-extension go-peek-type-hover-0.0.1.vsix
```

### From source (development mode)

```bash
git clone <repository-url>
cd go-peek-type-hover
npm install
npm run compile
```

Then in VS Code press `F5` (the `Run Extension` configuration) to open a new Extension Development Host window, where you can open any Go project and hover over a variable.

## Settings

| Setting                     | Default | Description                                                        |
| ---------------------------- | :-----: | -------------------------------------------------------------------- |
| `goPeekTypeHover.maxLines`   |  `60`   | Maximum number of lines of the type definition shown in the hover  |

## License

[MIT](LICENSE)
