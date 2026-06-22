/**
 * Cleans common AI-generation artifacts from YAML output.
 * Conservative: only fixes things that are unambiguously wrong.
 */
export function sanitizeYaml(raw: string): string {
  let text = raw.trim();

  // 1. Strip markdown fences
  text = text.replace(/^```ya?ml\s*/im, '').replace(/```\s*$/im, '').trim();

  // 2. Remove prose before "openapi:"
  const idx = text.indexOf('openapi:');
  if (idx > 0) text = text.slice(idx);

  // 3. Normalize invisible / problematic characters
  //    - Replace tabs with 2 spaces (tabs are illegal in YAML flow context)
  //    - Strip zero-width spaces, non-breaking spaces, and other invisible Unicode
  //      that browsers sometimes inject when you copy text from a webpage
  text = text
    .replace(/\t/g, '  ')
    .replace(/ /g, ' ')   // non-breaking space
    .replace(/​/g, '')    // zero-width space
    .replace(/‌/g, '')    // zero-width non-joiner
    .replace(/‍/g, '')    // zero-width joiner
    .replace(/﻿/g, '')    // BOM
    .replace(/ /g, '\n')  // line separator
    .replace(/ /g, '\n'); // paragraph separator

  // 4. Fix unclosed double-quoted VALUES (not block keys)
  //    Only touches lines where the value after "key: " starts with a quote
  text = text
    .split('\n')
    .map((line) => {
      if (!/:\s+"/.test(line)) return line;
      const dq = (line.match(/"/g) || []).length;
      if (dq % 2 === 0) return line; // balanced
      const trimmed = line.trimEnd();
      if (/:\s*"$/.test(trimmed)) return trimmed.replace(/:\s*"$/, ': "example-value"');
      return trimmed + '"';
    })
    .join('\n');

  // 5. Fix unclosed single-quoted VALUES
  text = text
    .split('\n')
    .map((line) => {
      if (!/:\s+'/.test(line)) return line;
      const sq = (line.match(/'/g) || []).length;
      if (sq % 2 === 0) return line;
      const trimmed = line.trimEnd();
      if (/:\s*'$/.test(trimmed)) return trimmed.replace(/:\s*'$/, ": 'example-value'");
      return trimmed + "'";
    })
    .join('\n');

  // 6. Remove stray lines that are only a quote character
  text = text
    .split('\n')
    .filter((line) => !/^\s*["']\s*$/.test(line))
    .join('\n');

  // 7. Fix incorrectly structured root-level security block.
  //    The model sometimes puts the full OAuth2 definition inside the security
  //    array instead of just listing scope names. This causes YAML parse errors.
  //
  //    Wrong (model generates this):
  //      security:
  //        - ZohoAuth:
  //            type: oauth2          ← should not be here
  //            flows: ...            ← should not be here
  //
  //    Correct:
  //      security:
  //        - ZohoAuth:
  //            - Desk.tickets.READ
  //
  //    Strategy: scan the security block, and if we find "type: oauth2" or "flows:"
  //    nested inside it (before "paths:" or "components:"), rebuild it from the
  //    scheme name and scope names we can extract.
  text = fixSecurityBlock(text);

  return text.trim();
}

function fixSecurityBlock(text: string): string {
  const lines = text.split('\n');
  const secIdx = lines.findIndex((l) => /^security:\s*$/.test(l.trim()) && !l.startsWith(' '));
  if (secIdx === -1) return text;

  // Find the end of the security block (next root-level key)
  let endIdx = lines.length;
  for (let i = secIdx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.length > 0 && !/^\s/.test(l)) { endIdx = i; break; }
  }

  const secBlock = lines.slice(secIdx, endIdx).join('\n');

  // If the block contains "type: oauth2" or "flows:", it's malformed
  if (!/type:\s*oauth2/.test(secBlock) && !/flows:/.test(secBlock)) return text;

  // Extract scheme name (e.g. "ZohoAuth") and scope strings
  const schemeMatch = secBlock.match(/- (\w+):/);
  if (!schemeMatch) return text;
  const schemeName = schemeMatch[1];

  // Extract scope names — look for lines that look like scope strings
  // e.g.  "  ZohoFSM.modules.TimeSheets.READ: ..." or "  - Desk.tickets.READ"
  const scopeMatterns = [
    /^\s+([A-Za-z][A-Za-z0-9_.]+(?:\.[A-Z]+){1,}):\s/gm,
    /^\s+-\s+([A-Za-z][A-Za-z0-9_.]+(?:\.[A-Z]+){1,})\s*$/gm,
  ];
  const scopes: string[] = [];
  for (const re of scopePatterns(scopeMatterns, secBlock)) {
    if (!scopes.includes(re)) scopes.push(re);
  }

  const indent = '  ';
  const scopeLines = scopes.length > 0
    ? scopes.map((s) => `${indent}    - ${s}`).join('\n')
    : `${indent}    - []`;

  const fixed = `security:\n${indent}- ${schemeName}:\n${scopeLines}`;
  return [...lines.slice(0, secIdx), ...fixed.split('\n'), ...lines.slice(endIdx)].join('\n');
}

// Helper to run multiple regex patterns and collect unique matches
function scopePatterns(patterns: RegExp[], text: string): string[] {
  const results: string[] = [];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (!results.includes(m[1])) results.push(m[1]);
    }
  }
  return results;
}
