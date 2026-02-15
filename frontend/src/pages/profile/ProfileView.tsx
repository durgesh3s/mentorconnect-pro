import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuthStore } from "@/lib/stores/authStore";
import { useProfileStore } from "@/lib/stores/profileStore";
import { apiClient } from "@/lib/api/client";
import { getSocket } from "@/lib/utils/socket";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Heart, Share2, Plus, Edit, Users, BookOpen, Award, Github, Linkedin, Twitter, Globe, Instagram, Link as LinkIcon, MapPin, GraduationCap, Play, CheckCircle2, Clock, Copy, Facebook, Mail, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Navigation } from "@/components/ui/navigation";
import { toast } from "sonner";

interface CourseEnrollment {
  _id?: string;
  courseId: string | { _id: string; title: string; description?: string; thumbnail?: string; category?: string; level?: string; isFree?: boolean };
  status: "enrolled" | "inprogress" | "completed" | "failed";
  progress: number;
  enrolledAt: string;
  completedAt?: string;
  course?: {
    _id: string;
    title: string;
    description?: string;
    thumbnail?: string;
    category?: string;
    level?: string;
    isFree?: boolean;
  };
}

interface Thread {
  id: string;
  author: {
    id: string;
    username: string;
    name: string;
    avatar?: string | null;
    googleGmailPhoto?: string | null;
  };
  content: string;
  images?: string[];
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
  shared: boolean;
  createdAt: string;
}

interface Comment {
  id: string;
  threadId: string;
  author: {
    id: string;
    username: string;
    name: string;
    avatar?: string;
    googleGmailPhoto?: string;
  };
  content: string;
  likes: number;
  liked: boolean;
  createdAt: string;
}

interface ProfileData {
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
  followers?: any[] | number;
  following?: any[] | number;
  courses?: number;
  certificates?: number;
  threads?: Thread[];
  skills?: string[];
  socialLinks?: Record<string, string>;
  coursesEnrolledIn?: CourseEnrollment[];
}

