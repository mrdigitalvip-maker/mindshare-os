import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { loadPassportHomeSnapshot } from "@/services/passport-home-service";

export function usePassportHome(missionDate: string) {
  const userId = useAuth().session?.user.id ?? "";
  const date = missionDate.trim();

  return useQuery({
    queryKey: ["passport", "home", userId, date] as const,
    queryFn: () => loadPassportHomeSnapshot(userId, date),
    enabled: Boolean(userId) && /^\d{4}-\d{2}-\d{2}$/.test(date),
    staleTime: 60_000,
  });
}
