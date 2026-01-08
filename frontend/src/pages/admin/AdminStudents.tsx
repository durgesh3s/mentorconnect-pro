import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, Mail, Phone } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { AdminNavigation } from "@/components/admin/AdminNavigation";

export default function AdminStudents() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await apiClient.get("/admin/students");
        setStudents(data || []);
      } catch (error) {
        console.error("Failed to fetch students", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      enrolled: { label: "Enrolled", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
      in_progress: { label: "In Progress", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
      completed: { label: "Completed", className: "bg-green-500/20 text-green-400 border-green-500/30" },
      failed: { label: "Failed", className: "bg-red-500/20 text-red-400 border-red-500/30" },
      assessment_pending: { label: "Assessment Pending", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
      interview_scheduled: { label: "Interview Scheduled", className: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
      interview_passed: { label: "Interview Passed", className: "bg-teal-500/20 text-teal-400 border-teal-500/30" },
      offer_issued: { label: "Offer Issued", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    };

    const config = statusConfig[status] || statusConfig.enrolled;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || student.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <AdminNavigation />
      <div className="container mx-auto px-4 py-8 max-w-7xl pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">Student Management</h1>
          <p className="text-white/80">View and manage all students and their progress</p>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
            <Input
              placeholder="Search students by name or email..."
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
              <SelectItem value="enrolled">Enrolled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="assessment_pending">Assessment Pending</SelectItem>
              <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
              <SelectItem value="interview_passed">Interview Passed</SelectItem>
              <SelectItem value="offer_issued">Offer Issued</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-white">Name</TableHead>
                <TableHead className="text-white">Email</TableHead>
                <TableHead className="text-white">Courses Enrolled</TableHead>
                <TableHead className="text-white">Current Status</TableHead>
                <TableHead className="text-white">Progress</TableHead>
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
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-white/60 py-8">
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.id} className="border-white/10">
                    <TableCell className="text-white font-medium">{student.name}</TableCell>
                    <TableCell className="text-white/80">{student.email}</TableCell>
                    <TableCell className="text-white/80">{student.enrolledCourses?.length || 0}</TableCell>
                    <TableCell>{getStatusBadge(student.status || "enrolled")}</TableCell>
                    <TableCell className="text-white/80">
                      {student.averageProgress || 0}%
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

