import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, CheckCircle2, XCircle, Clock } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { AdminNavigation } from "@/components/admin/AdminNavigation";

export default function AdminAssessments() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        const data = await apiClient.get("/admin/assessments");
        setAssessments(data || []);
      } catch (error) {
        console.error("Failed to fetch assessments", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
      pending: {
        label: "Pending",
        icon: Clock,
        className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      },
      passed: {
        label: "Passed",
        icon: CheckCircle2,
        className: "bg-green-500/20 text-green-400 border-green-500/30",
      },
      failed: {
        label: "Failed",
        icon: XCircle,
        className: "bg-red-500/20 text-red-400 border-red-500/30",
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const filteredAssessments = assessments.filter((assessment) => {
    const matchesSearch =
      assessment.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assessment.courseTitle?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || assessment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <AdminNavigation />
      <div className="container mx-auto px-4 py-8 max-w-7xl pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">Assessment Management</h1>
          <p className="text-white/80">Review and manage student assessments</p>
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
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-white">Student</TableHead>
                <TableHead className="text-white">Course</TableHead>
                <TableHead className="text-white">Score</TableHead>
                <TableHead className="text-white">Status</TableHead>
                <TableHead className="text-white">Submitted At</TableHead>
                <TableHead className="text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-white/60 py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredAssessments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-white/60 py-8">
                    No assessments found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssessments.map((assessment) => (
                  <TableRow key={assessment.id} className="border-white/10">
                    <TableCell className="text-white font-medium">{assessment.studentName}</TableCell>
                    <TableCell className="text-white/80">{assessment.courseTitle}</TableCell>
                    <TableCell className="text-white/80">
                      {assessment.score !== undefined ? `${assessment.score}%` : "N/A"}
                    </TableCell>
                    <TableCell>{getStatusBadge(assessment.status || "pending")}</TableCell>
                    <TableCell className="text-white/60 text-sm">
                      {assessment.submittedAt || "Not submitted"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                        <Eye className="h-4 w-4" />
                      </Button>
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

