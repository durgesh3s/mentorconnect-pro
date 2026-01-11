import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Student {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  description?: string;
  phone?: string;
  education?: "high" | "secondary" | "graduation";
  location?: string;
  fieldsOfInterest?: string[];
  enrolledCourses?: any[];
  averageProgress?: number;
  status?: string;
  isProfileComplete?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StudentsResponse {
  students: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function StudentManagement() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [educationFilter, setEducationFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selected student for view/edit
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is admin
    if (!user || user.role !== "admin") {
      toast.error("Admin access required");
      navigate("/");
      return;
    }
  }, [user, navigate]);

  const fetchStudents = async (pageToFetch: number = pagination.page) => {
    if (!user || user.role !== "admin") return;
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pageToFetch.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(educationFilter !== "all" && { education: educationFilter }),
        ...(locationFilter && { location: locationFilter }),
      });

      const data = await apiClient.get<StudentsResponse>(`/admin/students?${params}`);
      setStudents(data.students);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Failed to fetch students", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  // Fetch when filters or pagination changes
  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetchStudents(pagination.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, statusFilter, educationFilter, locationFilter, sortBy, sortOrder, search]);

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleDelete = async (studentId: string) => {
    try {
      await apiClient.delete(`/admin/students/${studentId}`);
      toast.success("Student deleted successfully");
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
      fetchStudents();
    } catch (error) {
      console.error("Failed to delete student", error);
      toast.error("Failed to delete student");
    }
  };

  const handleViewStudent = async (studentId: string) => {
    try {
      const student = await apiClient.get<Student>(`/admin/students/${studentId}`);
      setSelectedStudent(student);
      setViewDialogOpen(true);
    } catch (error) {
      console.error("Failed to fetch student details", error);
      toast.error("Failed to load student details");
    }
  };

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground page-transition">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-7xl pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                Student Management
              </h1>
              <p className="text-muted-foreground">
                View, manage, and edit student accounts
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or username..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleSearch}>Search</Button>
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={educationFilter} onValueChange={setEducationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Education" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Education</SelectItem>
                  <SelectItem value="high">High School</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="graduation">Graduation</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Location..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>

            <div className="flex items-center gap-4 mt-4">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Created Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                {sortOrder === "asc" ? "↑ Ascending" : "↓ Descending"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Students ({pagination.total})
            </CardTitle>
            <CardDescription>
              Showing {students.length} of {pagination.total} students
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading students...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No students found</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Education</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Profile</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage
                                  src={student.avatar}
                                  alt={student.name}
                                />
                                <AvatarFallback>
                                  {student.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{student.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  @{student.username}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{student.email}</TableCell>
                          <TableCell>
                            {student.education ? (
                              <Badge variant="outline">
                                {student.education === "high"
                                  ? "High School"
                                  : student.education === "secondary"
                                  ? "Secondary"
                                  : "Graduation"}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.location || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.averageProgress !== undefined ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{student.averageProgress}%</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                student.status === "completed"
                                  ? "default"
                                  : student.status === "in_progress"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {student.status || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={student.isProfileComplete ? "default" : "secondary"}
                            >
                              {student.isProfileComplete ? "Complete" : "Incomplete"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewStudent(student.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <AlertDialog
                                open={deleteDialogOpen && studentToDelete === student.id}
                                onOpenChange={(open) => {
                                  setDeleteDialogOpen(open);
                                  if (!open) setStudentToDelete(null);
                                }}
                              >
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setStudentToDelete(student.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete {student.name}'s account.
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(student.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.pages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination({ ...pagination, page: pagination.page - 1 })
                      }
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination({ ...pagination, page: pagination.page + 1 })
                      }
                      disabled={pagination.page >= pagination.pages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* View Student Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Student Details</DialogTitle>
              <DialogDescription>
                View detailed information about the student
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={selectedStudent.avatar} alt={selectedStudent.name} />
                    <AvatarFallback className="text-2xl">
                      {selectedStudent.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-2xl font-bold">{selectedStudent.name}</h3>
                    <p className="text-muted-foreground">@{selectedStudent.username}</p>
                    <p className="text-sm text-muted-foreground">{selectedStudent.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p>{selectedStudent.phone || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Education</label>
                    <p>
                      {selectedStudent.education
                        ? selectedStudent.education === "high"
                          ? "High School"
                          : selectedStudent.education === "secondary"
                          ? "Secondary"
                          : "Graduation"
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Location</label>
                    <p>{selectedStudent.location || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Progress</label>
                    <p>{selectedStudent.averageProgress || 0}%</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Badge>{selectedStudent.status || "N/A"}</Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Profile</label>
                    <Badge variant={selectedStudent.isProfileComplete ? "default" : "secondary"}>
                      {selectedStudent.isProfileComplete ? "Complete" : "Incomplete"}
                    </Badge>
                  </div>
                </div>

                {selectedStudent.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="mt-1">{selectedStudent.description}</p>
                  </div>
                )}

                {selectedStudent.fieldsOfInterest &&
                  selectedStudent.fieldsOfInterest.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Fields of Interest
                      </label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedStudent.fieldsOfInterest.map((field, idx) => (
                          <Badge key={idx} variant="outline">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                {selectedStudent.enrolledCourses && selectedStudent.enrolledCourses.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Enrolled Courses
                    </label>
                    <div className="space-y-2 mt-1">
                      {selectedStudent.enrolledCourses.map((course: any, idx: number) => (
                        <div key={idx} className="p-2 border rounded">
                          <p className="font-medium">{course.courseId?.title || "Unknown Course"}</p>
                          <p className="text-sm text-muted-foreground">
                            Status: {course.status} | Progress: {course.progress || 0}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created At</label>
                    <p className="text-sm">
                      {new Date(selectedStudent.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                    <p className="text-sm">
                      {new Date(selectedStudent.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
