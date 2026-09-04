import { randomUUID } from 'node:crypto';

const sessions = new Map();

export function newSession(initial = {}) {
  const id = `s_${Date.now().toString(36)}_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
  sessions.set(id, { ...initial, id });
  return sessions.get(id);
}

export function getSession(id) {
  return sessions.get(id);
}

export function setSession(id, state) {
  sessions.set(id, { ...state, id });
  return sessions.get(id);
}

export function deleteSession(id) {
  return sessions.delete(id);
}

export function sessionCount() {
  return sessions.size;
}

// 最近创建的会话（Map 保持插入序）。文本指令「导出文档」没有明确目标时用。
export function getLatestSession() {
  let latest;
  for (const s of sessions.values()) latest = s;
  return latest;
}

export function resetSessions() {
  sessions.clear();
}
