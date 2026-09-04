export function encodeValue(action, payload = {}) {
  return { a: action, p: payload };
}

export function decodeValue(value) {
  if (value == null) return null;
  let v = value;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  if (typeof v.a !== 'string') return null;
  return { action: v.a, payload: v.p && typeof v.p === 'object' ? v.p : {} };
}
