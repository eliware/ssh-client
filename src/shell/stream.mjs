import { createStreamCompletion } from './stream/completion.mjs';
import { attachStreamEvents } from './stream/events.mjs';
import { attachStreamInput } from './stream/input.mjs';

export function attachShellStream(stream, { onData = () => {}, onInput, onError = () => {} } = {}) {
  const closeStream = stream.close?.bind(stream);
  stream.completion = createStreamCompletion(stream, closeStream);
  attachStreamEvents(stream, { onData, onError });
  attachStreamInput(stream, onInput);
  stream.close = () => { try { closeStream?.(); stream.end?.(); } catch {} };
  return stream;
}
