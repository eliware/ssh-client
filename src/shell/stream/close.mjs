export function wrapStreamClose(stream, closeStream = stream.close?.bind(stream)) {
  return () => {
    stream.close = () => {
      try {
        closeStream?.();
        stream.end?.();
      } catch {}
    };
  };
}
