import { describe, expect, it, vi, afterEach } from 'vitest';
import { askLLM } from './assistant';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('askLLM', () => {
  it('sends prompt and returns text', async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ text: 'hi' }),
    } as any));
    // @ts-ignore
    global.fetch = mockFetch;
    const res = await askLLM('hello', { foo: 'bar' });
    const [, opts] = mockFetch.mock.calls[0] as any[];
    const body = JSON.parse(opts.body);
    expect(body).toEqual({ prompt: 'hello', ctx: { foo: 'bar' } });
    expect(res.text).toBe('hi');
  });

  it('returns stub text on error', async () => {
    const mockFetch = vi.fn(async () => ({ ok: false, json: async () => ({}) } as any));
    // @ts-ignore
    global.fetch = mockFetch;
    const res = await askLLM('oops');
    expect(res.text).toContain('stub');
  });
});
