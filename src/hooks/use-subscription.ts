import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export type SubscriptionStatus = {
  isPremium: boolean;
  status: string | null;
};

export function useSubscription() {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["subscription", user?.id],
    enabled: isAuthenticated && !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<SubscriptionStatus> => {
      if (!user) return { isPremium: false, status: null };

      const { data, error } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      const plan = data?.plan ?? "free";
      const isPremium = plan === "pro";

      return {
        isPremium,
        status: isPremium ? "pro" : "free",
      };
    },
  });
}
