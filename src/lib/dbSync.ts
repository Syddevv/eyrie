type Callback = () => void;

const listeners = new Set<Callback>();

export function onAccountsChanged(cb: Callback) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function emitAccountsChanged() {
  for (const cb of Array.from(listeners)) {
    try {
      cb();
    } catch (e) {
      // swallow
    }
  }
}

export default { onAccountsChanged, emitAccountsChanged };
