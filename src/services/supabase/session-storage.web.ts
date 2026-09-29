// Web sessions end with the tab; native sessions use SecureStore.
export const sessionStorage = {
  getItem: async (key: string) => typeof window === 'undefined' ? null : window.sessionStorage.getItem(key),
  setItem: async (key: string, value: string) => { window.sessionStorage.setItem(key, value); },
  removeItem: async (key: string) => { window.sessionStorage.removeItem(key); },
};
