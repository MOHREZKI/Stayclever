import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Hook untuk mengambil data dengan caching otomatis
export function useSupabaseQuery<T = any>(
  table: string,
  select: string = "*",
  filters?: Record<string, any>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
  }
) {
  return useQuery<T>({
    queryKey: [table, select, filters],
    queryFn: async () => {
      let query = supabase.from(table).select(select);

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Error fetching ${table}: ${error.message}`);
      }

      return data as T;
    },
    staleTime: options?.staleTime || 5 * 60 * 1000, // 5 menit default
    gcTime: options?.cacheTime || 10 * 60 * 1000, // 10 menit default
    enabled: options?.enabled !== false,
  });
}

// Hook untuk real-time subscriptions
export function useSupabaseSubscription<T>(
  table: string,
  callback: (payload: any) => void,
  filter?: string
) {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: ["subscription", table, filter],
    queryFn: () => {
      if (!currentUser) return null;

      const subscription = supabase
        .channel(`${table}-changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter: filter ? `user_id=eq.${currentUser.id}` : undefined,
          },
          callback
        )
        .subscribe();

      return subscription;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// Hook untuk mutations dengan optimasi
export function useSupabaseMutation<T, V = any>(
  mutationFn: (variables: V) => Promise<T>,
  options?: {
    onSuccess?: (data: T, variables: V) => void;
    onError?: (error: Error, variables: V) => void;
    invalidateQueries?: string[];
  }
) {
  const queryClient = useQueryClient();

  return useMutation<T, Error, V>({
    mutationFn,
    onSuccess: (data, variables) => {
      // Invalidate dan refetch queries yang terkait
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        });
      }

      options?.onSuccess?.(data, variables);
    },
    onError: options?.onError,
  });
}
