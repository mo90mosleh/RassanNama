import rows from './apqc-pcf-74.json';

export const apqcByCode = new Map(rows.map(([code, title]) => [code, title]));

export function apqcParent(code: string) {
  if (code.endsWith('.0')) return '';
  const parts = code.split('.');
  return parts.length === 2 ? parts[0] + '.0' : parts.slice(0, -1).join('.');
}

export const apqcChildren = new Map<string, {code: string; title: string}[]>();
for (const [code, title] of apqcByCode) {
  const parent = apqcParent(code);
  const siblings = apqcChildren.get(parent) ?? [];
  siblings.push({code, title});
  apqcChildren.set(parent, siblings);
}

export function apqcTrail(code: string) {
  const trail: string[] = [];
  for (let parent = code; parent; parent = apqcParent(parent)) trail.unshift(parent);
  return trail;
}

export function apqcContains(parent: string, code: string) {
  return code === parent || (parent.endsWith('.0') ? code.startsWith(parent.split('.')[0] + '.') : code.startsWith(parent + '.'));
}
