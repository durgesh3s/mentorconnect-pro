import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ExternalLink,
  Code,
  User,
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Submission {
  _id?: string;
  studentId: {
    _id: string;
    name?: string;
    username: string;
    email: string;
  };
  startedAt: string;
  submittedAt: string;
  completedAt?: string;
  status: 'in_progress' | 'submitted' | 'expired';
  projectTitle?: string;
  projectDescription?: string;
  deployedLink?: string;
  githubLink?: string;
  customFields?: Record<string, any>;
}

interface Assessment {
  _id: string;
  title: string;
  courseId: {
    _id: string;
    title: string;
  };
  submissions: Submission[];
}

export default function AssessmentSubmissions() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      toast.error("Admin access required");
      navigate("/admin");
      return;
    }

    if (!id) {
      navigate("/admin/assessments");
      return;
    }

    fetchSubmissions();
  }, [id, user, navigate]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get(`/assessments/admin/${id}/submissions`);
      
      // Also fetch assessment details
      const assessmentData = await apiClient.get(`/assessments/admin/${id}`);
      setAssessment({
        ...assessmentData,
        submissions: data.submissions || [],
      });
    } catch (error: any) {
      console.error("Failed to fetch submissions", error);
      toast.error(error.response?.data?.message || "Failed to load submissions");
      navigate("/admin/assessments");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (startedAt: string, submittedAt?: string) => {
    const start = new Date(startedAt);
    const end = submittedAt ? new Date(submittedAt) : new Date();
    const diff = Math.floor((end.getTime() - start.getTime()) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Submitted
          </Badge>
        );
      case "expired":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!user || user.role !== "admin") {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground page-transition">
        <Navigation />
        <div className="container mx-auto px-4 py-8 pt-24 text-center">
          <p className="text-muted-foreground">Loading submissions...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-background text-foreground page-transition">
        <Navigation />
        <div className="container mx-auto px-4 py-8 pt-24 text-center">
          <p className="text-muted-foreground">Assessment not found</p>
          <Button onClick={() => navigate("/admin/assessments")} className="mt-4">
            Back to Assessments
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground page-transition">
      <Navigation />
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/assessments")}
              className="hover:bg-foreground/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground">Assessment Submissions</h1>
              <p className="text-muted-foreground mt-1">
                {assessment.title} - {assessment.courseId?.title || "Unknown Course"}
              </p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {assessment.submissions.length} {assessment.submissions.length === 1 ? "Submission" : "Submissions"}
            </Badge>
          </div>
        </div>

        {/* Submissions List */}
        {assessment.submissions.length === 0 ? (
          <Card className="p-12 text-center bg-card/50 border-border">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2 text-foreground">No submissions yet</h3>
            <p className="text-muted-foreground">
              No students have submitted this assessment yet.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {assessment.submissions.map((submission, index) => (
              <Card key={submission._id || index} className="bg-card/50 border-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <User className="h-5 w-5 text-primary" />
                        <CardTitle className="text-foreground">
                          {submission.studentId?.name || submission.studentId?.username || "Unknown Student"}
                        </CardTitle>
                        {getStatusBadge(submission.status)}
                      </div>
                      <CardDescription className="text-foreground/70">
                        {submission.studentId?.email}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Submission Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <Label className="text-foreground/60">Started At</Label>
                        <p className="text-foregroundfont-medium flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(submission.startedAt)}
                        </p>
                      </div>
                      {submission.submittedAt && (
                        <div>
                          <Label className="text-foreground/60">Submitted At</Label>
                          <p className="text-foregroundfont-medium flex items-center gap-2 mt-1">
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                            {formatDate(submission.submittedAt)}
                          </p>
                        </div>
                      )}
                      {submission.submittedAt && (
                        <div>
                          <Label className="text-foreground/60">Duration</Label>
                          <p className="text-foregroundfont-medium flex items-center gap-2 mt-1">
                            <Clock className="h-4 w-4" />
                            {formatDuration(submission.startedAt, submission.submittedAt)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Project Details */}
                    {(submission.projectTitle || submission.projectDescription) && (
                      <div className="border-t border-border pt-4">
                        <h3 className="font-semibold text-foregroundmb-3">Project Details</h3>
                        {submission.projectTitle && (
                          <div className="mb-3">
                            <Label className="text-foreground/60">Project Title</Label>
                            <p className="text-foregroundfont-medium mt-1">{submission.projectTitle}</p>
                          </div>
                        )}
                        {submission.projectDescription && (
                          <div>
                            <Label className="text-foreground/60">Description / Design</Label>
                            <p className="text-foreground/80 mt-1 whitespace-pre-wrap bg-card/50 p-4 rounded-lg border border-border">
                              {submission.projectDescription}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Links */}
                    {(submission.deployedLink || submission.githubLink) && (
                      <div className="border-t border-border pt-4">
                        <h3 className="font-semibold text-foregroundmb-3">Links</h3>
                        <div className="flex flex-wrap gap-4">
                          {submission.deployedLink && (
                            <a
                              href={submission.deployedLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-primary hover:text-primary/80 underline"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Deployed Link
                            </a>
                          )}
                          {submission.githubLink && (
                            <a
                              href={submission.githubLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-primary hover:text-primary/80 underline"
                            >
                              <Code className="h-4 w-4" />
                              GitHub Repository
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Custom Fields */}
                    {submission.customFields && Object.keys(submission.customFields).length > 0 && (
                      <div className="border-t border-border pt-4">
                        <h3 className="font-semibold text-foregroundmb-3">Additional Information</h3>
                        <div className="space-y-3">
                          {Object.entries(submission.customFields).map(([key, value]) => (
                            <div key={key}>
                              <Label className="text-foreground/60">{key}</Label>
                              <p className="text-foregroundfont-medium mt-1">
                                {typeof value === "string" ? value : JSON.stringify(value)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
