import { prepareStreamCompletion } from "./stream/completion.mjs";
import { attachStreamEvents } from "./stream/events.mjs";
import { attachStreamInput } from "./stream/input.mjs";

export function attachShellStream(stream, { onData = () => {}, onInput, onError = () => {} } = {}) {
  const wrapClose = prepareStreamCompletion(stream);
  attachStreamEvents(stream, { onData, onError });
  attachStreamInput(stream, onInput);
  wrapClose();
  return stream;
}
