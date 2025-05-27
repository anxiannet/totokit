
"use client";

import { Button } from "@/components/ui/button";
import { Star, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserFavorites } from "@/hooks/useUserFavorites";
import { cn } from "@/lib/utils";

interface FavoriteStarButtonProps {
  toolId: string;
  toolName: string;
}

export function FavoriteStarButton({ toolId, toolName }: FavoriteStarButtonProps) {
  const { user } = useAuth();
  const { isFavorited, toggleFavorite, isTogglingFavorite } = useUserFavorites();

  if (!user) {
    return null; // Don't show the button if the user is not logged in
  }

  const currentlyFavorited = isFavorited(toolId);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => toggleFavorite(toolId, toolName)}
      disabled={isTogglingFavorite}
      aria-label={currentlyFavorited ? "取消收藏" : "收藏"}
    >
      {isTogglingFavorite && <Loader2 className="h-4 w-4 animate-spin" />}
      {!isTogglingFavorite && (
        <Star
          className={cn(
            "h-5 w-5",
            currentlyFavorited
              ? "fill-yellow-400 text-yellow-500"
              : "text-muted-foreground"
          )}
        />
      )}
    </Button>
  );
}
