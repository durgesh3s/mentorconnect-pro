import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useProfileStore } from "@/lib/stores/profileStore";
import { apiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Heart, Share2, Plus, X, ZoomIn, Loader2, Copy, Twitter, Facebook, Linkedin, Mail } from "lucide-react";
import { Navigation } from "@/components/ui/navigation";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

export default function Feed() {
  const { threads, setThreads, updateThread } = useProfileStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<"all" | "following">("all");
  const [loading, setLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [likingThreadId, setLikingThreadId] = useState<string | null>(null);
  const [shareMenuOpen, setShareMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get<any[]>("/feed", {
          params: { filter },
        });
        setThreads(data);
      } catch (error) {
        console.error("Failed to fetch feed", error);
        toast.error("Failed to load feed");
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [filter, setThreads]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const handleLike = async (threadId: string) => {
    if (likingThreadId) return; // Prevent double clicks
    
    try {
      setLikingThreadId(threadId);
      const thread = threads.find((t) => t.id === threadId);
      const wasLiked = thread?.liked || false;
      
      // Optimistic update
      updateThread(threadId, {
        liked: !wasLiked,
        likes: wasLiked ? (thread?.likes || 0) - 1 : (thread?.likes || 0) + 1,
      });

      const response = await apiClient.post(`/threads/${threadId}/like`);
      
      // Update with server response
      updateThread(threadId, {
        liked: response.liked,
        likes: response.likes,
      });
    } catch (error) {
      console.error("Failed to like thread", error);
      toast.error("Failed to like thread");
      // Revert optimistic update
      const thread = threads.find((t) => t.id === threadId);
      if (thread) {
        updateThread(threadId, {
          liked: thread.liked,
          likes: thread.likes,
        });
      }
    } finally {
      setLikingThreadId(null);
    }
  };

  const getThreadUrl = (threadId: string) => {
    return `${window.location.origin}/feed?thread=${threadId}`;
  };

  const handleShare = async (threadId: string, platform?: string) => {
    const thread = threads.find((t) => t.id === threadId);
    const threadUrl = getThreadUrl(threadId);
    const threadContent = thread?.content || "";
    const shareText = `${threadContent}\n\n${threadUrl}`;

    try {
      // If user hasn't shared yet, increment share count
      if (!thread?.shared) {
        await apiClient.post(`/threads/${threadId}/share`);
        if (thread) {
          updateThread(threadId, {
            shared: true,
            shares: (thread.shares || 0) + 1,
          });
        }
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
      } else if (navigator.share) {
        // Use native share API if available
        try {
          await navigator.share({
            title: "Check out this thread",
            text: threadContent,
            url: threadUrl,
          });
        } catch (err) {
          // User cancelled or error occurred
          if ((err as Error).name !== "AbortError") {
            await navigator.clipboard.writeText(threadUrl);
            toast.success("Link copied to clipboard!");
          }
        }
      } else {
        // Fallback to copy
        await navigator.clipboard.writeText(threadUrl);
        toast.success("Link copied to clipboard!");
      }

      setShareMenuOpen(null);
    } catch (error) {
      console.error("Failed to share thread", error);
      toast.error("Failed to share thread");
    }
  };

  const handleOpenComments = async (threadId: string) => {
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
    if (!selectedThreadId || !commentContent.trim()) return;

    try {
      setSubmittingComment(true);
      const newComment = await apiClient.post(`/threads/${selectedThreadId}/comments`, {
        content: commentContent.trim(),
      });

      setComments([newComment, ...comments]);
      setCommentContent("");
      
      // Update thread comment count
      const thread = threads.find((t) => t.id === selectedThreadId);
      if (thread) {
        updateThread(selectedThreadId, {
          comments: (thread.comments || 0) + 1,
        });
      }
      
      toast.success("Comment added!");
    } catch (error) {
      console.error("Failed to create comment", error);
      toast.error("Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  // Clear URL parameter when dialog closes
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setSelectedThreadId(null);
      // Remove thread parameter from URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("thread");
      setSearchParams(newSearchParams, { replace: true });
    }
  };

  // Handle thread query parameter - open comments dialog if thread ID is in URL
  useEffect(() => {
    const threadIdFromUrl = searchParams.get("thread");
    if (threadIdFromUrl && threads.length > 0 && !selectedThreadId) {
      // Check if the thread exists in the loaded threads
      const threadExists = threads.some((t) => t.id === threadIdFromUrl);
      if (threadExists) {
        const openThreadComments = async () => {
          setSelectedThreadId(threadIdFromUrl);
          setCommentContent("");
          setLoadingComments(true);
          
          try {
            const data = await apiClient.get<Comment[]>(`/threads/${threadIdFromUrl}/comments`);
            setComments(data);
          } catch (error) {
            console.error("Failed to fetch comments", error);
            toast.error("Failed to load comments");
          } finally {
            setLoadingComments(false);
          }
        };
        openThreadComments();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, threads]);

  return (
    <div className="min-h-screen bg-background text-foreground page-transition">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-3xl pt-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Feed
          </h1>
          <Link to="/threads/create">
            <Button className="gradient-bg hover:scale-105 transition-transform duration-200">
              <Plus className="h-4 w-4 mr-2" />
              New Thread
            </Button>
          </Link>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-6">
          <TabsList className="bg-card/50 border-border">
            <TabsTrigger value="all" className="data-[state=active]:bg-foreground/10">
              All
            </TabsTrigger>
            <TabsTrigger value="following" className="data-[state=active]:bg-foreground/10">
              Following
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-foreground/40" />
          </div>
        ) : (
          <div className="space-y-6">
            {threads.length === 0 ? (
              <Card className="p-12 text-center bg-card/50 backdrop-blur-md border-border">
                <p className="text-foreground/60">
                  {filter === "following"
                    ? "You're not following anyone yet. Start following people to see their threads!"
                    : "No threads yet. Be the first to create one!"}
                </p>
              </Card>
            ) : (
              threads.map((thread) => (
                <Card
                  key={thread.id}
                  className="p-6 bg-card/50 backdrop-blur-md border-border hover:bg-foreground/10 transition-all duration-300 rounded-xl"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <Link to={`/profile/${thread.author.username}`}>
                      <Avatar className="hover:ring-2 ring-white/20 transition-all duration-200 cursor-pointer">
                        <AvatarImage
                          src={thread.author.avatar || thread.author.googleGmailPhoto}
                        />
                        <AvatarFallback className="bg-foreground/10">
                          {thread.author.name[0]}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Link
                          to={`/profile/${thread.author.username}`}
                          className="font-semibold hover:underline transition-colors"
                        >
                          {thread.author.name}
                        </Link>
                        <span className="text-sm text-foreground/60">
                          @{thread.author.username}
                        </span>
                        <span className="text-sm text-foreground/60">•</span>
                        <span className="text-sm text-foreground/60">
                          {formatDate(thread.createdAt)}
                        </span>
                      </div>
                      <p className="mb-4 whitespace-pre-wrap text-foreground/90 leading-relaxed">
                        {thread.content}
                      </p>
                      {thread.images && thread.images.length > 0 && (
                        <div
                          className={`grid gap-2 mb-4 ${
                            thread.images.length === 1
                              ? "grid-cols-1"
                              : thread.images.length === 2
                              ? "grid-cols-2"
                              : "grid-cols-2"
                          }`}
                        >
                          {thread.images.map((img, idx) => (
                            <div
                              key={idx}
                              className="relative group cursor-pointer overflow-hidden rounded-lg"
                              onClick={() => setZoomedImage(img)}
                            >
                              <img
                                src={img}
                                alt={`Thread image ${idx + 1}`}
                                className="rounded-lg object-cover w-full h-64 group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                                <ZoomIn className="h-8 w-8 text-foregroundopacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-6 text-sm text-foreground/60 pt-2 border-t border-border">
                        <button
                          onClick={() => handleLike(thread.id)}
                          disabled={likingThreadId === thread.id}
                          className={`flex items-center gap-2 hover:text-foreground transition-all duration-200 disabled:opacity-50 ${
                            thread.liked ? "text-red-500" : ""
                          }`}
                        >
                          {likingThreadId === thread.id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Heart
                              className={`h-5 w-5 transition-all duration-200 ${
                                thread.liked ? "fill-red-500" : ""
                              }`}
                            />
                          )}
                          <span>{thread.likes}</span>
                        </button>
                        <button
                          onClick={() => handleOpenComments(thread.id)}
                          className="flex items-center gap-2 hover:text-foreground transition-colors duration-200"
                        >
                          <MessageSquare className="h-5 w-5" />
                          <span>{thread.comments}</span>
                        </button>
                        <Popover open={shareMenuOpen === thread.id} onOpenChange={(open) => setShareMenuOpen(open ? thread.id : null)}>
                          <PopoverTrigger asChild>
                            <button
                              className={`flex items-center gap-2 hover:text-foreground transition-colors duration-200 ${
                                thread.shared ? "text-blue-400" : ""
                              }`}
                            >
                              <Share2 className={`h-5 w-5 ${thread.shared ? "fill-blue-400" : ""}`} />
                              <span>{thread.shares}</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 bg-background border-border p-2">
                            <div className="space-y-1">
                              {navigator.share && (
                                <button
                                  onClick={() => handleShare(thread.id)}
                                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-foreground/10 transition-colors text-left"
                                >
                                  <Share2 className="h-4 w-4" />
                                  <span>Share via...</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleShare(thread.id, "copy")}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-foreground/10 transition-colors text-left"
                              >
                                <Copy className="h-4 w-4" />
                                <span>Copy Link</span>
                              </button>
                              <button
                                onClick={() => handleShare(thread.id, "twitter")}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-foreground/10 transition-colors text-left"
                              >
                                <Twitter className="h-4 w-4" />
                                <span>Twitter</span>
                              </button>
                              <button
                                onClick={() => handleShare(thread.id, "facebook")}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-foreground/10 transition-colors text-left"
                              >
                                <Facebook className="h-4 w-4" />
                                <span>Facebook</span>
                              </button>
                              <button
                                onClick={() => handleShare(thread.id, "linkedin")}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-foreground/10 transition-colors text-left"
                              >
                                <Linkedin className="h-4 w-4" />
                                <span>LinkedIn</span>
                              </button>
                              <button
                                onClick={() => handleShare(thread.id, "email")}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-foreground/10 transition-colors text-left"
                              >
                                <Mail className="h-4 w-4" />
                                <span>Email</span>
                              </button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-foregroundhover:text-gray-300 transition-colors"
            onClick={() => setZoomedImage(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={zoomedImage}
            alt="Zoomed"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Comments Dialog */}
      <Dialog open={selectedThreadId !== null} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl">Comments</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            {/* Comment Input */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Write a comment..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                className="bg-card/50 border-border text-foregroundresize-none"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleSubmitComment();
                  }
                }}
              />
              <Button
                onClick={handleSubmitComment}
                disabled={!commentContent.trim() || submittingComment}
                className="gradient-bg"
              >
                {submittingComment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Post"
                )}
              </Button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {loadingComments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-foreground/60 py-8">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex gap-3 p-3 rounded-lg bg-card/50 hover:bg-foreground/10 transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={comment.author.avatar || comment.author.googleGmailPhoto}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-xs">
                        {comment.author.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          {comment.author.name}
                        </span>
                        <span className="text-xs text-foreground/60">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
