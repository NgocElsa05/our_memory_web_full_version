import { createContext, useContext } from 'react';

export const SESSION_PROFILE_KEY = 'sessionProfileId';

export const SessionContext = createContext(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession chỉ dùng bên trong SessionContext.Provider');
  }
  return ctx;
}
