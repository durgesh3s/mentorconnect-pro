import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { toast } from "sonner";

interface User {
  _id?: string;
  id?: string;
  username: string;
  name: string;
  avatar?: string;
  googleGmailPhoto?: string;
  description?: string;
  location?: string;
  education?: "high" | "secondary" | "graduation";
  fieldsOfInterest?: string[];
}

interface UserCardProps {
  user: User;
  showFollowButton?: boolean;
  isFollowing?: boolean;
  onFollowChange?: () => void;
}

export function UserCard({ 
  user, 
  showFollowButton = true, 
  isFollowing: initialIsFollowing = false,
  onFollowChange 
}: UserCardProps) {
  const { user: currentUser } = useAuthStore();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const isOwnProfile = currentUser?.username === user.username;

  const userId = user._id || user.id;

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId || !currentUser) {
      toast.error("Please login to follow users");
      return;
    }

    if (isOwnProfile) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post<{
        following: boolean;
        followerCount: number;
        user: User;
      }>(`/students/follow/${userId}`);
      
      setIsFollowing(response.following);
      if (onFollowChange) {
        onFollowChange();
      }
      toast.success(response.following ? "Followed successfully" : "Unfollowed successfully");
    } catch (error) {
      console.error("Failed to update follow status", error);
      toast.error("Failed to update follow status");
    } finally {
      setIsLoading(false);
    }
  };

  const displayName = user.name || user.username;
  const avatarSrc = user.avatar || user.googleGmailPhoto;

  return (
    <div className="flex items-center justify-between py-2.5 px-4 hover:bg-accent/50 transition-colors">
      <Link to={`/profile/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={avatarSrc} className="object-cover" />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-medium text-sm">
            {displayName[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-sm truncate">
              {displayName}
            </h3>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
            {(user.location || user.education) && (
              <span className="text-xs text-muted-foreground/60">•</span>
            )}
            {user.location && (
              <span className="text-xs text-muted-foreground capitalize truncate">
                {user.location}
              </span>
            )}
            {user.education && (
              <span className="text-xs text-muted-foreground capitalize truncate">
                {user.education}
              </span>
            )}
          </div>
          {user.description && (
            <p className="text-xs text-foreground/80 mt-0.5 line-clamp-1 truncate">
              {user.description}
            </p>
          )}
        </div>
      </Link>

      {showFollowButton && !isOwnProfile && currentUser && (
        <Button
          variant={isFollowing ? "outline" : "default"}
          size="sm"
          onClick={handleFollow}
          disabled={isLoading}
          className={`shrink-0 ml-2 h-7 px-3.5 text-xs font-semibold rounded-md transition-all ${
            isFollowing
              ? "border-border text-foreground hover:bg-accent bg-transparent"
              : "bg-blue-500 hover:bg-blue-600 text-white border-0"
          }`}
        >
          {isLoading ? (
            <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isFollowing ? (
            "Following"
          ) : (
            "Follow"
          )}
        </Button>
      )}
    </div>
  );
}
