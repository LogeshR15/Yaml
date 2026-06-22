import yaml from 'js-yaml';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function collectArrayItems(obj: any, path: string, warnings: string[]): void {
  if (!obj || typeof obj !== 'object') return;

  for (const [key, val] of Object.entries(obj)) {
    const childPath = `${path}.${key}`;
    if (val && typeof val === 'object') {
      const v = val as any;
      if (v.type === 'array' && !v.items) {
        warnings.push(`Array at ${childPath} is missing "items" — AI agents won't know the element type`);
      }
      collectArrayItems(val, childPath, warnings);
    }
  }
}

function checkSecuritySchemesPlacement(parsed: any, errors: string[]): void {
  // securitySchemes at root level is invalid OpenAPI
  if ((parsed as any).securitySchemes) {
    errors.push(
      '"securitySchemes" found at root level — it must be under "components.securitySchemes"'
    );
  }
}

function checkOperationIds(parsed: any, errors: string[], warnings: string[]): void {
  const paths = parsed.paths;
  if (!paths) return;

  const seen = new Set<string>();
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

  for (const [pathKey, pathItem] of Object.entries(paths)) {
    for (const method of methods) {
      const op = (pathItem as any)?.[method];
      if (!op) continue;

      if (!op.operationId) {
        errors.push(`Missing operationId on ${method.toUpperCase()} ${pathKey}`);
      } else {
        if (seen.has(op.operationId)) {
          errors.push(`Duplicate operationId: "${op.operationId}"`);
        }
        seen.add(op.operationId);

        // Warn about poor operationId quality
        if (/^\d/.test(op.operationId) || op.operationId.includes('.')) {
          warnings.push(
            `operationId "${op.operationId}" may cause issues — use camelCase letters/hyphens/underscores only`
          );
        }
      }

      if (!op.description && !op.summary) {
        warnings.push(
          `${method.toUpperCase()} ${pathKey} has no description or summary — AI agents won't know when to call it`
        );
      }
    }
  }
}

function checkZohoIdTypes(parsed: any, warnings: string[]): void {
  const idKeywords = ['id', 'Id', 'ID'];
  const integerIdPaths: string[] = [];

  function scan(obj: any, path: string): void {
    if (!obj || typeof obj !== 'object') return;
    for (const [key, val] of Object.entries(obj)) {
      const childPath = `${path}.${key}`;
      if (val && typeof val === 'object') {
        const v = val as any;
        if (
          v.type === 'integer' &&
          idKeywords.some((kw) => key.includes(kw))
        ) {
          integerIdPaths.push(childPath);
        }
        scan(val, childPath);
      }
    }
  }

  scan(parsed, 'spec');
  if (integerIdPaths.length > 0) {
    warnings.push(
      `Zoho ID fields using "integer" type may overflow — consider "string": ${integerIdPaths.slice(0, 3).join(', ')}`
    );
  }
}

export function validateOpenApiYaml(raw: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Must start with openapi:
  if (!raw.trim().startsWith('openapi:')) {
    errors.push('Output does not start with "openapi:" — may contain markdown or extra text');
    return { valid: false, errors, warnings };
  }

  // 2. Parse YAML
  let parsed: any;
  try {
    parsed = yaml.load(raw);
  } catch (e) {
    errors.push(`YAML syntax error: ${e instanceof Error ? e.message : String(e)}`);
    return { valid: false, errors, warnings };
  }

  if (!parsed || typeof parsed !== 'object') {
    errors.push('Parsed YAML is not an object');
    return { valid: false, errors, warnings };
  }

  // 3. Required top-level fields
  if (!parsed.openapi || !String(parsed.openapi).startsWith('3.')) {
    errors.push(`"openapi" must be 3.0.x or 3.1.x — got: ${parsed.openapi}`);
  }
  if (!parsed.info?.title) errors.push('Missing info.title');
  if (!parsed.paths || Object.keys(parsed.paths).length === 0) {
    errors.push('No paths defined — spec is empty');
  }

  // 4. securitySchemes placement
  checkSecuritySchemesPlacement(parsed, errors);

  // 5. operationId checks
  checkOperationIds(parsed, errors, warnings);

  // 6. Array items warnings
  collectArrayItems(parsed, 'spec', warnings);

  // 7. Zoho ID type warnings
  checkZohoIdTypes(parsed, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
