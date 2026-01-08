import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Calendar, CheckCircle2, XCircle, Clock, Plus } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { AdminNavigation } from "@/components/admin/AdminNavigation";

export default function AdminInterviews() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<any>(null);

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const data = await apiClient.get("/admin/interviews");
        setInterviews(data || []);
      } catch (error) {
        console.error("Failed to fetch interviews", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInterviews();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
      scheduled: {
        label: "Scheduled",
        icon: Calendar,
        className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      },
      completed: {
        label: "Completed",
        icon: CheckCircle2,
        className: "bg-green-500/20 text-green-400 border-green-500/30",
      },
      passed: {
        label: "Passed",
        icon: CheckCircle2,
        className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      },
      failed: {
        label: "Failed",
        icon: XCircle,
        className: "bg-red-500/20 text-red-400 border-red-500/30",
      },
      cancelled: {
        label: "Cancelled",
        icon: XCircle,
        className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      },
    };

    const config = statusConfig[status] || statusConfig.scheduled;
    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const handleUpdateStatus = async (interviewId: string, status: string, feedback?: string) => {
    try {
      await apiClient.put(`/admin/interviews/${interviewId}`, { status, feedback });
      setInterviews(
        interviews.map((i) => (i.id === interviewId ? { ...i, status, feedback } : i))
      );
      setIsDialogOpen(false);
      setSelectedInterview(null);
    } catch (error) {
      console.error("Failed to update interview", error);
    }
  };

  const filteredInterviews = interviews.filter((interview) => {
    const matchesSearch =
      interview.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interview.courseTitle?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || interview.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <AdminNavigation />
      <div className="container mx-auto px-4 py-8 max-w-7xl pt-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-white">Interview Management</h1>
            <p className="text-white/80">Schedule and manage student interviews</p>
          </div>
          <Button className="bg-white text-black hover:bg-white/90">
            <Plus className="h-4 w-4 mr-2" />
            Schedule Interview
          </Button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
            <Input
              placeholder="Search by student or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-white">Student</TableHead>
                <TableHead className="text-white">Course</TableHead>
                <TableHead className="text-white">Date & Time</TableHead>
                <TableHead className="text-white">Status</TableHead>
                <TableHead className="text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-white/60 py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredInterviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-white/60 py-8">
                    No interviews found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInterviews.map((interview) => (
                  <TableRow key={interview.id} className="border-white/10">
                    <TableCell className="text-white font-medium">{interview.studentName}</TableCell>
                    <TableCell className="text-white/80">{interview.courseTitle}</TableCell>
                    <TableCell className="text-white/80">
                      {interview.scheduledAt
                        ? new Date(interview.scheduledAt).toLocaleString()
                        : "Not scheduled"}
                    </TableCell>
                    <TableCell>{getStatusBadge(interview.status || "scheduled")}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedInterview(interview)}
                            className="text-white/80 hover:text-white hover:bg-white/10"
                          >
                            Manage
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-black border-white/10 text-white">
                          <DialogHeader>
                            <DialogTitle>Interview Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label className="text-white/80">Student</Label>
                              <p className="text-white">{interview.studentName}</p>
                            </div>
                            <div>
                              <Label className="text-white/80">Course</Label>
                              <p className="text-white">{interview.courseTitle}</p>
                            </div>
                            <div>
                              <Label className="text-white/80">Scheduled At</Label>
                              <p className="text-white">
                                {interview.scheduledAt
                                  ? new Date(interview.scheduledAt).toLocaleString()
                                  : "Not scheduled"}
                              </p>
                            </div>
                            <div>
                              <Label className="text-white/80">Status</Label>
                              <div className="mt-2">{getStatusBadge(interview.status || "scheduled")}</div>
                            </div>
                            {interview.feedback && (
                              <div>
                                <Label className="text-white/80">Feedback</Label>
                                <p className="text-white/80 mt-2">{interview.feedback}</p>
                              </div>
                            )}
                            <div className="flex gap-2 pt-4">
                              <Button
                                onClick={() => handleUpdateStatus(interview.id, "passed", "Interview passed")}
                                className="bg-green-500 hover:bg-green-600"
                              >
                                Mark as Passed
                              </Button>
                              <Button
                                onClick={() => handleUpdateStatus(interview.id, "failed", "Interview failed")}
                                variant="destructive"
                              >
                                Mark as Failed
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

