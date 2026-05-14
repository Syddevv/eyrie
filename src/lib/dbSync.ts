type Callback = () => void;

const accountListeners = new Set<Callback>();
const categoryListeners = new Set<Callback>();
const goalListeners = new Set<Callback>();
const merchantListeners = new Set<Callback>();
const transactionListeners = new Set<Callback>();

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

export function onMerchantsChanged(cb: Callback) {
  merchantListeners.add(cb);
  return () => {
    merchantListeners.delete(cb);
  };
}

export function emitMerchantsChanged() {
  for (const cb of Array.from(merchantListeners)) {
    try {
      cb();
    } catch {
      // swallow
    }
  }
}

export function onTransactionsChanged(cb: Callback) {
  transactionListeners.add(cb);
  return () => {
    transactionListeners.delete(cb);
  };
}

export function emitTransactionsChanged() {
  for (const cb of Array.from(transactionListeners)) {
    try {
      cb();
    } catch {
      // swallow
    }
  }
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

/**
 * Emit all data changes to refresh the entire UI
 * Called after sync restore completes to update all screens
 */
export function emitAllChanges() {
  emitAccountsChanged();
  emitCategoriesChanged();
  emitGoalsChanged();
  emitMerchantsChanged();
  emitTransactionsChanged();
}

export default {
  onAccountsChanged,
  emitAccountsChanged,
  onCategoriesChanged,
  emitCategoriesChanged,
  onGoalsChanged,
  emitGoalsChanged,
  onMerchantsChanged,
  emitMerchantsChanged,
  onTransactionsChanged,
  emitTransactionsChanged,
  emitAllChanges,
};
