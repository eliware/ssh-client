export async function readKeyFile(paths, fsLib) {
  for (const path of paths) {
    try {
      return await fsLib.readFile(path, "utf8");
    } catch {
      // Check one more configured key file.
    }
  }
  return undefined;
}
