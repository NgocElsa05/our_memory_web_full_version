import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 45 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Giữ cache khi remount trong cùng phiên
      refetchOnMount: false,
    },
  },
});
