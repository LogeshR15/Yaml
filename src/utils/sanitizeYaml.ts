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

  // 8. Remove securitySchemes and security: blocks — ZIA Agent Studio rejects them.
  text = removeSecurityFields(text);

  // 9. Fix $ref incorrectly placed as a key inside properties: — it must be at the parent level.
  //    Gemini sometimes generates: items: { type: object, properties: { $ref: '#/...' } }
  //    which is invalid. The $ref must replace the whole object, not be a child of properties.
  text = fixRefInProperties(text);

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

/**
 * Fix $ref placed as a key inside a properties: block, which is always invalid in OpenAPI.
 * Handles two forms Gemini generates:
 *   A: type: object  +  properties:  +  sole $ref:  →  just $ref at parent indent
 *   B: properties:  +  sole $ref:  (no explicit type line)  →  just $ref at parent indent
 */
function fixRefInProperties(text: string): string {
  // Form A: { type: object, properties: { $ref: ... } }
  text = text.replace(
    /^( +)type: object\n\1properties:\n\1  (\$ref: .+)$/gm,
    '$1$2',
  );
  // Form B: { properties: { $ref: ... } } without explicit type
  text = text.replace(
    /^( +)properties:\n\1  (\$ref: .+)$/gm,
    '$1$2',
  );
  return text;
}

/** Remove securitySchemes and security: blocks — ZIA Agent Studio rejects both. */
function removeSecurityFields(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    const shouldRemove =
      trimmed.startsWith('securitySchemes:') ||
      trimmed.startsWith('security:');

    if (shouldRemove) {
      i++;
      // Skip all lines belonging to this block (more indented, or blank continuation lines).
      while (i < lines.length) {
        const next = lines[i];
        const nextTrimmed = next.trimStart();
        const nextIndent = next.length - nextTrimmed.length;
        if (nextTrimmed === '' || nextIndent > indent) {
          i++;
        } else {
          break;
        }
      }
    } else {
      out.push(line);
      i++;
    }
  }

  return out.join('\n');
}
