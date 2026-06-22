/**
 * Attempts to fix common AI-generation artifacts in YAML output
 * before passing to the YAML parser / validator.
 */
export function sanitizeYaml(raw: string): string {
  let text = raw.trim();

  // 1. Strip markdown fences if still present
  text = text.replace(/^```ya?ml\s*/im, '').replace(/```\s*$/im, '').trim();

  // 2. Remove any prose lines before "openapi:"
  const openApiIndex = text.indexOf('openapi:');
  if (openApiIndex > 0) {
    text = text.slice(openApiIndex);
  }

  // 3. Fix dangling/unclosed double-quoted strings on a line.
  //    e.g.  example: "2389290      → example: "2389290"
  //          example: "             → example: "example-value"
  text = text
    .split('\n')
    .map((line) => {
      // Count unescaped double-quotes on the line
      const quotes = (line.match(/(?<!\\)"/g) || []).length;
      if (quotes % 2 !== 1) return line; // already balanced or no quotes

      const trimmed = line.trimEnd();

      // If the line ends with just `"` (truncated value), replace with placeholder
      if (/:\s*"$/.test(trimmed)) {
        return trimmed.slice(0, trimmed.lastIndexOf('"')) + '"example-value"';
      }

      // Otherwise just close the open quote at end of line
      return trimmed + '"';
    })
    .join('\n');

  // 4. Fix dangling single-quoted strings the same way
  text = text
    .split('\n')
    .map((line) => {
      const quotes = (line.match(/(?<!\\)'/g) || []).length;
      if (quotes % 2 !== 1) return line;
      const trimmed = line.trimEnd();
      if (/:\s*'$/.test(trimmed)) {
        return trimmed.slice(0, trimmed.lastIndexOf("'")) + "'example-value'";
      }
      return trimmed + "'";
    })
    .join('\n');

  // 5. Remove stray lines that are just a quote character (common truncation artifact)
  text = text
    .split('\n')
    .filter((line) => !/^\s*["']\s*$/.test(line))
    .join('\n');

  // 6. Ensure the YAML doesn't end mid-key (line ending with a lone colon)
  text = text
    .split('\n')
    .map((line) => (/:\s*$/.test(line) && !line.trim().startsWith('#') ? line + ' ""' : line))
    .join('\n');

  return text.trim();
}
