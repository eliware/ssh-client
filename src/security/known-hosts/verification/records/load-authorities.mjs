import { expandHomePath } from "../../../../paths/expand-home-path.mjs";
import { parseAuthorities } from "./parse-authorities.mjs";

export function readAuthorities(path, fsLib, homedirFn, utils) {
  return fsLib
    .readFile(expandHomePath(path, homedirFn), "utf8")
    .then((text) => parseAuthorities(text, utils));
}
