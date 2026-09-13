// Optional: set storageNamespace to a unique, stable string when hosting
// multiple installations on the same origin, e.g. {storageNamespace: 'demo'}.
// This separates login tokens, preferences, and drafts in browser storage.
// Omit it to preserve existing storage keys. Changing it requires a new login
// and does not migrate locally stored preferences or drafts.
window.grampsjsConfig = {}
