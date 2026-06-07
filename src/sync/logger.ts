const PREFIX = "[sync]";

export function logSync(message: string, payload?: unknown) {
  if (__DEV__) {
    console.log(PREFIX, message, payload ?? "");
  }
}

export function logSyncError(message: string, payload?: unknown) {
  if (__DEV__) {
    console.warn(PREFIX, message, payload ?? "");
    return;
  }

  console.warn(PREFIX, message);
}