export default function ProfileView() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuthStore();
  const { currentProfile, setCurrentProfile, setThreads } = useProfileStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [threads, setLocalThreads] = useState<Thread[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [likingThreadId, setLikingThreadId] = useState<string | null>(null);
  const [shareMenuOpen, setShareMenuOpen] = useState<string | null>(null);
  const isOwnProfile = user?.username === username;

  useEffect(() => {
    if (!username) return;

    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const profileData = await apiClient.get<ProfileData>(`/students/${username}`);
        setProfile(profileData);
        setCurrentProfile(profileData as any);
        
        // Set threads from profile data
        const threadsData = profileData.threads || [];
        setLocalThreads(threadsData);
        setThreads(threadsData); // Also update store for consistency

        // Check if current user is following this profile (use isFollowing from response if available)
        if (user && !isOwnProfile) {
          if ((profileData as any).isFollowing !== undefined) {
            setIsFollowing((profileData as any).isFollowing);
          } else {
            // Fallback: Check if current user's following list includes this profile
            const currentUserProfile = await apiClient.get<any>(`/students/${user.username}`);
            const followingIds = currentUserProfile.following?.map((f: any) => 
              typeof f === 'object' ? f._id?.toString() || f.id?.toString() : f.toString()
            ) || [];
            const profileId = profileData._id?.toString() || profileData.id?.toString();
            setIsFollowing(followingIds.includes(profileId));
          }
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

  // Listen for Socket.io follow updates
  useEffect(() => {
    if (!profile || isOwnProfile || !user) return;

    const profileId = profile._id?.toString() || profile.id?.toString();
    if (!profileId) return;

    const socket = getSocket();
    if (!socket) return;

    const handleFollowUpdate = (data: { targetUserId: string; following: boolean; followerCount: number }) => {
      if (data.targetUserId === profileId) {
        setIsFollowing(data.following);
        setProfile((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            followers: data.followerCount,
          };
        });
      }
    };

    const handleFollowerUpdate = (data: { followerId: string; followerCount: number }) => {
      const currentUserId = user.id || user._id?.toString();
      if (data.followerId === currentUserId && profileId === currentUserId) {
        // Update follower count if viewing own profile
        setProfile((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            followers: data.followerCount,
          };
        });
      }
    };

    socket.on("follow:updated", handleFollowUpdate);
    socket.on("follower:updated", handleFollowerUpdate);

    return () => {
      socket.off("follow:updated", handleFollowUpdate);
      socket.off("follower:updated", handleFollowerUpdate);
    };
  }, [profile, user, isOwnProfile]);

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

  const handleLike = async (threadId: string) => {
    if (likingThreadId || !user) {
      toast.error("Please login to like threads");
      return;
    }
    
    try {
      setLikingThreadId(threadId);
      const thread = threads.find((t) => t.id === threadId);
      const wasLiked = thread?.liked || false;
      
      // Optimistic update
      setLocalThreads(prev => prev.map(t => 
        t.id === threadId 
          ? { ...t, liked: !wasLiked, likes: wasLiked ? (t.likes || 0) - 1 : (t.likes || 0) + 1 }
          : t
      ));

      const response = await apiClient.post<{ liked: boolean; likes: number }>(`/threads/${threadId}/like`);
      
      // Update with server response
      setLocalThreads(prev => prev.map(t => 
        t.id === threadId 
          ? { ...t, liked: response.liked, likes: response.likes }
          : t
      ));
    } catch (error) {
      console.error("Failed to like thread", error);
      toast.error("Failed to like thread");
      // Revert optimistic update
      const thread = threads.find((t) => t.id === threadId);
      if (thread) {
        setLocalThreads(prev => prev.map(t => 
          t.id === threadId ? thread : t
        ));
      }
    } finally {
      setLikingThreadId(null);
    }
  };

  const getThreadUrl = (threadId: string) => {
    return `${window.location.origin}/feed?thread=${threadId}`;
  };

  const handleShare = async (threadId: string, platform?: string) => {
    if (!user) {
      toast.error("Please login to share threads");
      return;
    }

    const thread = threads.find((t) => t.id === threadId);
    const threadUrl = getThreadUrl(threadId);
    const threadContent = thread?.content || "";
    const shareText = `${threadContent}\n\n${threadUrl}`;

    try {
      // If user hasn't shared yet, increment share count
      if (!thread?.shared) {
        const response = await apiClient.post<{ shared: boolean; shares: number }>(`/threads/${threadId}/share`);
        setLocalThreads(prev => prev.map(t => 
          t.id === threadId 
            ? { ...t, shared: response.shared, shares: response.shares }
            : t
        ));
      }

      // Share based on platform
      if (platform === "copy") {
        await navigator.clipboard.writeText(threadUrl);
        toast.success("Link copied to clipboard!");
      } else if (platform === "twitter") {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
        window.open(twitterUrl, "_blank");
      } else if (platform === "facebook") {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(threadUrl)}`;
        window.open(facebookUrl, "_blank");
      } else if (platform === "linkedin") {
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(threadUrl)}`;
        window.open(linkedinUrl, "_blank");
      } else if (platform === "email") {
        const emailUrl = `mailto:?subject=${encodeURIComponent("Check out this thread")}&body=${encodeURIComponent(shareText)}`;
        window.location.href = emailUrl;
      }

      setShareMenuOpen(null);
    } catch (error) {
      console.error("Failed to share thread", error);
      toast.error("Failed to share thread");
    }
  };

  const handleOpenComments = async (threadId: string) => {
    if (!user) {
      toast.error("Please login to view comments");
      return;
    }

    setSelectedThreadId(threadId);
    setCommentContent("");
    setLoadingComments(true);
    
    try {
      const data = await apiClient.get<Comment[]>(`/threads/${threadId}/comments`);
      setComments(data);
    } catch (error) {
      console.error("Failed to fetch comments", error);
      toast.error("Failed to load comments");
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!selectedThreadId || !commentContent.trim() || !user) return;

    try {
      setSubmittingComment(true);
      const newComment = await apiClient.post<Comment>(`/threads/${selectedThreadId}/comments`, {
        content: commentContent.trim(),
      });

      setComments([newComment, ...comments]);
      setCommentContent("");
      
      // Update thread comment count
      setLocalThreads(prev => prev.map(t => 
        t.id === selectedThreadId 
          ? { ...t, comments: (t.comments || 0) + 1 }
          : t
      ));
      
      toast.success("Comment added!");
    } catch (error) {
      console.error("Failed to create comment", error);
      toast.error("Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-background text-foreground page-transition">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center pt-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bordermx-auto mb-4"></div>
          <p className="text-foreground/80">Loading profile...</p>
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
  
  // Calculate courses count from enrolled courses
  const enrolledCourses = profile.coursesEnrolledIn || [];
  const coursesCount = enrolledCourses.length;
  
  // Filter courses by status
  const inProgressCourses = enrolledCourses.filter(c => c.status === "inprogress");
  const completedCourses = enrolledCourses.filter(c => c.status === "completed");
  const enrolledOnlyCourses = enrolledCourses.filter(c => c.status === "enrolled");

  return (
    <div className="min-h-screen bg-background text-foreground page-transition">
      <Navigation />

      <div className="container mx-auto px-4 max-w-6xl pt-24 pb-8">
        {/* Profile Header */}
        <Card className="p-6 mb-6 border-border">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="h-24 w-24 md:h-28 md:w-28 border-2 border-border flex-shrink-0">
              <AvatarImage src={profile.avatar || profile.googleGmailPhoto} />
              <AvatarFallback className="text-2xl md:text-3xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                {profile.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 w-full min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold mb-1 truncate">{profile.name}</h1>
                  <p className="text-muted-foreground text-sm md:text-base">@{profile.username}</p>
                  {profile.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{profile.description}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {isOwnProfile ? (
                    <>
                      <Link to="/threads/create">
                        <Button variant="outline" size="sm" className="border-border">
                          <Plus className="h-4 w-4 mr-2" />
                          New Thread
                        </Button>
                      </Link>
                      <Link to="/profile/edit">
                        <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
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
                      size="sm"
                      className={isFollowing 
                        ? "border-border text-foreground hover:bg-accent" 
                        : "bg-blue-500 hover:bg-blue-600 text-white border-0"
                      }
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
              <div className="flex items-center gap-4 md:gap-6 flex-wrap">
                <Link 
                  to={`/users/${profile.username}/followers`}
                  className="flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer"
                >
                  <span className="font-semibold text-foreground">{followersCount}</span>
                  <span className="text-muted-foreground text-sm">Followers</span>
                </Link>
                <Link 
                  to={`/users/${profile.username}/following`}
                  className="flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer"
                >
                  <span className="font-semibold text-foreground">{followingCount}</span>
                  <span className="text-muted-foreground text-sm">Following</span>
                </Link>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{coursesCount}</span>
                  <span className="text-muted-foreground text-sm">Courses</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{profile.certificates || 0}</span>
                  <span className="text-muted-foreground text-sm">Certificates</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="threads" className="mb-8">
          <TabsList className="bg-card/50 border-border mb-6">
            <TabsTrigger value="threads" className="data-[state=active]:bg-foreground data-[state=active]:text-background">
              Threads
            </TabsTrigger>
            <TabsTrigger value="courses" className="data-[state=active]:bg-foreground data-[state=active]:text-background">
              Courses
            </TabsTrigger>
            <TabsTrigger value="certificates" className="data-[state=active]:bg-foreground data-[state=active]:text-background">
              Certificates
            </TabsTrigger>
            <TabsTrigger value="about" className="data-[state=active]:bg-foreground data-[state=active]:text-background">
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="threads" className="mt-0">
            {threads.length === 0 ? (
              <Card className="p-12 border-border">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No threads yet</p>
                </div>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {threads.map((thread) => (
                  <Card key={thread.id} className="overflow-hidden hover:border-primary/50 transition-all border-border">
                    {thread.images && thread.images.length > 0 && (
                      <div className="aspect-video bg-muted overflow-hidden">
                        <img
                          src={thread.images[0]}
                          alt="Thread"
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <p className="line-clamp-3 mb-4 text-foreground text-sm leading-relaxed">{thread.content}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleLike(thread.id)}
                            disabled={likingThreadId === thread.id}
                            className="flex items-center gap-1 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {likingThreadId === thread.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Heart className={`h-4 w-4 ${thread.liked ? "fill-red-500 text-red-500" : ""}`} />
                            )}
                            <span>{thread.likes || 0}</span>
                          </button>
                          <button 
                            onClick={() => handleOpenComments(thread.id)}
                            className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span>{thread.comments || 0}</span>
                          </button>
                          <Popover open={shareMenuOpen === thread.id} onOpenChange={(open) => setShareMenuOpen(open ? thread.id : null)}>
                            <PopoverTrigger asChild>
                              <button className="flex items-center gap-1 hover:text-green-500 transition-colors">
                                <Share2 className="h-4 w-4" />
                                <span>{thread.shares || 0}</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2" align="end">
                              <div className="space-y-1">
                                <button
                                  onClick={() => handleShare(thread.id, "copy")}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors text-sm"
                                >
                                  <Copy className="h-4 w-4" />
                                  Copy Link
                                </button>
                                <button
                                  onClick={() => handleShare(thread.id, "twitter")}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors text-sm"
                                >
                                  <Twitter className="h-4 w-4" />
                                  Twitter
                                </button>
                                <button
                                  onClick={() => handleShare(thread.id, "facebook")}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors text-sm"
                                >
                                  <Facebook className="h-4 w-4" />
                                  Facebook
                                </button>
                                <button
                                  onClick={() => handleShare(thread.id, "linkedin")}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors text-sm"
                                >
                                  <Linkedin className="h-4 w-4" />
                                  LinkedIn
                                </button>
                                <button
                                  onClick={() => handleShare(thread.id, "email")}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors text-sm"
                                >
                                  <Mail className="h-4 w-4" />
                                  Email
                                </button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        {thread.createdAt && (
                          <span className="text-xs">
                            {new Date(thread.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="courses" className="mt-6">
            {enrolledCourses.length === 0 ? (
              <Card className="p-6">
                <p className="text-muted-foreground text-center">No courses enrolled yet</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {enrolledCourses.map((enrollment) => {
                  const course = enrollment.course || (typeof enrollment.courseId === 'object' ? enrollment.courseId : null);
                  const courseTitle = course?.title || "Unknown Course";
                  const courseThumbnail = course?.thumbnail;
                  const courseDescription = course?.description;
                  const progress = enrollment.progress || 0;
                  const status = enrollment.status;
                  
                  const getStatusBadge = () => {
                    switch (status) {
                      case "completed":
                        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
                      case "inprogress":
                        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30"><Play className="h-3 w-3 mr-1" />In Progress</Badge>;
                      case "failed":
                        return <Badge variant="destructive">Failed</Badge>;
                      default:
                        return <Badge className="bg-gray-500/20 text-gray-500 border-gray-500/30"><Clock className="h-3 w-3 mr-1" />Enrolled</Badge>;
                    }
                  };

                  return (
                    <Card key={enrollment._id} className="overflow-hidden hover:border-primary/50 transition-colors">
                      <div className="flex flex-col md:flex-row gap-4 p-4">
                        {courseThumbnail && (
                          <div className="w-full md:w-48 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                            <img
                              src={courseThumbnail}
                              alt={courseTitle}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground mb-1 line-clamp-2">{courseTitle}</h3>
                              {courseDescription && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{courseDescription}</p>
                              )}
                              {course?.category && (
                                <Badge variant="outline" className="text-xs mb-2">{course.category}</Badge>
                              )}
                            </div>
                            {getStatusBadge()}
                          </div>
                          
                          {status === "inprogress" && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Progress</span>
                                <span className="font-medium">{Math.round(progress)}%</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>
                          )}
                          
                          {status === "completed" && enrollment.completedAt && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Completed on {new Date(enrollment.completedAt).toLocaleDateString()}
                            </p>
                          )}
                          
                          {enrollment.enrolledAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Enrolled on {new Date(enrollment.enrolledAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="certificates" className="mt-6">
            <Card className="p-6">
              <p className="text-muted-foreground">Certificates will be displayed here</p>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <Card className="p-6">
              <div className="space-y-6">
                {profile.description && (
                  <div>
                    <h3 className="font-semibold mb-2">About</h3>
                    <p className="text-muted-foreground">{profile.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="font-medium capitalize">{profile.location}</p>
                      </div>
                    </div>
                  )}
                  
                  {profile.education && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Education</p>
                        <p className="font-medium capitalize">{profile.education}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {profile.fieldsOfInterest && profile.fieldsOfInterest.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Fields of Interest</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.fieldsOfInterest.map((field: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
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

      {/* Comments Dialog */}
      <Dialog open={selectedThreadId !== null} onOpenChange={(open) => !open && setSelectedThreadId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          
          {loadingComments ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-4">
                {comments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No comments yet</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.author.avatar || comment.author.googleGmailPhoto} />
                        <AvatarFallback className="text-xs">
                          {comment.author.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{comment.author.name}</span>
                          <span className="text-xs text-muted-foreground">
                            @{comment.author.username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {user && (
                <div className="border-t border-border pt-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Write a comment..."
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                    <Button
                      onClick={handleSubmitComment}
                      disabled={!commentContent.trim() || submittingComment}
                      className="self-end"
                    >
                      {submittingComment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Post"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

