export function useStorage() {
  const getValue = async <T>(key: string): Promise<T | null> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key] ?? null);
      });
    });
  };

  const setValue = async <T>(key: string, value: T): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  };

  const removeValue = async (key: string): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, resolve);
    });
  };

  return { getValue, setValue, removeValue };
}
