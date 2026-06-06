import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 5 * 60 * 1000,      // Data stays fresh for 5 minutes
			gcTime: 30 * 60 * 1000,          // Cache kept for 30 minutes
		},
	},
});