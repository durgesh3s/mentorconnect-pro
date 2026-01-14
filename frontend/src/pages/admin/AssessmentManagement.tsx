import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

interface CustomField {
  label: string;
  type: 'text' | 'textarea' | 'url' | 'number' | 'email';
  required: boolean;
  placeholder?: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
  };
  order: number;
}

interface Assessment {
  _id: string;
  courseId: {
    _id: string;
    title: string;
  };
  title: string;
  description?: string;
  instructions?: string;
  timeLimit: number;
  customFields: CustomField[];
  isActive: boolean;
  submissions: Array<{
    studentId: any;
    submittedAt: Date;
    status: string;
    projectTitle?: string;
    deployedLink?: string;
    githubLink?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Course {
  _id: string;
  title: string;
}

export default function AssessmentManagement() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    courseId: "",
    title: "",
    description: "",
    instructions: "",
    timeLimit: 3600, // 1 hour in seconds
    isActive: true,
    customFields: [] as CustomField[],
  });

  // Time limit state (converted to hours and minutes for display)
  const [timeLimitHours, setTimeLimitHours] = useState(1);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(0);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      toast.error("Admin access required");
      navigate("/");
      return;
    }
    fetchAssessments();
    fetchCourses();
  }, [user, navigate]);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get("/assessments/admin");
      setAssessments(data.assessments || []);
    } catch (error) {
      console.error("Failed to fetch assessments", error);
      toast.error("Failed to load assessments");
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const data = await apiClient.get("/courses/admin?limit=1000");
      setCourses(data.courses || []);
    } catch (error) {
      console.error("Failed to fetch courses", error);
    }
  };

  const handleOpenCreateDialog = () => {
    setEditingAssessment(null);
    setFormData({
      courseId: "",
      title: "",
      description: "",
      instructions: "",
      timeLimit: 3600,
      isActive: true,
      customFields: [],
    });
    setTimeLimitHours(1);
    setTimeLimitMinutes(0);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (assessment: Assessment) => {
    setEditingAssessment(assessment);
    const hours = Math.floor(assessment.timeLimit / 3600);
    const minutes = Math.floor((assessment.timeLimit % 3600) / 60);
    setTimeLimitHours(hours);
    setTimeLimitMinutes(minutes);
    setFormData({
      courseId: assessment.courseId._id || assessment.courseId.toString(),
      title: assessment.title,
      description: assessment.description || "",
      instructions: assessment.instructions || "",
      timeLimit: assessment.timeLimit,
      isActive: assessment.isActive,
      customFields: assessment.customFields || [],
    });
    setDialogOpen(true);
  };

  const handleAddCustomField = () => {
    setFormData({
      ...formData,
      customFields: [
        ...formData.customFields,
        {
          label: "",
          type: "text",
          required: false,
          placeholder: "",
          order: formData.customFields.length,
        },
      ],
    });
  };

  const handleUpdateCustomField = (index: number, field: Partial<CustomField>) => {
    const updatedFields = [...formData.customFields];
    updatedFields[index] = { ...updatedFields[index], ...field };
    setFormData({ ...formData, customFields: updatedFields });
  };

  const handleRemoveCustomField = (index: number) => {
    const updatedFields = formData.customFields.filter((_, i) => i !== index);
    updatedFields.forEach((f, i) => {
      f.order = i;
    });
    setFormData({ ...formData, customFields: updatedFields });
  };

  const handleSubmit = async () => {
    if (!formData.courseId || !formData.title) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Convert hours and minutes to seconds
    const timeLimitInSeconds = timeLimitHours * 3600 + timeLimitMinutes * 60;

    if (timeLimitInSeconds < 300) {
      toast.error("Time limit must be at least 5 minutes");
      return;
    }

    // Validate custom fields
    for (let i = 0; i < formData.customFields.length; i++) {
      const field = formData.customFields[i];
      if (!field.label || !field.type) {
        toast.error(`Custom field ${i + 1} is invalid. Please fill in label and type.`);
        return;
      }
    }

    try {
      const submitData = {
        ...formData,
        timeLimit: timeLimitInSeconds,
      };

      if (editingAssessment) {
        await apiClient.patch(`/assessments/admin/${editingAssessment._id}`, submitData);
        toast.success("Assessment updated successfully");
      } else {
        await apiClient.post("/assessments/admin", submitData);
        toast.success("Assessment created successfully");
      }
      setDialogOpen(false);
      fetchAssessments();
    } catch (error: any) {
      console.error("Failed to save assessment", error);
      toast.error(error.response?.data?.message || "Failed to save assessment");
    }
  };

  const handleDelete = async () => {
    if (!assessmentToDelete) return;

    try {
      await apiClient.delete(`/assessments/admin/${assessmentToDelete}`);
      toast.success("Assessment deleted successfully");
      setDeleteDialogOpen(false);
      setAssessmentToDelete(null);
      fetchAssessments();
    } catch (error) {
      console.error("Failed to delete assessment", error);
      toast.error("Failed to delete assessment");
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground page-transition">
      <Navigation />
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
              className="hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Assessment Management</h1>
              <p className="text-muted-foreground mt-1">Create and manage course assessments</p>
            </div>
          </div>
          <Button onClick={handleOpenCreateDialog} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Create Assessment
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading assessments...</p>
          </div>
        ) : assessments.length === 0 ? (
          <Card className="p-12 text-center bg-white/5 border-white/10">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2 text-white">No assessments yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first assessment to get started
            </p>
            <Button onClick={handleOpenCreateDialog}>Create Assessment</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {assessments.map((assessment) => (
              <Card key={assessment._id} className="bg-white/5 border-white/10">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-white">{assessment.title}</CardTitle>
                        {assessment.isActive ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <CardDescription className="text-white/70">
                        Course: {assessment.courseId?.title || "Unknown"}
                      </CardDescription>
                      {assessment.description && (
                        <p className="text-sm text-white/60 mt-2">{assessment.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditDialog(assessment)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setAssessmentToDelete(assessment._id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this assessment? This action cannot
                              be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-red-500">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Time Limit</p>
                      <p className="text-white font-semibold">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatTime(assessment.timeLimit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Custom Fields</p>
                      <p className="text-white font-semibold">
                        {assessment.customFields?.length || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Submissions</p>
                      <p className="text-white font-semibold">
                        {assessment.submissions?.length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
                <div className="border-t border-white/10 p-4">
                  <Link to={`/admin/assessments/${assessment._id}/submissions`}>
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      View Submissions ({assessment.submissions?.length || 0})
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAssessment ? "Edit Assessment" : "Create Assessment"}
              </DialogTitle>
              <DialogDescription>
                {editingAssessment
                  ? "Update the assessment details"
                  : "Create a new project-based assessment for a course"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="courseId">Course *</Label>
                <Select
                  value={formData.courseId}
                  onValueChange={(value) => setFormData({ ...formData, courseId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course._id} value={course._id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Assessment title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Assessment description"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Instructions for students (what to submit, requirements, etc.)"
                  rows={5}
                />
              </div>

              <div>
                <Label>Time Limit *</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timeLimitHours">Hours</Label>
                    <Input
                      id="timeLimitHours"
                      type="number"
                      min={0}
                      max={168}
                      value={timeLimitHours}
                      onChange={(e) => setTimeLimitHours(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timeLimitMinutes">Minutes</Label>
                    <Input
                      id="timeLimitMinutes"
                      type="number"
                      min={0}
                      max={59}
                      value={timeLimitMinutes}
                      onChange={(e) => setTimeLimitMinutes(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total: {formatTime(timeLimitHours * 3600 + timeLimitMinutes * 60)} (minimum 5 minutes)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <Label>Custom Fields (Optional)</Label>
                  <Button onClick={handleAddCustomField} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom Field
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.customFields.map((field, index) => (
                    <Card key={index} className="p-4 bg-white/5 border-white/10">
                      <div className="flex items-start justify-between mb-4">
                        <h4 className="font-semibold text-white">Custom Field {index + 1}</h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCustomField(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label>Field Label *</Label>
                          <Input
                            value={field.label}
                            onChange={(e) =>
                              handleUpdateCustomField(index, { label: e.target.value })
                            }
                            placeholder="e.g., Portfolio Link"
                          />
                        </div>

                        <div>
                          <Label>Field Type *</Label>
                          <Select
                            value={field.type}
                            onValueChange={(value: any) =>
                              handleUpdateCustomField(index, { type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="textarea">Textarea</SelectItem>
                              <SelectItem value="url">URL</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="mb-4">
                        <Label>Placeholder</Label>
                        <Input
                          value={field.placeholder || ""}
                          onChange={(e) =>
                            handleUpdateCustomField(index, { placeholder: e.target.value })
                          }
                          placeholder="Placeholder text"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            handleUpdateCustomField(index, { required: e.target.checked })
                          }
                          className="rounded"
                        />
                        <Label>Required</Label>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingAssessment ? "Update" : "Create"} Assessment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
