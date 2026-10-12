const FRAME_INTERVAL_MS = 1000 / 60;

/** Skip excess display frames without accumulating drift or replaying missed frames. */
export function createFrameRateLimit() {
  let nextFrame: number | undefined;

  return (time: number) => {
    nextFrame ??= time;

    // Account for floating-point rounding at exact 60 Hz boundaries.
    const elapsed = time - nextFrame + 0.01;
    if (elapsed < 0) return false;

    nextFrame += (Math.floor(elapsed / FRAME_INTERVAL_MS) + 1) * FRAME_INTERVAL_MS;
    return true;
  };
}
