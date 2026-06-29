/**
 * Cleans common AI-generation artifacts from YAML output.
 */
export function sanitizeYaml(raw: string): string {
  let text = raw.trim();

  // 1. Strip markdown fences
  text = text.replace(/^```ya?ml\s*/im, '').replace(/```\s*$/im, '').trim();

  // 2. Remove prose before "openapi:"
  const idx = text.indexOf('openapi:');
  if (idx > 0) text = text.slice(idx);

  // 3. Normalize invisible characters injected by browsers when copying webpages.
  //    Use charCodeAt-based replacer to avoid embedding raw Unicode in regex literals.
  text = normalizeInvisible(text);

  // 4. Fix unclosed double-quoted VALUES (not block keys).
  text = text
    .split('\n')
    .map((line) => {
      if (!/:\s+"/.test(line)) return line;
      const dq = (line.match(/"/g) || []).length;
      if (dq % 2 === 0) return line;
      const trimmed = line.trimEnd();
      if (/:\s*"$/.test(trimmed)) return trimmed.replace(/:\s*"$/, ': "example-value"');
      return trimmed + '"';
    })
    .join('\n');

  // 5. Fix unclosed single-quoted VALUES.
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

  // 6. Remove stray lines that are only a quote character.
  text = text
    .split('\n')
    .filter((line) => !/^\s*["']\s*$/.test(line))
    .join('\n');

  // 7. Quote unquoted values that contain colons (YAML special char).
  text = text
    .split('\n')
    .map((line) => {
      const colonMatch = line.match(/^(\s*\w+:\s+)(.+)$/);
      if (!colonMatch) return line;
      const [, prefix, value] = colonMatch;
      if (/^["'{]/.test(value) || /^\d+$/.test(value) || value === 'null' || value === 'true' || value === 'false') {
        return line;
      }
      if (value.includes(':') && !value.includes('"') && !value.includes("'")) {
        return prefix + `"${value}"`;
      }
      return line;
    })
    .join('\n');

  // 8. Fix incorrectly structured root-level security block.
  text = fixSecurityBlock(text);

  return text.trim();
}

/** Replace invisible / problematic Unicode chars without embedding them in regex */
function normalizeInvisible(text: string): string {
  const out: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const cp = text.charCodeAt(i);
    if (cp === 0x09) { out.push('  '); continue; }   // tab -> 2 spaces
    if (cp === 0xA0) { out.push(' '); continue; }    // non-breaking space
    if (cp === 0x200B || cp === 0x200C || cp === 0x200D || cp === 0xFEFF) continue; // strip
    if (cp === 0x2028 || cp === 0x2029) { out.push('\n'); continue; } // line/para sep
    out.push(text[i]);
  }
  return out.join('');
}

function fixSecurityBlock(text: string): string {
  const lines = text.split('\n');
  const secIdx = lines.findIndex((l) => /^security:\s*$/.test(l));
  if (secIdx === -1) return text;

  let endIdx = lines.length;
  for (let i = secIdx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.length > 0 && !/^\s/.test(l)) { endIdx = i; break; }
  }

  const secBlock = lines.slice(secIdx, endIdx).join('\n');
  if (!/type:\s*oauth2/.test(secBlock) && !/flows:/.test(secBlock)) return text;

  const schemeMatch = secBlock.match(/-\s+(\w+):/);
  if (!schemeMatch) return text;
  const schemeName = schemeMatch[1];

  const scopes: string[] = [];
  const scopeRe = /([A-Za-z][A-Za-z0-9]+(?:\.[A-Za-z0-9]+){1,})/g;
  const skip = new Set(['oauth2', 'authorizationCode', 'implicit', 'clientCredentials', 'password']);
  let m: RegExpExecArray | null;
  while ((m = scopeRe.exec(secBlock)) !== null) {
    const c = m[1];
    if (!skip.has(c) && !scopes.includes(c)) scopes.push(c);
  }

  const pad = '  ';
  const scopeLines = scopes.length > 0
    ? scopes.map((s) => `${pad}    - ${s}`).join('\n')
    : `${pad}    - []`;

  const fixed = `security:\n${pad}- ${schemeName}:\n${scopeLines}`;
  return [...lines.slice(0, secIdx), ...fixed.split('\n'), ...lines.slice(endIdx)].join('\n');
}
