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

interface FollowingResponse {
  following: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function FollowingList() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuthStore();
  const [following, setFollowing] = useState<User[]>([]);
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

        // Fetch following
        const response = await apiClient.get<FollowingResponse>(
          `/students/${username}/following?page=1&limit=50`
        );
        setFollowing(response.following);
        setPagination(response.pagination);
      } catch (error) {
        console.error("Failed to fetch following", error);
        setFollowing([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [username]);

  const handleLoadMore = async () => {
    if (!username || pagination.page >= pagination.pages) return;

    try {
      const response = await apiClient.get<FollowingResponse>(
        `/students/${username}/following?page=${pagination.page + 1}&limit=50`
      );
      setFollowing((prev) => [...prev, ...response.following]);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Failed to load more following", error);
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
            className="inline-flex items-center gap-2 text-foreground/60 hover:text-foregroundtransition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to {isOwnProfile ? "Dashboard" : "Profile"}</span>
          </Link>
          <h1 className="text-3xl font-bold text-foregroundmb-2">
            {isOwnProfile ? "People I'm" : `${displayName} is`} Following
          </h1>
          <p className="text-foreground/60">
            {pagination.total} {pagination.total === 1 ? "user" : "users"}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bordermx-auto mb-4"></div>
              <p className="text-foreground/80">Loading following...</p>
            </div>
          </div>
        ) : following.length === 0 ? (
          <Card className="p-12 text-center bg-card/50 backdrop-blur-md border-border">
            <UsersIcon className="h-12 w-12 mx-auto mb-4 text-foreground/40" />
            <h3 className="text-lg font-semibold mb-2 text-foreground">Not following anyone yet</h3>
            <p className="text-foreground/80">
              {isOwnProfile
                ? "Start following other learners to see their updates in your feed"
                : "This user is not following anyone yet"}
            </p>
          </Card>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {following.map((user) => (
                <UserCard 
                  key={user._id || user.id} 
                  user={user}
                  isFollowing={isOwnProfile}
                />
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
