import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProfileStore } from "@/lib/stores/profileStore";
import { apiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Heart, Share2, Plus } from "lucide-react";
import { Navigation } from "@/components/ui/navigation";

export default function Feed() {
  const { threads, setThreads, updateThread } = useProfileStore();
  const [filter, setFilter] = useState<"all" | "following">("all");

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const data = await apiClient.get<any[]>("/feed", {
          params: { filter },
        });
        setThreads(data);
      } catch (error) {
        console.error("Failed to fetch feed", error);
      }
    };

    fetchFeed();
  }, [filter, setThreads]);

  const handleLike = async (threadId: string) => {
    try {
      await apiClient.post(`/threads/${threadId}/like`);
      updateThread(threadId, {
        liked: !threads.find((t) => t.id === threadId)?.liked,
        likes: (threads.find((t) => t.id === threadId)?.likes || 0) + 1,
      });
    } catch (error) {
      console.error("Failed to like thread", error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white page-transition">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-3xl pt-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Feed</h1>
          <Link to="/threads/create">
            <Button className="gradient-bg">
              <Plus className="h-4 w-4 mr-2" />
              New Thread
            </Button>
          </Link>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {threads.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No threads yet. Start following people!</p>
            </Card>
          ) : (
            threads.map((thread) => (
              <Card key={thread.id} className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <Link to={`/profile/${thread.author.username}`}>
                    <Avatar>
                      <AvatarImage src={thread.author.avatar || thread.author.googleGmailPhoto} />
                      <AvatarFallback>{thread.author.name[0]}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Link
                        to={`/profile/${thread.author.username}`}
                        className="font-semibold hover:underline"
                      >
                        {thread.author.name}
                      </Link>
                      <span className="text-sm text-muted-foreground">
                        @{thread.author.username}
                      </span>
                      <span className="text-sm text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{thread.createdAt}</span>
                    </div>
                    <p className="mb-4 whitespace-pre-wrap">{thread.content}</p>
                    {thread.images && thread.images.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {thread.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Thread image ${idx + 1}`}
                            className="rounded-lg object-cover w-full h-48"
                          />
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <button
                        onClick={() => handleLike(thread.id)}
                        className={`flex items-center gap-2 hover:text-foreground ${
                          thread.liked ? "text-red-500" : ""
                        }`}
                      >
                        <Heart className={`h-5 w-5 ${thread.liked ? "fill-red-500" : ""}`} />
                        {thread.likes}
                      </button>
                      <button className="flex items-center gap-2 hover:text-foreground">
                        <MessageSquare className="h-5 w-5" />
                        {thread.comments}
                      </button>
                      <button className="flex items-center gap-2 hover:text-foreground">
                        <Share2 className="h-5 w-5" />
                        {thread.shares}
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

