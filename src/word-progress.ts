import { wordPool } from './words.ts';

export interface WordRecord { attempts: number; correct: number; needsPractice: boolean }
export function parseWordProgress(raw: string | null): Record<string, WordRecord> {
  try {
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: Record<string, WordRecord> = {};
    for (const entry of wordPool('mix')) {
      const item = parsed[entry.id];
      if (item && Number.isSafeInteger(item.attempts) && Number.isSafeInteger(item.correct) && item.attempts > 0 && item.correct >= 0 && item.correct <= item.attempts && typeof item.needsPractice === 'boolean') {
        result[entry.id] = { attempts: item.attempts, correct: item.correct, needsPractice: item.needsPractice };
      }
    }
    return result;
  } catch { return {}; }
}

