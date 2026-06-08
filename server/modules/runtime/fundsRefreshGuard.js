function createFundsRefreshGuard({
  graceMs = 10000,
  now = () => Date.now(),
} = {}) {
  const states = new Map();

  function getState(userID) {
    const key = String(userID);
    if (!states.has(key)) {
      states.set(key, {
        epoch: 0,
        deferredUntil: 0,
        reason: null,
      });
    }
    return states.get(key);
  }

  function defer(userID, reason, durationMs = graceMs) {
    const state = getState(userID);
    state.epoch += 1;
    state.deferredUntil = Math.max(
      state.deferredUntil,
      now() + Math.max(0, durationMs)
    );
    state.reason = reason || 'order reservation transition';
    return state.epoch;
  }

  function begin(userID) {
    const state = getState(userID);
    return {
      epoch: state.epoch,
      deferred: state.deferredUntil > now(),
      deferredUntil: state.deferredUntil,
      reason: state.reason,
    };
  }

  function canPublish(userID, token) {
    const state = getState(userID);
    return (
      token?.epoch === state.epoch
      && state.deferredUntil <= now()
    );
  }

  function clear(userID) {
    states.delete(String(userID));
  }

  return {
    begin,
    canPublish,
    clear,
    defer,
  };
}

const fundsRefreshGuard = createFundsRefreshGuard({
  graceMs: 10 * 1000,
});

export { createFundsRefreshGuard, fundsRefreshGuard };
