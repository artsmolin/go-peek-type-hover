import * as vscode from 'vscode';

const GO_LANGUAGE = 'go';

export function activate(context: vscode.ExtensionContext): void {
  const provider = vscode.languages.registerHoverProvider(GO_LANGUAGE, {
    provideHover,
  });
  context.subscriptions.push(provider);
}

export function deactivate(): void {
  // ничего не требуется
}

async function provideHover(
  document: vscode.TextDocument,
  position: vscode.Position,
  token: vscode.CancellationToken
): Promise<vscode.Hover | undefined> {
  const wordRange = document.getWordRangeAtPosition(position);
  if (!wordRange) {
    return undefined;
  }

  const raw = await vscode.commands.executeCommand<
    (vscode.Location | vscode.LocationLink)[]
  >('vscode.executeTypeDefinitionProvider', document.uri, position);

  if (token.isCancellationRequested || !raw || raw.length === 0) {
    return undefined;
  }

  const target = normalizeLocation(raw[0]);
  if (!target) {
    return undefined;
  }

  const definitionText = await readTypeDefinitionText(target.uri, target.range.start);
  if (!definitionText) {
    return undefined;
  }

  const maxLines = vscode.workspace
    .getConfiguration('goPeekTypeHover')
    .get<number>('maxLines', 60);

  const trimmed = clampLines(definitionText, maxLines);

  const markdown = new vscode.MarkdownString();
  markdown.appendMarkdown('**Peek type definition**\n');
  markdown.appendCodeblock(trimmed, GO_LANGUAGE);

  return new vscode.Hover(markdown, wordRange);
}

function normalizeLocation(
  loc: vscode.Location | vscode.LocationLink
): { uri: vscode.Uri; range: vscode.Range } | undefined {
  if ('targetUri' in loc) {
    return { uri: loc.targetUri, range: loc.targetSelectionRange ?? loc.targetRange };
  }
  if ('uri' in loc) {
    return { uri: loc.uri, range: loc.range };
  }
  return undefined;
}

async function readTypeDefinitionText(
  uri: vscode.Uri,
  start: vscode.Position
): Promise<string | undefined> {
  const doc = await vscode.workspace.openTextDocument(uri);

  const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
    'vscode.executeDocumentSymbolProvider',
    uri
  );

  if (symbols && symbols.length > 0) {
    const symbol = findEnclosingSymbol(symbols, start);
    if (symbol) {
      return doc.getText(symbol.range).trim();
    }
  }

  return extractBraceBlockFallback(doc, start);
}

function findEnclosingSymbol(
  symbols: vscode.DocumentSymbol[],
  pos: vscode.Position
): vscode.DocumentSymbol | undefined {
  for (const symbol of symbols) {
    if (symbol.range.contains(pos)) {
      return findEnclosingSymbol(symbol.children, pos) ?? symbol;
    }
  }
  return undefined;
}

function extractBraceBlockFallback(
  doc: vscode.TextDocument,
  start: vscode.Position
): string | undefined {
  const startLine = start.line;
  const searchLimit = Math.min(doc.lineCount, startLine + 5);

  let braceLine = -1;
  let braceCol = -1;
  for (let line = startLine; line < searchLimit; line++) {
    const text = doc.lineAt(line).text;
    const from = line === startLine ? start.character : 0;
    const idx = text.indexOf('{', from);
    if (idx !== -1) {
      braceLine = line;
      braceCol = idx;
      break;
    }
  }

  if (braceLine === -1) {
    // Простой alias/underlying-тип без блока — одна строка объявления.
    return doc.lineAt(startLine).text.trim();
  }

  let depth = 0;
  let endLine = braceLine;
  for (let line = braceLine; line < doc.lineCount; line++) {
    const text = doc.lineAt(line).text;
    const from = line === braceLine ? braceCol : 0;
    let closed = false;
    for (let col = from; col < text.length; col++) {
      const ch = text[col];
      if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          endLine = line;
          closed = true;
          break;
        }
      }
    }
    if (closed) {
      break;
    }
  }

  const range = new vscode.Range(startLine, 0, endLine, doc.lineAt(endLine).text.length);
  return doc.getText(range).trim();
}

function clampLines(text: string, maxLines: number): string {
  const lines = text.split('\n');
  if (lines.length <= maxLines) {
    return text;
  }
  return lines.slice(0, maxLines).join('\n') + '\n// ... сокращено ...';
}
