import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import {
  BookOpen,
  Search,
  Filter,
  Edit,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Shield,
  ArrowLeft,
  Eye,
  EyeOff,
  Star,
} from "lucide-react";
import { toast } from "sonner";

interface Course {
  _id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  youtubeId: string;
  youtubeType: "video" | "playlist";
  videoCount: number;
  duration: number;
  category: string;
  level: "beginner" | "intermediate" | "advanced";
  tags: string[];
  thumbnail?: string;
  isFree: boolean;
  price?: number;
  instructor: string;
  isPublished: boolean;
  isFeatured: boolean;
  enrollmentsCount: number;
  averageRating?: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CoursesResponse {
  courses: Course[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function CourseManagement() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [publishedFilter, setPublishedFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      toast.error("Admin access required");
      navigate("/");
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, categoryFilter, levelFilter, publishedFilter, sortBy, sortOrder, search]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(categoryFilter !== "all" && { category: categoryFilter }),
        ...(levelFilter !== "all" && { level: levelFilter }),
        ...(publishedFilter !== "all" && { isPublished: publishedFilter }),
      });

      const data = await apiClient.get<CoursesResponse>(`/courses/admin?${params}`);
      setCourses(data.courses);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Failed to fetch courses", error);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleDelete = async (courseId: string) => {
    try {
      await apiClient.delete(`/courses/admin/${courseId}`);
      toast.success("Course deleted successfully");
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
      fetchCourses();
    } catch (error) {
      console.error("Failed to delete course", error);
      toast.error("Failed to delete course");
    }
  };

  const handleTogglePublish = async (course: Course) => {
    try {
      await apiClient.patch(`/courses/admin/${course._id}`, {
        isPublished: !course.isPublished,
      });
      toast.success(course.isPublished ? "Course unpublished" : "Course published");
      fetchCourses();
    } catch (error) {
      console.error("Failed to update course", error);
      toast.error("Failed to update course");
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
                Course Management
              </h1>
              <p className="text-muted-foreground">Create, edit, and manage courses</p>
            </div>
            <Link to="/admin/courses/create">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Course
              </Button>
            </Link>
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
                      placeholder="Search courses..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleSearch}>Search</Button>
                </div>
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Web Development">Web Development</SelectItem>
                  <SelectItem value="Data Science">Data Science</SelectItem>
                  <SelectItem value="Mobile Development">Mobile Development</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>

              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>

              <Select value={publishedFilter} onValueChange={setPublishedFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Published</SelectItem>
                  <SelectItem value="false">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4 mt-4">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Created Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="enrollmentsCount">Enrollments</SelectItem>
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

        {/* Courses Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Courses ({pagination.total})
            </CardTitle>
            <CardDescription>Showing {courses.length} of {pagination.total} courses</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading courses...</p>
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No courses found</p>
                <Link to="/admin/courses/create" className="mt-4 inline-block">
                  <Button>Create First Course</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Enrollments</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courses.map((course) => (
                        <TableRow key={course._id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{course.title}</div>
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {course.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {course.youtubeType === "playlist" ? "Playlist" : "Video"}
                              {course.videoCount > 1 && ` (${course.videoCount})`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{course.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                course.level === "beginner"
                                  ? "default"
                                  : course.level === "intermediate"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {course.level}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{course.enrollmentsCount}</span>
                              {course.isFeatured && (
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={course.isPublished ? "default" : "secondary"}>
                                {course.isPublished ? "Published" : "Draft"}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTogglePublish(course)}
                                title={course.isPublished ? "Unpublish" : "Publish"}
                              >
                                {course.isPublished ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link to={`/admin/courses/${course._id}/edit`}>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              <AlertDialog
                                open={deleteDialogOpen && courseToDelete === course._id}
                                onOpenChange={(open) => {
                                  setDeleteDialogOpen(open);
                                  if (!open) setCourseToDelete(null);
                                }}
                              >
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCourseToDelete(course._id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete "{course.title}". This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(course._id)}
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
      </div>
    </div>
  );
}
