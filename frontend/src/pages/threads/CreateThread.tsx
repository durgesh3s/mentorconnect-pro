import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfileStore } from "@/lib/stores/profileStore";
import { useAuthStore } from "@/lib/stores/authStore";
import { apiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Navigation } from "@/components/ui/navigation";

export default function CreateThread() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addThread, threads } = useProfileStore();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 10) {
      toast.error("Maximum 10 images allowed");
      return;
    }

    const newImages = [...images, ...files];
    setImages(newImages);

    // Create previews
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) {
      toast.error("Please add content or images");
      return;
    }

    if (threads.length >= 10) {
      toast.error("Maximum 10 threads allowed. Delete some to create new ones.");
      return;
    }

    setUploading(true);
    try {
      // Upload images first
      const uploadedImageUrls: string[] = [];
      for (const image of images) {
        const formData = new FormData();
        formData.append("image", image);
        const response = await apiClient.post<{ url: string }>("/upload/thread-image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploadedImageUrls.push(response.url);
      }

      // Create thread
      const thread = await apiClient.post<any>("/threads/create", {
        content,
        images: uploadedImageUrls,
      });

      addThread(thread);
      toast.success("Thread created successfully!");
      navigate("/feed");
    } catch (error) {
      toast.error("Failed to create thread");
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    navigate("/auth/select-role");
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white page-transition">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-3xl pt-24">
        <h1 className="text-3xl font-bold mb-8">Create Thread</h1>

        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <Label htmlFor="content">What's on your mind?</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts..."
                rows={8}
                className="mt-2"
                maxLength={2000}
              />
              <p className="text-sm text-muted-foreground mt-2">
                {content.length}/2000 characters
              </p>
            </div>

            <div>
              <Label>Images (Max 10)</Label>
              <div className="mt-2">
                <Label className="cursor-pointer">
                  <Button type="button" variant="outline" asChild>
                    <span>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Add Images
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </Label>
              </div>

              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleSubmit}
                className="gradient-bg"
                disabled={uploading || (!content.trim() && images.length === 0)}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  "Post Thread"
                )}
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

