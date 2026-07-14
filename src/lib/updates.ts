import { isTauri } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";

/** Query the signed GitHub Releases feed when running in the desktop shell. */
export async function checkForAppUpdate(): Promise<Update | null> {
  if (!isTauri()) return null;
  return check({ timeout: 30_000 });
}

/** Download, verify, install, and relaunch into a previously checked update. */
export async function installAppUpdate(update: Update): Promise<void> {
  await update.downloadAndInstall();
  await relaunch();
}

export type { Update as AppUpdate };
