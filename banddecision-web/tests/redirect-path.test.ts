import { describe, expect, it } from 'vitest';
import { safeInternalPath } from '../src/lib/redirect-path';

describe('authentication return paths', () => {
  it.each(['//evil.example', '/\\evil.example', 'https://evil.example', 'javascript:alert(1)', '/\nevil.example', '/\tevil.example', '/\u0000evil.example', '', '\\evil.example'])('rejects unsafe return path %j', raw => {
    expect(safeInternalPath(raw)).toBe('/dashboard');
  });
  it('preserves local invite return paths and their query parameters', () => {
    expect(safeInternalPath('/join/token?mode=legacy#part')).toBe('/join/token?mode=legacy#part');
  });
  it('normalizes relative segments while staying on the same origin', () => {
    expect(safeInternalPath('/settings/../dashboard')).toBe('/dashboard');
  });
  it('uses the caller fallback when a signup return path is invalid', () => {
    expect(safeInternalPath('//evil.example', '/bands/create')).toBe('/bands/create');
  });
});
