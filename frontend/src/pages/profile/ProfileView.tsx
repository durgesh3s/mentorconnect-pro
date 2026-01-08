import { useEffect } from "react";
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

export default function ProfileView() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuthStore();
  const { currentProfile, setCurrentProfile, threads, setThreads, followUser, unfollowUser, following } = useProfileStore();
  const isOwnProfile = user?.username === username;

  useEffect(() => {
    if (!username) return;

    const fetchProfile = async () => {
      try {
        const profile = await apiClient.get<any>(`/students/${username}`);
        setCurrentProfile(profile);
        setThreads(profile.threads || []);
      } catch (error) {
        console.error("Failed to fetch profile", error);
      }
    };

    fetchProfile();
  }, [username, setCurrentProfile, setThreads]);

  const handleFollow = async () => {
    if (!currentProfile) return;
    try {
      await apiClient.post(`/students/follow/${currentProfile._id || currentProfile.id}`);
      followUser(currentProfile.id);
    } catch (error) {
      console.error("Failed to follow user", error);
    }
  };

  const handleUnfollow = async () => {
    if (!currentProfile) return;
    try {
      await apiClient.post(`/students/follow/${currentProfile._id || currentProfile.id}`);
      unfollowUser(currentProfile.id);
    } catch (error) {
      console.error("Failed to unfollow user", error);
    }
  };

  if (!currentProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  const isFollowing = following.includes(currentProfile.id);

  return (
    <div className="min-h-screen bg-black text-white page-transition">
      <Navigation />

      {/* Cover Image */}
      <div className="pt-20">
        <div className="h-64 bg-white/5 relative">
          {currentProfile.coverImage && (
            <img
              src={currentProfile.coverImage}
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
              <AvatarImage src={currentProfile.avatar || currentProfile.googleGmailPhoto} />
              <AvatarFallback className="text-3xl">{currentProfile.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{currentProfile.name}</h1>
                  <p className="text-muted-foreground">@{currentProfile.username}</p>
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
                      onClick={isFollowing ? handleUnfollow : handleFollow}
                      variant={isFollowing ? "outline" : "default"}
                      className={!isFollowing ? "gradient-bg" : ""}
                    >
                      {isFollowing ? "Unfollow" : "Follow"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">{currentProfile.followers}</span>
                  <span className="text-muted-foreground">Followers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">{currentProfile.following}</span>
                  <span className="text-muted-foreground">Following</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">{currentProfile.courses}</span>
                  <span className="text-muted-foreground">Courses</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">{currentProfile.certificates}</span>
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
                {currentProfile.skills && currentProfile.skills.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {currentProfile.skills.map((skill: string) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {currentProfile.socialLinks && Object.keys(currentProfile.socialLinks).length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Social Links</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(currentProfile.socialLinks).map(([platform, url]) => {
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

