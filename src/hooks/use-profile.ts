import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/api/supabase";
import { useEffect } from "react";
import i18n from "@/lib/i18n";
import { Profile } from "@/types/profile";
import { toast } from "sonner";

export const PROFILE_QUERY_KEY = ["profile"];

export function useProfile() {
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) return null;

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) throw profileError;

      // Fetch preferences
      const { data: prefData } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileData) {
        const combinedData = {
          ...profileData,
          language: prefData?.language || "en",
          theme: prefData?.theme || "system",
          text_size: prefData?.text_size || "100",
        };

        // Sync i18n language
        if (combinedData.language && i18n.language !== combinedData.language) {
          i18n.changeLanguage(combinedData.language);
        }

        return combinedData as Profile;
      }

      return null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No active session");

      const { error } = await supabase.from("profiles").update(updates).eq("id", session.user.id);

      if (error) throw error;
      return updates;
    },
    onSuccess: (updates) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, (old: Profile) => ({
        ...old,
        ...updates,
      }));
      toast.success("Profile updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update profile");
    },
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return {
    profile,
    isLoading,
    error,
    refetch,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
  };
}
