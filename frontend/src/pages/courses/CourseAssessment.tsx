import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Clock, AlertCircle, Code, ExternalLink, FileText, Play } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Navigation } from "@/components/ui/navigation";
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
  id?: string;
  assessmentId?: string;
  title: string;
  description?: string;
  instructions?: string;
  timeLimit: number;
  customFields: CustomField[];
  startedAt?: Date;
  expiresAt?: Date;
  timeRemaining?: number;
  canStart?: boolean;
  inProgress?: boolean;
}

export default function CourseAssessment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Project submission form data
  const [projectData, setProjectData] = useState({
    title: "",
    description: "",
    deployedLink: "",
    githubLink: "",
    customFields: {} as Record<string, any>,
  });

  useEffect(() => {
    if (!id) return;

    const fetchAssessment = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get<Assessment>(`/assessments/course/${id}`);
        
        if (data.inProgress && data.timeRemaining !== undefined) {
          // Assessment already started
          setAssessment(data);
          setStarted(true);
          setTimeRemaining(data.timeRemaining || 0);
        } else if (data.canStart) {
          // Assessment can be started
          setAssessment(data);
          setStarted(false);
        } else {
          // Already submitted or error
          if ((data as any).submitted) {
            toast.error("You have already submitted this assessment");
            navigate(`/courses/${id}/learn`);
          }
        }
      } catch (error: any) {
        console.error("Failed to fetch assessment", error);
        if (error.response?.status === 403) {
          toast.error(error.response.data.message || "You cannot access this assessment");
          navigate(`/courses/${id}/learn`);
        } else if (error.response?.status === 404 || error.response?.status === 400) {
          // Assessment not found or not ready
          setAssessment(null);
        } else {
          toast.error("Failed to load assessment");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [id, navigate]);

  // Timer countdown
  useEffect(() => {
    if (started && timeRemaining > 0 && !submitted) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleTimeExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [started, timeRemaining, submitted]);

  const handleStartAssessment = async () => {
    if (!id) return;

    try {
      setStarting(true);
      const data = await apiClient.post<Assessment>(`/assessments/course/${id}/start`);
      setAssessment(data);
      setStarted(true);
      
      if (data.expiresAt) {
        const now = new Date();
        const expiresAt = new Date(data.expiresAt);
        const remaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
        setTimeRemaining(remaining);
      } else {
        setTimeRemaining(data.timeLimit);
      }

      toast.success("Assessment started! Timer is running.");
    } catch (error: any) {
      console.error("Failed to start assessment", error);
      toast.error(error.response?.data?.message || "Failed to start assessment");
    } finally {
      setStarting(false);
    }
  };

  const handleTimeExpired = () => {
    toast.error("Time has expired! Please submit your assessment immediately.");
  };

  const handleSubmit = async () => {
    if (!id) return;

    // Validate required fields
    if (!projectData.title.trim()) {
      toast.error("Please enter a project title");
      return;
    }

    // Validate custom required fields
    if (assessment?.customFields) {
      for (const field of assessment.customFields) {
        if (field.required && !projectData.customFields[field.label]?.toString().trim()) {
          toast.error(`Please fill in the required field: ${field.label}`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      await apiClient.post(`/assessments/course/${id}/submit`, projectData);
      setSubmitted(true);
      toast.success("Assessment submitted successfully!");
      
      setTimeout(() => {
        navigate(`/courses/${id}/learn`);
      }, 2000);
    } catch (error: any) {
      console.error("Failed to submit assessment", error);
      if (error.response?.data?.expired) {
        toast.error("Assessment time has expired");
        navigate(`/courses/${id}/learn`);
      } else {
        toast.error(error.response?.data?.message || "Failed to submit assessment");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center pt-24">
          <p className="text-white/80">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-4xl pt-24">
          <Card className="p-8 bg-white/5 backdrop-blur-md border-white/10 text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-3xl font-bold mb-4 text-white">Assessment Not Ready</h2>
            <p className="text-xl mb-2 text-white/80">
              No active assessment found for this course
            </p>
            <p className="text-white/60 mb-6">
              The assessment questions are still being set up. Please check back later.
            </p>
            <Button
              onClick={() => navigate(`/courses/${id}/learn`)}
              className="bg-white text-black hover:bg-white/90"
            >
              Back to Course
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-4xl pt-24">
          <Card className="p-8 bg-white/5 backdrop-blur-md border-white/10 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-3xl font-bold mb-4 text-white">Assessment Submitted!</h2>
            <p className="text-white/80 mb-6">
              Your project submission has been received successfully.
            </p>
            <Button
              onClick={() => navigate(`/courses/${id}/learn`)}
              className="bg-white text-black hover:bg-white/90"
            >
              Back to Course
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Show start screen if not started
  if (!started) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-4xl pt-24">
          <Card className="p-8 bg-white/5 backdrop-blur-md border-white/10">
            <div className="text-center mb-6">
              <FileText className="h-16 w-16 mx-auto mb-4 text-primary" />
              <h1 className="text-3xl font-bold mb-2 text-white">{assessment.title}</h1>
              {assessment.description && (
                <p className="text-white/70 text-lg mb-4">{assessment.description}</p>
              )}
            </div>

            {assessment.instructions && (
              <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                <h3 className="font-semibold mb-2 text-white">Instructions</h3>
                <p className="text-white/80 whitespace-pre-wrap">{assessment.instructions}</p>
              </div>
            )}

            <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="font-semibold text-white">Time Limit</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                {formatTime(assessment.timeLimit)}
              </p>
              <p className="text-sm text-white/60 mt-2">
                The timer will start when you click "Start Assessment"
              </p>
            </div>

            <Alert className="mb-6 bg-yellow-500/10 border-yellow-500/30">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-400">
                Once you start, the timer will begin counting down. Make sure you have your project ready to submit.
              </AlertDescription>
            </Alert>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => navigate(`/courses/${id}/learn`)}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Back to Course
              </Button>
              <Button
                onClick={handleStartAssessment}
                disabled={starting}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Play className="h-4 w-4 mr-2" />
                {starting ? "Starting..." : "Start Assessment"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Show submission form
  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl pt-24">
        {/* Header with Timer */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">{assessment.title}</h1>
            <div className="flex items-center gap-2 bg-red-500/20 px-4 py-2 rounded-lg border border-red-500/30">
              <Clock className="h-4 w-4 text-red-400" />
              <span className="font-mono text-white font-semibold">
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
          {timeRemaining <= 300 && timeRemaining > 0 && (
            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">
                Warning: Less than 5 minutes remaining!
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Submission Form */}
        <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10 mb-6">
          <h2 className="text-xl font-semibold mb-6 text-white">Project Submission</h2>

          <div className="space-y-6">
            {/* Project Title */}
            <div>
              <Label htmlFor="projectTitle" className="text-white">
                Project Title *
              </Label>
              <Input
                id="projectTitle"
                value={projectData.title}
                onChange={(e) =>
                  setProjectData({ ...projectData, title: e.target.value })
                }
                placeholder="e.g., E-commerce Website"
                className="bg-white/5 border-white/20 text-white mt-2"
                required
              />
            </div>

            {/* Project Description */}
            <div>
              <Label htmlFor="projectDescription" className="text-white">
                Project Description / Design *
              </Label>
              <Textarea
                id="projectDescription"
                value={projectData.description}
                onChange={(e) =>
                  setProjectData({ ...projectData, description: e.target.value })
                }
                placeholder="Describe your project, technologies used, features implemented, design decisions..."
                rows={8}
                className="bg-white/5 border-white/20 text-white mt-2"
                required
              />
            </div>

            {/* Deployed Link */}
            <div>
              <Label htmlFor="deployedLink" className="text-white flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Deployed Link (Vercel, Render, Netlify, etc.)
              </Label>
              <Input
                id="deployedLink"
                type="url"
                value={projectData.deployedLink}
                onChange={(e) =>
                  setProjectData({ ...projectData, deployedLink: e.target.value })
                }
                placeholder="https://your-project.vercel.app"
                className="bg-white/5 border-white/20 text-white mt-2"
              />
              <p className="text-xs text-white/60 mt-1">
                Enter the URL where your project is deployed
              </p>
            </div>

            {/* GitHub Link */}
            <div>
              <Label htmlFor="githubLink" className="text-white flex items-center gap-2">
                <Code className="h-4 w-4" />
                GitHub Repository Link
              </Label>
              <Input
                id="githubLink"
                type="url"
                value={projectData.githubLink}
                onChange={(e) =>
                  setProjectData({ ...projectData, githubLink: e.target.value })
                }
                placeholder="https://github.com/username/repository"
                className="bg-white/5 border-white/20 text-white mt-2"
              />
              <p className="text-xs text-white/60 mt-1">
                Enter the URL to your GitHub repository
              </p>
            </div>

            {/* Custom Fields */}
            {assessment.customFields && assessment.customFields.length > 0 && (
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-lg font-semibold mb-4 text-white">Additional Information</h3>
                <div className="space-y-4">
                  {assessment.customFields
                    .sort((a, b) => a.order - b.order)
                    .map((field) => (
                      <div key={field.label}>
                        <Label htmlFor={`custom-${field.label}`} className="text-white">
                          {field.label}
                          {field.required && <span className="text-red-400 ml-1">*</span>}
                        </Label>
                        {field.type === 'textarea' ? (
                          <Textarea
                            id={`custom-${field.label}`}
                            value={projectData.customFields[field.label] || ""}
                            onChange={(e) =>
                              setProjectData({
                                ...projectData,
                                customFields: {
                                  ...projectData.customFields,
                                  [field.label]: e.target.value,
                                },
                              })
                            }
                            placeholder={field.placeholder || ""}
                            className="bg-white/5 border-white/20 text-white mt-2"
                            required={field.required}
                            rows={4}
                          />
                        ) : (
                          <Input
                            id={`custom-${field.label}`}
                            type={field.type === 'url' ? 'url' : field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}
                            value={projectData.customFields[field.label] || ""}
                            onChange={(e) =>
                              setProjectData({
                                ...projectData,
                                customFields: {
                                  ...projectData.customFields,
                                  [field.label]: e.target.value,
                                },
                              })
                            }
                            placeholder={field.placeholder || ""}
                            className="bg-white/5 border-white/20 text-white mt-2"
                            required={field.required}
                            min={field.validation?.min}
                            max={field.validation?.max}
                          />
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/courses/${id}/learn`)}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || timeRemaining <= 0}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {submitting ? "Submitting..." : "Submit Assessment"}
          </Button>
        </div>

        {timeRemaining <= 0 && (
          <Alert className="mt-4 bg-red-500/10 border-red-500/30">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">
              Time has expired! Please submit immediately.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
