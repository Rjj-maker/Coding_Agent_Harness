const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
  bgDark: '\x1b[48;5;236m',
  bgCode: '\x1b[48;5;235m',
};

const BOX = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  crossTop: '┬',
  crossBottom: '┴',
  cross: '┼',
  crossLeft: '├',
  crossRight: '┤',
};

function visibleLen(s: string): number {
  let len = 0;
  let inEscape = false;
  for (const ch of s) {
    if (ch === '\x1b') { inEscape = true; continue; }
    if (inEscape) { if (ch === 'm') inEscape = false; continue; }
    const code = ch.codePointAt(0) ?? 0;
    if (code > 0x2000) len += 2;
    else len += 1;
  }
  return len;
}

function padRight(s: string, w: number): string {
  return s + ' '.repeat(Math.max(0, w - visibleLen(s)));
}

function renderTable(lines: string[]): string {
  const rows: string[][] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;
    const cells = trimmed.slice(1, -1).split('|').map(c => c.trim());
    if (cells.every(c => /^[-:]+$/.test(c))) continue;
    rows.push(cells);
  }

  if (rows.length === 0) return '';

  const colCount = Math.max(...rows.map(r => r.length));
  const colWidths: number[] = new Array(colCount).fill(0);
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      colWidths[i] = Math.max(colWidths[i] ?? 0, visibleLen(row[i]));
    }
  }

  const drawRow = (cells: string[], left: string, mid: string, right: string): string =>
    left + cells.map((c, i) => padRight(c, colWidths[i] ?? 0)).join(mid) + right;

  const drawSep = (left: string, mid: string, right: string): string =>
    left + colWidths.map(w => '─'.repeat(w)).join(mid) + right;

  const parts: string[] = [];
  parts.push(drawRow(rows[0], BOX.topLeft, BOX.crossTop, BOX.topRight));
  parts.push(drawSep(BOX.crossLeft, BOX.cross, BOX.crossRight));
  for (let i = 1; i < rows.length; i++) {
    parts.push(drawRow(rows[i], BOX.vertical, BOX.vertical, BOX.vertical));
  }
  parts.push(drawSep(BOX.bottomLeft, BOX.crossBottom, BOX.bottomRight));

  return parts.join('\n');
}

function renderCodeBlock(lines: string[]): string {
  return lines.map(l => `  ${C.bgCode} ${l} ${C.reset}`).join('\n');
}

function renderInline(text: string): string {
  let result = text;
  result = result.replace(/`([^`]+)`/g, `${C.bgDark}${C.yellow} $1 ${C.reset}`);
  result = result.replace(/\*\*([^*]+)\*\*/g, `${C.bold}$1${C.reset}`);
  return result;
}

function indentLevel(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

function stripListMarker(line: string): string {
  return line.replace(/^(\s*)[-*+]\s+/, '$1');
}

export function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') { i++; continue; }

    if (/^#{1,6}\s/.test(line)) {
      const level = line.match(/^(#{1,6})/)![1].length;
      const text = line.replace(/^#{1,6}\s+/, '');
      const header = renderInline(text);
      if (level === 1) output.push(`\n${C.bold}${C.cyan}${header}${C.reset}`);
      else if (level === 2) output.push(`\n${C.bold}${C.blue}${header}${C.reset}`);
      else output.push(`\n${C.bold}${header}${C.reset}`);
      i++;
      continue;
    }

    if (/^---+\s*$/.test(line)) {
      output.push(`${C.gray}${'─'.repeat(60)}${C.reset}`);
      i++;
      continue;
    }

    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      if (lang) output.push(`\n${C.dim}${C.gray}  ${lang}${C.reset}`);
      output.push(renderCodeBlock(codeLines));
      continue;
    }

    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const table = renderTable(tableLines);
      if (table) output.push(`\n${table}`);
      continue;
    }

    if (/^(\s*)[-*+]\s/.test(line)) {
      const baseIndent = indentLevel(line);
      const prefix = ' '.repeat(baseIndent);
      while (i < lines.length && /^(\s*)[-*+]\s/.test(lines[i]) && indentLevel(lines[i]) === baseIndent) {
        const itemText = renderInline(stripListMarker(lines[i]).trim());
        output.push(`${prefix}${C.gray}•${C.reset} ${itemText}`);
        i++;
      }
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const match = lines[i].match(/^(\d+)\.\s+(.*)/);
        if (match) {
          output.push(`  ${C.bold}${match[1]}.${C.reset} ${renderInline(match[2])}`);
        }
        i++;
      }
      continue;
    }

    output.push(renderInline(line));
    i++;
  }

  return output.join('\n');
}