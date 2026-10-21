import { fitBytes } from "./decode.mjs";

export function normalizeResultText(merged, maxOutput) {
  return fitBytes(Buffer.from(merged), maxOutput);
}
