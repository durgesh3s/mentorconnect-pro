import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCard } from "@/components/UserCard";
import { ArrowLeft, Users as UsersIcon } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/authStore";

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

interface FollowersResponse {
  followers: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function FollowersList() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuthStore();
  const [followers, setFollowers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [profileUser, setProfileUser] = useState<{ username: string; name: string } | null>(null);

  useEffect(() => {
    if (!username) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch profile to get name
        try {
          const profile = await apiClient.get<{ username: string; name: string }>(`/students/${username}`);
          setProfileUser(profile);
        } catch (error) {
          console.error("Failed to fetch profile", error);
        }

        // Fetch followers
        const response = await apiClient.get<FollowersResponse>(
          `/students/${username}/followers?page=1&limit=50`
        );
        setFollowers(response.followers);
        setPagination(response.pagination);
      } catch (error) {
        console.error("Failed to fetch followers", error);
        setFollowers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [username]);

  const handleLoadMore = async () => {
    if (!username || pagination.page >= pagination.pages) return;

    try {
      const response = await apiClient.get<FollowersResponse>(
        `/students/${username}/followers?page=${pagination.page + 1}&limit=50`
      );
      setFollowers((prev) => [...prev, ...response.followers]);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Failed to load more followers", error);
    }
  };

  const isOwnProfile = currentUser?.username === username;
  const displayName = profileUser?.name || username || "User";

  return (
    <div className="min-h-screen bg-background text-foreground page-transition">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-6xl pt-24">
        <div className="mb-6">
          <Link
            to={isOwnProfile ? "/dashboard/student" : `/profile/${username}`}
            className="inline-flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to {isOwnProfile ? "Dashboard" : "Profile"}</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isOwnProfile ? "My" : `${displayName}'s`} Followers
          </h1>
          <p className="text-foreground/60">
            {pagination.total} {pagination.total === 1 ? "follower" : "followers"}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bordermx-auto mb-4"></div>
              <p className="text-foreground/80">Loading followers...</p>
            </div>
          </div>
        ) : followers.length === 0 ? (
          <Card className="p-12 text-center bg-card/50 backdrop-blur-md border-border">
            <UsersIcon className="h-12 w-12 mx-auto mb-4 text-foreground/40" />
            <h3 className="text-lg font-semibold mb-2 text-foreground">No followers yet</h3>
            <p className="text-foreground/80">
              {isOwnProfile
                ? "Start connecting with others to grow your network"
                : "This user doesn't have any followers yet"}
            </p>
          </Card>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {followers.map((follower) => (
                <UserCard key={follower._id || follower.id} user={follower} />
              ))}
            </div>

            {pagination.page < pagination.pages && (
              <div className="text-center">
                <Button
                  onClick={handleLoadMore}
                  variant="outline"
                  className="border-border text-foregroundhover:bg-foreground/10"
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
