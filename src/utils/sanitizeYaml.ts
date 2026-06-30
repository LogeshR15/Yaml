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

  // 8. Extract the OAuth scope Gemini generated BEFORE stripping — it usually gets the
  //    scope right (e.g. ZohoCRM.modules.ALL) even when placement is wrong.
  const detectedScope = extractOAuthScope(text);

  // Strip any security/securitySchemes Gemini generated (often in wrong location).
  // Step 11 re-injects a correctly placed version using the scope extracted above.
  text = removeSecurityFields(text);

  // 9. Fix $ref incorrectly placed as a key inside properties: — it must be at the parent level.
  //    Gemini sometimes generates: items: { type: object, properties: { $ref: '#/...' } }
  //    which is invalid. The $ref must replace the whole object, not be a child of properties.
  text = fixRefInProperties(text);

  // 10. Fix response status codes that use $ref directly to a schema instead of wrapping
  //     it in description + content/schema. ZIA rejects: "400": { $ref: '.../schemas/Foo' }
  text = fixResponseSchemaRefs(text);

  // 11. Inject standardized Zoho OAuth2 security using the scope detected in step 8.
  text = injectSecurity(text, detectedScope);

  // 12. Add x-zia-agent-param-type: system to path parameters — tells ZIA Agent to
  //     resolve these values from conversation context instead of prompting the user.
  text = addSystemParamTags(text);

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

const HTTP_DESCRIPTIONS: Record<string, string> = {
  '200': 'OK', '201': 'Created', '204': 'No Content',
  '400': 'Bad Request', '401': 'Unauthorized', '403': 'Forbidden',
  '404': 'Not Found', '405': 'Method Not Allowed', '409': 'Conflict',
  '422': 'Unprocessable Entity', '429': 'Too Many Requests',
  '500': 'Internal Server Error', '503': 'Service Unavailable',
};

/**
 * Fix response entries that use $ref directly to a schema object instead of a response object.
 * OpenAPI requires $ref at the response level to point to #/components/responses/, not schemas/.
 * Gemini commonly generates:
 *   "400":
 *     $ref: '#/components/schemas/ErrorResponse'    ← invalid
 * We rewrite it to:
 *   "400":
 *     description: Bad Request
 *     content:
 *       application/json:
 *         schema:
 *           $ref: '#/components/schemas/ErrorResponse'
 */
function fixResponseSchemaRefs(text: string): string {
  return text.replace(
    /^( +)"(\d{3})":\n\1  (\$ref: ['"]?#\/components\/schemas\/[\w-]+['"]?)$/gm,
    (_, indent, code, ref) => {
      const desc = HTTP_DESCRIPTIONS[code] ?? 'Error';
      const i = indent; // indent of the status code line
      return (
        `${i}"${code}":\n` +
        `${i}  description: ${desc}\n` +
        `${i}  content:\n` +
        `${i}    application/json:\n` +
        `${i}      schema:\n` +
        `${i}        ${ref}`
      );
    },
  );
}

/**
 * Extract the OAuth scope from Gemini's raw output before we strip the security block.
 * Gemini usually picks the correct product scope (e.g. ZohoCRM.modules.ALL, Desk.tickets.ALL)
 * from the API docs, even when it places the security block in the wrong location.
 */
function extractOAuthScope(text: string): string {
  // Match scope keys inside a scopes: block (indented 8+ spaces): ZohoCRM.modules.ALL: description
  const inSchemes = text.match(/scopes:\s*\n\s+([A-Za-z][\w]+(?:\.[\w]+)+)\s*:/);
  if (inSchemes?.[1]) return inSchemes[1];

  // Match list items in a security: block: - ZohoCRM.modules.ALL
  const lines = text.split('\n');
  const secIdx = lines.findIndex((l) => /^security:\s*$/.test(l));
  if (secIdx !== -1) {
    for (let i = secIdx + 1; i < Math.min(secIdx + 8, lines.length); i++) {
      const m = lines[i].match(/^\s*-\s+([A-Za-z][\w]+(?:\.[\w]+)+)\s*$/);
      if (m?.[1]) return m[1];
    }
  }

  return 'ZohoAPI.fullaccess.all';
}

/**
 * Inject a canonical security block using the scope detected from Gemini's output.
 *
 * Structure injected:
 *   security:               ← root level, before paths:
 *     - ZohoOAuth:
 *         - <detected scope>
 *   components:
 *     schemas: ...          ← existing
 *     securitySchemes: ...  ← appended (sibling of schemas, NOT inside it)
 */
function injectSecurity(text: string, scope = 'ZohoAPI.fullaccess.all'): string {
  if (!/^security:/m.test(text) && /^paths:/m.test(text)) {
    text = text.replace(/^paths:/m, `security:\n  - ZohoOAuth:\n      - ${scope}\npaths:`);
  }

  if (!/securitySchemes:/m.test(text) && /^components:/m.test(text)) {
    const schemes = `  securitySchemes:\n    ZohoOAuth:\n      type: oauth2\n      flows:\n        authorizationCode:\n          authorizationUrl: https://accounts.zoho.com/oauth/v2/auth\n          tokenUrl: https://accounts.zoho.com/oauth/v2/token\n          scopes:\n            ${scope}: Access to Zoho APIs`;
    text = text.trimEnd() + '\n' + schemes;
  }

  return text;
}

/**
 * Add x-zia-agent-param-type: system immediately after every "in: path" line.
 * This tells ZIA Agent to resolve the parameter from conversation context automatically,
 * rather than prompting the user to enter a value each time.
 */
function addSystemParamTags(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]);
    if (/^\s+in: path\s*$/.test(lines[i])) {
      const next = lines[i + 1] ?? '';
      if (!next.includes('x-zia-agent-param-type:')) {
        const indent = ' '.repeat(lines[i].length - lines[i].trimStart().length);
        out.push(`${indent}x-zia-agent-param-type: system`);
      }
    }
  }
  return out.join('\n');
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
