
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getUserFavoriteTools, toggleFavoriteTool } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";

export function useUserFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const userId = user?.uid;

  const { data: favoriteToolIds = [], isLoading: isLoadingFavorites } = useQuery<string[], Error>({
    queryKey: ["userFavorites", userId],
    queryFn: () => {
      if (!userId) return Promise.resolve([]); // Return empty array if no user
      return getUserFavoriteTools(userId);
    },
    enabled: !!userId, // Only run query if userId is available
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const mutation = useMutation({
    mutationFn: (toolId: string) => {
      if (!userId) throw new Error("用户未登录");
      return toggleFavoriteTool(userId, toolId);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["userFavorites", userId] });
      toast({
        title: data.favorited ? "已收藏" : "已取消收藏",
        description: `工具 "${variables}" ${data.favorited ? "已添加到您的收藏夹。" : "已从您的收藏夹移除。"}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "操作失败",
        description: error.message || "更新收藏夹失败，请稍后再试。",
        variant: "destructive",
      });
    },
  });

  const isFavorited = (toolId: string): boolean => {
    return favoriteToolIds.includes(toolId);
  };

  const toggleFavorite = (toolId: string, toolName?: string) => {
    if (!user) {
      toast({
        title: "请先登录",
        description: "登录后才能收藏工具。",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate(toolId, {
      onSuccess: (data) => {
         queryClient.invalidateQueries({ queryKey: ["userFavorites", userId] });
         toast({
            title: data.favorited ? "已收藏" : "已取消收藏",
            description: `工具 "${toolName || toolId}" ${data.favorited ? "已添加到您的收藏夹。" : "已从您的收藏夹移除。"}`,
         });
      }
    });
  };

  return {
    favoriteToolIds,
    isLoadingFavorites,
    isFavorited,
    toggleFavorite,
    isTogglingFavorite: mutation.isPending,
  };
}
