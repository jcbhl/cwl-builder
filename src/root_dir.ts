import pathlib from "path";

// _Ugly_ hack to get the root dir of the project assuming we are running in the electron render process.
export function getRootDir(): string {
  return pathlib.join(__dirname, "../../../../../../");
}
