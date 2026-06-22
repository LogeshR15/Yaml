/**
 * Attempts to fix common AI-generation artifacts in YAML output
 * before passing to the YAML parser / validator.
 *
 * IMPORTANT: Only fix things that are unambiguously wrong.
 * Never touch lines that end with ":" — those are valid YAML block keys.
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

  // 3. Fix lines with an unclosed double-quoted string value.
  //    Only targets lines where the VALUE (after the colon) starts with a quote
  //    but the quote is never closed on that same line.
  //    e.g.  example: "2389290      → example: "2389290"
  //          example: "             → example: "example-value"
  //    Safe: lines ending with bare ":" are block keys — NOT touched here.
  text = text
    .split('\n')
    .map((line) => {
      // Only consider lines that have a colon followed by a quoted value
      if (!/:\s+"/.test(line) && !/:\s+'/.test(line)) return line;

      const dq = (line.match(/(?<!\\)"/g) || []).length;
      if (dq % 2 === 0) return line; // quotes balanced

      const trimmed = line.trimEnd();
      // Line ends with just an open quote and nothing else → replace with placeholder
      if (/:\s*"$/.test(trimmed)) {
        return trimmed.replace(/:\s*"$/, ': "example-value"');
      }
      // Otherwise close the dangling quote
      return trimmed + '"';
    })
    .join('\n');

  // 4. Same fix for single-quoted values
  text = text
    .split('\n')
    .map((line) => {
      if (!/:\s+'/.test(line)) return line;
      const sq = (line.match(/(?<!\\)'/g) || []).length;
      if (sq % 2 === 0) return line;
      const trimmed = line.trimEnd();
      if (/:\s*'$/.test(trimmed)) {
        return trimmed.replace(/:\s*'$/, ": 'example-value'");
      }
      return trimmed + "'";
    })
    .join('\n');

  // 5. Remove stray lines that are ONLY a quote character (truncation artifact)
  text = text
    .split('\n')
    .filter((line) => !/^\s*["']\s*$/.test(line))
    .join('\n');

  return text.trim();
}
