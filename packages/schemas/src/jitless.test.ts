import { describe, expect, it, vi } from 'vitest';

describe('CSP validation initialization', () => {
  it('validates responses without invoking Function', async () => {
    vi.resetModules();

    const { z } = await import('zod');
    const previousJitless = z.config().jitless;
    const functionConstructor = vi.spyOn(globalThis, 'Function').mockImplementation(() => {
      throw new EvalError('String evaluation is forbidden by CSP');
    });

    try {
      z.config({ jitless: false });

      await import('./jitless');

      const { dataArraySchema, successSchema } = await import('./public');
      const responseSchema = dataArraySchema(successSchema);

      expect(responseSchema.parse({ data: [{ success: true, ignored: 1 }] })).toEqual({ data: [{ success: true }] });
      expect(responseSchema.safeParse({ data: [{ success: false }] }).success).toBe(false);
      expect(functionConstructor).not.toHaveBeenCalled();
    } finally {
      z.config({ jitless: previousJitless });
      functionConstructor.mockRestore();
    }
  });
});
