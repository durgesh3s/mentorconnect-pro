import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuthStore } from "@/lib/stores/authStore";
import { apiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import { Navigation } from "@/components/ui/navigation";

export default function Leaderboard() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [period, setPeriod] = useState<string>("all-time");

  useEffect(() => {
    if (!id) return;

    const fetchLeaderboard = async () => {
      try {
        const data = await apiClient.get<any[]>(`/courses/${id}/leaderboard`, {
          params: { period },
        });
        setLeaderboard(data);
      } catch (error) {
        console.error("Failed to fetch leaderboard", error);
      }
    };

    fetchLeaderboard();
  }, [id, period]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-orange-500" />;
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
  };

  const userRank = leaderboard.findIndex((entry) => entry.userId === user?.id) + 1;

  return (
    <div className="min-h-screen bg-black text-white page-transition">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-4xl pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Course Leaderboard</h1>
          <p className="text-muted-foreground">See where you stand among your peers</p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all-time">All Time</SelectItem>
            </SelectContent>
          </Select>

          {userRank > 0 && (
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Your Rank: #{userRank}
            </Badge>
          )}
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            {leaderboard.map((entry, index) => {
              const isCurrentUser = entry.userId === user?.id;
              return (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-4 p-4 rounded-lg ${
                    isCurrentUser ? "bg-primary/10 border-2 border-primary" : "bg-muted/50"
                  }`}
                >
                  <div className="w-12 flex items-center justify-center">
                    {getRankIcon(index + 1)}
                  </div>
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={entry.avatar || entry.googleGmailPhoto} />
                    <AvatarFallback>{entry.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{entry.name}</p>
                      {isCurrentUser && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>Score: {entry.score}</span>
                      <span>•</span>
                      <span>{entry.assignmentsCompleted} assignments</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-primary">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-bold">{entry.score}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

