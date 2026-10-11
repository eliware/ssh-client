import { SshError } from "../../errors.mjs";
export function createStreamCompletion(stream, closeStream) {
  if (typeof stream.once !== "function") return Promise.resolve({ code: null });
  return new Promise((resolve, reject) => {
    let done = false;
    const complete = (result) => {
      if (done) return;
      done = true;
      resolve(result);
    };
    stream.once("close", (code, signal) => complete({ code: code ?? null, signal }));
    stream.once("end", () => complete({ code: null }));
    stream.once("error", (error) => {
      if (done) return;
      done = true;
      try {
        closeStream?.();
        stream.end?.();
      } catch {}
      reject(
        new SshError(`SSH shell error: ${error.message || String(error)}`, "SSH_SHELL", error, {
          operation: "shell",
          phase: "stream",
        }),
      );
    });
  });
}
