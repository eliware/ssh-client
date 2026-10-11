export function attachChannel(stream, { output, onClose, onError, onStderrError }) {
  let exitCode;
  let exitSignal;
  stream.on?.("exit", (code, signal) => {
    exitCode = code;
    exitSignal = signal;
  });
  stream.on?.("close", onClose);
  stream.on?.("data", (data) => output.add("stdout", data));
  stream.on?.("error", onError);
  if (stream.stderr) {
    stream.stderr.on("data", (data) => output.add("stderr", data));
    stream.stderr.on("error", onStderrError);
  }
  return {
    get exitCode() {
      return exitCode;
    },
    get exitSignal() {
      return exitSignal;
    },
  };
}
