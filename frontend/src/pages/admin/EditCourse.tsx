import { useState, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ArrowLeft,
  Loader2,
  BookOpen,
  X,
} from "lucide-react";
import { toast } from "sonner";

export default function EditCourse() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    youtubeUrl: "",
    category: "General",
    level: "beginner" as "beginner" | "intermediate" | "advanced",
    thumbnail: "",
    isFree: true,
    price: "",
    currency: "INR",
    instructor: "CodeMentor Pro",
    language: "en",
    isPublished: false,
    isFeatured: false,
  });

  useEffect(() => {
    if (!id) {
      navigate("/admin/courses");
      return;
    }

    const fetchCourse = async () => {
      try {
        setFetching(true);
        const course = await apiClient.get<any>(`/courses/admin/${id}`);
        
        setFormData({
          title: course.title || "",
          description: course.description || "",
          youtubeUrl: course.youtubeUrl || "",
          category: course.category || "General",
          level: course.level || "beginner",
          thumbnail: course.thumbnail || "",
          isFree: course.isFree ?? true,
          price: course.price?.toString() || "",
          currency: course.currency || "INR",
          instructor: course.instructor || "CodeMentor Pro",
          language: course.language || "en",
          isPublished: course.isPublished ?? false,
          isFeatured: course.isFeatured ?? false,
        });
        
        setTags(course.tags || []);
      } catch (error: any) {
        console.error("Failed to fetch course", error);
        toast.error(error?.response?.data?.message || "Failed to load course");
        navigate("/admin/courses");
      } finally {
        setFetching(false);
      }
    };

    fetchCourse();
  }, [id, navigate]);

  if (!user || user.role !== "admin") {
    return null;
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-background text-foreground page-transition">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-4xl pt-24">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.youtubeUrl) {
      toast.error("Title, description, and YouTube URL are required");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: formData.title,
        description: formData.description,
        youtubeUrl: formData.youtubeUrl,
        category: formData.category,
        level: formData.level,
        tags: tags,
        thumbnail: formData.thumbnail || undefined,
        isFree: formData.isFree,
        price: formData.isFree ? undefined : parseFloat(formData.price),
        currency: formData.currency,
        instructor: formData.instructor,
        language: formData.language,
        isPublished: formData.isPublished,
        isFeatured: formData.isFeatured,
      };

      await apiClient.patch(`/courses/admin/${id}`, payload);
      toast.success("Course updated successfully!");
      navigate("/admin/courses");
    } catch (error: any) {
      console.error("Failed to update course", error);
      toast.error(error?.response?.data?.message || "Failed to update course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground page-transition">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/admin/courses">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Courses
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Edit Course
            </h1>
            <p className="text-muted-foreground">
              Update course information and settings
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
              <CardDescription>
                Update the details for this course
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Complete React Course"
                  maxLength={200}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {formData.title.length} / 200 characters (3-200 characters recommended)
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="A comprehensive course covering all aspects of React..."
                  rows={5}
                  maxLength={5000}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {formData.description.length} / 5000 characters (10-5000 characters recommended)
                </p>
              </div>

              {/* YouTube URL */}
              <div className="space-y-2">
                <Label htmlFor="youtubeUrl">YouTube URL *</Label>
                <Input
                  id="youtubeUrl"
                  name="youtubeUrl"
                  type="url"
                  value={formData.youtubeUrl}
                  onChange={handleInputChange}
                  placeholder="https://www.youtube.com/watch?v=... or https://www.youtube.com/playlist?list=..."
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Supports both single video and playlist URLs. Updating this will re-parse the content.
                </p>
              </div>

              {/* Category and Level */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="Web Development"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value) =>
                      handleSelectChange("level", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Add a tag and press Enter"
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Thumbnail */}
              <div className="space-y-2">
                <Label htmlFor="thumbnail">Thumbnail URL (Optional)</Label>
                <Input
                  id="thumbnail"
                  name="thumbnail"
                  type="url"
                  value={formData.thumbnail}
                  onChange={handleInputChange}
                  placeholder="https://example.com/thumbnail.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  If not provided, thumbnail will be auto-generated from YouTube
                </p>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isFree"
                    checked={formData.isFree}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange("isFree", checked as boolean)
                    }
                  />
                  <Label htmlFor="isFree" className="cursor-pointer">
                    Free Course
                  </Label>
                </div>

                {!formData.isFree && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={handleInputChange}
                        placeholder="99.99"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) =>
                          handleSelectChange("currency", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">INR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructor and Language */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instructor">Instructor</Label>
                  <Input
                    id="instructor"
                    name="instructor"
                    value={formData.instructor}
                    onChange={handleInputChange}
                    placeholder="CodeMentor Pro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value) =>
                      handleSelectChange("language", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPublished"
                    checked={formData.isPublished}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange("isPublished", checked as boolean)
                    }
                  />
                  <Label htmlFor="isPublished" className="cursor-pointer">
                    Publish immediately
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isFeatured"
                    checked={formData.isFeatured}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange("isFeatured", checked as boolean)
                    }
                  />
                  <Label htmlFor="isFeatured" className="cursor-pointer">
                    Feature this course
                  </Label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4" />
                      Update Course
                    </>
                  )}
                </Button>
                <Link to="/admin/courses">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
