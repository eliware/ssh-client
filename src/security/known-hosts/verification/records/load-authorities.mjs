import { expandHomePath } from "../../../../paths/expand-home-path.mjs";

export function readAuthorities(path, fsLib, homedirFn, utils) {
  return fsLib.readFile(expandHomePath(path, homedirFn), "utf8").then((text) =>
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split(/\s+/).slice(0, 2).join(" "))
      .map((record) => {
        try {
          if (!utils.parseKey(record)?.getPublicSSH?.()) throw Error();
          return record;
        } catch {
          throw Error("invalid host CA");
        }
      }),
  );
}
