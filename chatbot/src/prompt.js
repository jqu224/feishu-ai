import { readFileSync } from 'node:fs';

export function readPrompt(name) {
  const url = new URL(`../prompts/${name}.md`, import.meta.url);
  return readFileSync(url, 'utf8');
}
