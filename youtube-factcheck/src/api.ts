import type { ProgressEvent } from '../shared/types';

/**
 * POSTs a fact-check request and streams back progress events.
 * Parses the Server-Sent Events response and invokes `onEvent` per event.
 * Returns a function that aborts the request.
 */
export function streamFactCheck(
  params: { url: string; apiKey?: string },
  onEvent: (event: ProgressEvent) => void
): () => void {
  const controller = new AbortController();

  (async () => {
    let res: Response;
    try {
      res = await fetch('/api/factcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal,
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      onEvent({
        type: 'error',
        message: `Could not reach the server: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
      return;
    }

    if (!res.ok || !res.body) {
      let message = `Server responded with HTTP ${res.status}.`;
      try {
        const data = await res.json();
        if (data?.error) message = data.error;
      } catch {
        /* ignore */
      }
      onEvent({ type: 'error', message });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by a blank line.
        let sep: number;
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const line = frame
            .split('\n')
            .find((l) => l.startsWith('data:'));
          if (!line) continue;
          const json = line.slice(5).trim();
          if (!json) continue;
          try {
            onEvent(JSON.parse(json) as ProgressEvent);
          } catch {
            /* skip malformed frame */
          }
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        onEvent({
          type: 'error',
          message: `Stream interrupted: ${
            err instanceof Error ? err.message : String(err)
          }`,
        });
      }
    }
  })();

  return () => controller.abort();
}
