// Optional isolation for multiple installations on the same browser origin.
// Keep legacy keys unless an installation explicitly chooses a namespace.
export function scopedStorage(storage, namespace) {
  const key = name => (namespace ? `${namespace}:${name}` : name)
  return {
    getItem: name => storage.getItem(key(name)),
    setItem: (name, value) => storage.setItem(key(name), value),
    removeItem: name => storage.removeItem(key(name)),
  }
}

export const localStorage = {
  getItem: name =>
    scopedStorage(
      window.localStorage,
      window.grampsjsConfig?.storageNamespace
    ).getItem(name),
  setItem: (name, value) =>
    scopedStorage(
      window.localStorage,
      window.grampsjsConfig?.storageNamespace
    ).setItem(name, value),
  removeItem: name =>
    scopedStorage(
      window.localStorage,
      window.grampsjsConfig?.storageNamespace
    ).removeItem(name),
}
