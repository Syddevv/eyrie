const PREFIX = "[sync]";

export function logSync(message: string, payload?: unknown) {
  if (__DEV__) {
    console.log(PREFIX, message, payload ?? "");
  }
}

export function logSyncError(message: string, payload?: unknown) {
  console.warn(PREFIX, message, payload ?? "");
}
