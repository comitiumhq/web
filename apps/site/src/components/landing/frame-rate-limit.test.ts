import { describe, expect, it } from 'vitest';
import { createFrameRateLimit } from './frame-rate-limit';

describe('landing frame rate limit', () => {
  it.each([60, 120, 144, 240])('renders about 60 frames per second on a %i Hz display', (refreshRate) => {
    const shouldRender = createFrameRateLimit();
    const duration = 10_000;
    const frames = Array.from({ length: refreshRate * 10 }, (_, index) => (index * 1000) / refreshRate);
    const rendered = frames.filter(shouldRender);

    expect(rendered.length / (duration / 1000)).toBeGreaterThanOrEqual(59.8);
    expect(rendered.length / (duration / 1000)).toBeLessThanOrEqual(60.1);
  });

  it('keeps every frame on a slower display', () => {
    const shouldRender = createFrameRateLimit();
    const frames = Array.from({ length: 300 }, (_, index) => (index * 1000) / 30);

    expect(frames.filter(shouldRender)).toEqual(frames);
  });

  it('resumes immediately after a pause without replaying missed frames', () => {
    const shouldRender = createFrameRateLimit();
    expect(shouldRender(0)).toBe(true);
    expect(shouldRender(10_000)).toBe(true);
    expect(shouldRender(10_001)).toBe(false);
    expect(shouldRender(10_008)).toBe(false);
    expect(shouldRender(10_017)).toBe(true);
  });
});
