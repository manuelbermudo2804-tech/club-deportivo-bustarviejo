import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			// Si el servidor limita peticiones (429), reintentar con espera creciente
			retry: (count, error) => {
				const is429 = error?.status === 429 || error?.response?.status === 429 || /rate limit/i.test(error?.message || '');
				return is429 ? count < 4 : count < 1;
			},
			retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 15000),
			staleTime: 60000,
			refetchOnMount: false,
		},
	},
});