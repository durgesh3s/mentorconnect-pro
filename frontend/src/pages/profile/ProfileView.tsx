import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuthStore } from "@/lib/stores/authStore";
import { useProfileStore } from "@/lib/stores/profileStore";
import { apiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Heart, Share2, Plus, Edit, Users, BookOpen, Award, Github, Linkedin, Twitter, Globe, Instagram, Link as LinkIcon } from "lucide-react";
import { Navigation } from "@/components/ui/navigation";
import { toast } from "sonner";

interface ProfileData {
  _id?: string;
  id?: string;
  username: string;
  name: string;
  avatar?: string;
  googleGmailPhoto?: string;
  description?: string;
  followers?: any[] | number;
  following?: any[] | number;
  courses?: number;
  certificates?: number;
  threads?: any[];
  skills?: string[];
  socialLinks?: Record<string, string>;
  coverImage?: string;
}

export default function ProfileView() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuthStore();
  const { currentProfile, setCurrentProfile, threads, setThreads } = useProfileStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const isOwnProfile = user?.username === username;

  useEffect(() => {
    if (!username) return;

    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const profileData = await apiClient.get<ProfileData>(`/students/${username}`);
        setProfile(profileData);
        setCurrentProfile(profileData as any);
        setThreads(profileData.threads || []);

        // Check if current user is following this profile
        if (user && !isOwnProfile) {
          // Check if current user's following list includes this profile
          const currentUserProfile = await apiClient.get<any>(`/students/${user.username}`);
          const followingIds = currentUserProfile.following?.map((f: any) => 
            typeof f === 'object' ? f._id?.toString() || f.id?.toString() : f.toString()
          ) || [];
          const profileId = profileData._id?.toString() || profileData.id?.toString();
          setIsFollowing(followingIds.includes(profileId));
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
        toast.error("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [username, user, isOwnProfile, setCurrentProfile, setThreads]);

  const handleFollowToggle = async () => {
    if (!profile || isOwnProfile || isFollowingLoading) return;

    const profileId = profile._id || profile.id;
    if (!profileId) return;

    // Optimistic update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    
    // Update followers count optimistically
    const currentFollowers = Array.isArray(profile.followers) 
      ? profile.followers.length 
      : (profile.followers as number) || 0;
    setProfile({
      ...profile,
      followers: wasFollowing ? currentFollowers - 1 : currentFollowers + 1,
    });

    setIsFollowingLoading(true);
    try {
      const response = await apiClient.post<{
        following: boolean;
        followerCount: number;
        user: any;
      }>(`/students/follow/${profileId}`);

      // Update state with server response
      setIsFollowing(response.following);
      setProfile({
        ...profile,
        followers: response.followerCount,
      });
      
      toast.success(response.following ? "Followed successfully" : "Unfollowed successfully");
    } catch (error) {
      // Revert on error
      setIsFollowing(wasFollowing);
      setProfile({
        ...profile,
        followers: currentFollowers,
      });
      console.error("Failed to update follow status", error);
      toast.error("Failed to update follow status");
    } finally {
      setIsFollowingLoading(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-black text-white page-transition">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center pt-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/80">Loading profile...</p>
        </div>
      </div>
    );
  }

  const followersCount = Array.isArray(profile.followers) 
    ? profile.followers.length 
    : (profile.followers as number) || 0;
  const followingCount = Array.isArray(profile.following) 
    ? profile.following.length 
    : (profile.following as number) || 0;

  return (
    <div className="min-h-screen bg-black text-white page-transition">
      <Navigation />

      {/* Cover Image */}
      <div className="pt-20">
        <div className="h-64 bg-white/5 relative">
          {profile.coverImage && (
            <img
              src={profile.coverImage}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
        </div>

      <div className="container mx-auto px-4 max-w-6xl -mt-20 relative">
        {/* Profile Header */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="h-32 w-32 border-4 border-background">
              <AvatarImage src={profile.avatar || profile.googleGmailPhoto} />
              <AvatarFallback className="text-3xl">{profile.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{profile.name}</h1>
                  <p className="text-muted-foreground">@{profile.username}</p>
                </div>
                <div className="flex gap-2">
                  {isOwnProfile ? (
                    <>
                      <Link to="/threads/create">
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          New Thread
                        </Button>
                      </Link>
                      <Link to="/profile/edit">
                        <Button size="sm" className="gradient-bg">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <Button
                      onClick={handleFollowToggle}
                      variant={isFollowing ? "outline" : "default"}
                      disabled={isFollowingLoading}
                      className={!isFollowing ? "gradient-bg" : ""}
                    >
                      {isFollowingLoading ? (
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      ) : null}
                      {isFollowing ? "Following" : "Follow"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6">
                <Link 
                  to={`/users/${profile.username}/followers`}
                  className="flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer"
                >
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">{followersCount}</span>
                  <span className="text-muted-foreground">Followers</span>
                </Link>
                <Link 
                  to={`/users/${profile.username}/following`}
                  className="flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer"
                >
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">{followingCount}</span>
                  <span className="text-muted-foreground">Following</span>
                </Link>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">{profile.courses || 0}</span>
                  <span className="text-muted-foreground">Courses</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">{profile.certificates || 0}</span>
                  <span className="text-muted-foreground">Certificates</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="threads" className="mb-8">
          <TabsList>
            <TabsTrigger value="threads">Threads</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="threads" className="mt-6">
            <div className="grid md:grid-cols-2 gap-4">
              {threads.slice(0, 10).map((thread) => (
                <Card key={thread.id} className="overflow-hidden hover-lift">
                  {thread.images && thread.images.length > 0 && (
                    <div className="aspect-video bg-muted">
                      <img
                        src={thread.images[0]}
                        alt="Thread"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="line-clamp-3 mb-4">{thread.content}</p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <button className="flex items-center gap-1 hover:text-foreground">
                          <Heart className={`h-4 w-4 ${thread.liked ? "fill-red-500 text-red-500" : ""}`} />
                          {thread.likes}
                        </button>
                        <button className="flex items-center gap-1 hover:text-foreground">
                          <MessageSquare className="h-4 w-4" />
                          {thread.comments}
                        </button>
                        <button className="flex items-center gap-1 hover:text-foreground">
                          <Share2 className="h-4 w-4" />
                          {thread.shares}
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="courses" className="mt-6">
            <Card className="p-6">
              <p className="text-muted-foreground">Courses will be displayed here</p>
            </Card>
          </TabsContent>

          <TabsContent value="certificates" className="mt-6">
            <Card className="p-6">
              <p className="text-muted-foreground">Certificates will be displayed here</p>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <Card className="p-6">
              <div className="space-y-4">
                {profile.skills && profile.skills.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((skill: string) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Social Links</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(profile.socialLinks).map(([platform, url]) => {
                        const getIcon = () => {
                          switch (platform.toLowerCase()) {
                            case 'github':
                              return <Github className="h-4 w-4" />;
                            case 'linkedin':
                              return <Linkedin className="h-4 w-4" />;
                            case 'twitter':
                              return <Twitter className="h-4 w-4" />;
                            case 'instagram':
                              return <Instagram className="h-4 w-4" />;
                            case 'portfolio':
                              return <Globe className="h-4 w-4" />;
                            default:
                              return <LinkIcon className="h-4 w-4" />;
                          }
                        };
                        return (
                          <a
                            key={platform}
                            href={url as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                          >
                            {getIcon()}
                            <span className="text-sm capitalize">{platform}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </div>
  );
}

