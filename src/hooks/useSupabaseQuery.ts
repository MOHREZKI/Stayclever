import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Hook untuk mengambil data dengan caching otomatis
type QueryFilters = Record<string, string | number | boolean | null | undefined>;

interface SupabaseQueryOptions {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

export function useSupabaseQuery<TData = unknown, TFilters extends QueryFilters = QueryFilters>(
  table: string,
  select: string = "*",
  filters?: TFilters,
  options?: SupabaseQueryOptions,
) {
  return useQuery<TData>({
    queryKey: [table, select, filters],
    queryFn: async () => {
      let query = supabase.from(table).select(select);

      if (filters) {
        (Object.entries(filters) as Array<[keyof TFilters, TFilters[keyof TFilters]]>).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(String(key), value as string | number | boolean);
          }
        });
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Error fetching ${table}: ${error.message}`);
      }

      return data as TData;
    },
    staleTime: options?.staleTime || 5 * 60 * 1000, // 5 menit default
    gcTime: options?.cacheTime || 10 * 60 * 1000, // 10 menit default
    enabled: options?.enabled !== false,
  });
}

// Hook untuk real-time subscriptions
export function useSupabaseSubscription<TData>(
  table: string,
  callback: (payload: RealtimePostgresChangesPayload<TData>) => void,
  filter?: string,
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
export function useSupabaseMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    invalidateQueries?: string[];
  },
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: (data, variables) => {
      // Invalidate dan refetch queries yang terkait
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        });
      }

      options?.onSuccess?.(data, variables);
    },
    onError: options?.onError,
  });
}
