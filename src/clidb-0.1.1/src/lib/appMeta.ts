import packageJson from "../../package.json";

/** Synced with `package.json` at build time. */
export const APP_VERSION = packageJson.version;

/** Repository URL shown in About (edit to match your GitHub remote). */
export const GITHUB_REPO_URL = "https://github.com/huybach1609/clidb";
