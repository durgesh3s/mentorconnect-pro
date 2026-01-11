import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, GraduationCap, UserPlus, UserMinus } from "lucide-react";
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
    <Link to={`/profile/${user.username}`}>
      <Card className="p-4 bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 transition-all group cursor-pointer">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 border-2 border-white/20 group-hover:border-white/40 transition-colors">
            <AvatarImage src={avatarSrc} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
              {displayName[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white truncate group-hover:text-primary transition-colors">
                  {displayName}
                </h3>
                <p className="text-sm text-white/60 truncate">@{user.username}</p>
              </div>
              {showFollowButton && !isOwnProfile && currentUser && (
                <Button
                  variant={isFollowing ? "outline" : "default"}
                  size="sm"
                  onClick={handleFollow}
                  disabled={isLoading}
                  className="shrink-0 border-white/30 text-white hover:bg-white/20 hover:border-white/40 transition-all"
                >
                  {isLoading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isFollowing ? (
                    <>
                      <UserMinus className="h-3.5 w-3.5 mr-1.5" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                      Follow
                    </>
                  )}
                </Button>
              )}
            </div>

            {user.description && (
              <p className="text-sm text-white/80 line-clamp-2">{user.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
              {user.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="capitalize">{user.location}</span>
                </div>
              )}
              {user.education && (
                <div className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  <span className="capitalize">{user.education}</span>
                </div>
              )}
            </div>

            {user.fieldsOfInterest && user.fieldsOfInterest.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {user.fieldsOfInterest.slice(0, 3).map((field, idx) => (
                  <Badge
                    key={idx}
                    className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-400/40 px-1.5 py-0.5 text-[10px] font-medium"
                  >
                    {field}
                  </Badge>
                ))}
                {user.fieldsOfInterest.length > 3 && (
                  <Badge className="bg-white/10 text-white/60 border-white/20 px-1.5 py-0.5 text-[10px] font-medium">
                    +{user.fieldsOfInterest.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
