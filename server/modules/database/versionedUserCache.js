function createVersionedUserCache(loadValue, recordEvent = () => {}) {
  const states = new Map();

  function getState(userID) {
    const key = String(userID);
    if (!states.has(key)) {
      states.set(key, {
        version: 0,
        entries: new Map(),
      });
    }
    return states.get(key);
  }

  async function get(userID, valueKey) {
    const state = getState(userID);
    let entry = state.entries.get(valueKey);

    if (entry?.value !== null && entry?.value !== undefined) {
      recordEvent('hit');
      return entry.value;
    }

    if (entry?.inFlight) {
      recordEvent('inFlightHit');
      return entry.inFlight;
    }

    recordEvent('miss');
    recordEvent('load');
    const version = state.version;
    const load = Promise.resolve(loadValue(userID, valueKey));
    entry = {
      value: null,
      inFlight: load,
    };
    state.entries.set(valueKey, entry);

    try {
      const value = await load;
      if (state.version !== version || state.entries.get(valueKey) !== entry) {
        return get(userID, valueKey);
      }
      entry.value = value;
      return value;
    } finally {
      if (state.entries.get(valueKey) === entry) {
        entry.inFlight = null;
      }
    }
  }

  function invalidate(userID) {
    const state = getState(userID);
    state.version += 1;
    state.entries.clear();
    recordEvent('invalidation');
  }

  function clear() {
    states.forEach((state) => {
      state.version += 1;
      state.entries.clear();
    });
    states.clear();
  }

  return {
    clear,
    get,
    invalidate,
  };
}

export { createVersionedUserCache };
