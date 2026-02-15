import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/lib/stores/authStore";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GraduationCap, Users, Loader2, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

const  profileSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  name: z.string().min(2).max(100),
  bio: z.string().max(500).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || "",
      name: user?.name || "",
      bio: user?.bio || "",
    },
  });

  const username = watch("username");

  // Check username availability
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const checkUsername = async () => {
      setCheckingUsername(true);
      try {
        const available = await apiClient.get<{ available: boolean }>(
          `/auth/check-username/${username}`
        );
        setUsernameAvailable(available.available);
      } catch {
        setUsernameAvailable(false);
      } finally {
        setCheckingUsername(false);
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await apiClient.post<{ url: string }>("/upload/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setAvatar(response.url);
      toast.success("Avatar uploaded successfully");
    } catch {
      toast.error("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (usernameAvailable === false) {
      toast.error("Username is not available");
      return;
    }

    try {
      const updatedUser = await apiClient.post<typeof user>("/auth/complete-profile", {
        ...data,
        avatar,
      });

      setUser(updatedUser);
      toast.success("Profile completed successfully!");
      navigate("/dashboard/" + updatedUser.role);
    } catch {
      toast.error("Failed to complete profile");
    }
  };

  if (!user) {
    navigate("/auth/select-role");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden page-transition bg-black pt-20">
      {/* Background Video */}
      <div className="fixed inset-0 -z-10 opacity-10">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="https://videos.pexels.com/video-files/3045163/3045163-hd_1920_1080_30fps.mp4" type="video/mp4" />
          <div className="absolute inset-0 bg-black" />
        </video>
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <Card className="w-full max-w-2xl p-8 animate-fade-in-up bg-white/5 backdrop-blur-md border-white/10 relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 border border-white/20">
              {user.role === "student" ? (
                <GraduationCap className="h-7 w-7 text-white" />
              ) : (
                <Users className="h-7 w-7 text-white" />
              )}
            </div>
            <span className="text-2xl font-bold text-white">Complete Your Profile</span>
          </div>
          <p className="text-white/80">Fill in your details to get started</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatar || undefined} />
              <AvatarFallback className="text-2xl bg-muted">
                {user.name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="avatar" className="cursor-pointer">
                <Button type="button" variant="outline" size="sm" disabled={uploading} className="border-white/20 text-white hover:bg-white/10">
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload Avatar"
                  )}
                </Button>
              </Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-white">Username</Label>
            <div className="relative">
              <Input
                id="username"
                {...register("username")}
                placeholder="johndoe"
                className={`bg-white/5 border-white/20 text-white placeholder:text-white/40 ${errors.username ? "border-destructive" : ""}`}
              />
              {username && username.length >= 3 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingUsername ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white/60" />
                  ) : usernameAvailable === true ? (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  ) : usernameAvailable === false ? (
                    <X className="h-4 w-4 text-destructive" />
                  ) : null}
                </div>
              )}
            </div>
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            )}
            {usernameAvailable === false && (
              <p className="text-sm text-destructive">Username is not available</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">Full Name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="John Doe"
              className={`bg-white/5 border-white/20 text-white placeholder:text-white/40 ${errors.name ? "border-destructive" : ""}`}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-white">Bio (Optional)</Label>
            <Textarea
              id="bio"
              {...register("bio")}
              placeholder="Tell us about yourself..."
              rows={4}
              className={`bg-white/5 border-white/20 text-white placeholder:text-white/40 ${errors.bio ? "border-destructive" : ""}`}
            />
            {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full bg-white text-black hover:bg-white/90 border-2 border-white"
            disabled={isSubmitting || usernameAvailable === false}
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Completing...
              </>
            ) : (
              "Complete Profile"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}

