type Callback = () => void;

const accountListeners = new Set<Callback>();
const categoryListeners = new Set<Callback>();
const goalListeners = new Set<Callback>();

export function onAccountsChanged(cb: Callback) {
  accountListeners.add(cb);
  return () => {
    accountListeners.delete(cb);
  };
}

export function emitAccountsChanged() {
  for (const cb of Array.from(accountListeners)) {
    try {
      cb();
    } catch {
      // swallow
    }
  }
}

export function onCategoriesChanged(cb: Callback) {
  categoryListeners.add(cb);
  return () => {
    categoryListeners.delete(cb);
  };
}

export function emitCategoriesChanged() {
  for (const cb of Array.from(categoryListeners)) {
    try {
      cb();
    } catch {
      // swallow
    }
  }
}

export function onGoalsChanged(cb: Callback) {
  goalListeners.add(cb);
  return () => {
    goalListeners.delete(cb);
  };
}

export function emitGoalsChanged() {
  for (const cb of Array.from(goalListeners)) {
    try {
      cb();
    } catch {
      // swallow
    }
  }
}

export default {
  onAccountsChanged,
  emitAccountsChanged,
  onCategoriesChanged,
  emitCategoriesChanged,
  onGoalsChanged,
  emitGoalsChanged,
};
