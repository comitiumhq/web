import { type SessionEvent, sessionEventSchema } from './schemas/identity';

const CHANNEL = 'comitium-session';
let sourceId: string | null = null;

function localSourceId() {
  sourceId ??= crypto.randomUUID();

  return sourceId;
}

export function publishSessionEvent(type: SessionEvent['type'], userId: string): void {
  if (typeof BroadcastChannel === 'undefined') {
    return;
  }

  const channel = new BroadcastChannel(CHANNEL);
  channel.postMessage({ type, userId, sourceId: localSourceId() } satisfies SessionEvent);
  channel.close();
}

export function subscribeSessionEvents(handle: (event: SessionEvent) => void): () => void {
  if (typeof BroadcastChannel === 'undefined') {
    return () => {};
  }

  const channel = new BroadcastChannel(CHANNEL);

  channel.onmessage = (event: MessageEvent<unknown>) => {
    const parsed = sessionEventSchema.safeParse(event.data);

    if (parsed.success && parsed.data.sourceId !== localSourceId()) {
      handle(parsed.data);
    }
  };

  return () => channel.close();
}
