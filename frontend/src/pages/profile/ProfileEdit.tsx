import { useState, useEffect, useRef } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Loader2, Upload, Phone, MapPin, GraduationCap, Link as LinkIcon, User, Github, Linkedin, Twitter, Globe, Instagram } from "lucide-react";
import { toast } from "sonner";
import { Navigation } from "@/components/ui/navigation";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").optional(),
  phone: z.string().regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, "Please provide a valid phone number").optional(),
  education: z.enum(["high", "secondary", "graduation"]).optional(),
  location: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const socialPlatforms = [
  { key: "github", label: "GitHub", icon: Github },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "twitter", label: "Twitter", icon: Twitter },
  { key: "portfolio", label: "Portfolio", icon: Globe },
  { key: "instagram", label: "Instagram", icon: Instagram },
];

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || user?.googleGmailPhoto || null);
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [fieldsOfInterest, setFieldsOfInterest] = useState<string[]>(user?.fieldsOfInterest || []);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(user?.socialLinks || {});
  const [skillInput, setSkillInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      description: user?.description || "",
      phone: user?.phone || "",
      education: (user?.education as "high" | "secondary" | "graduation") || "graduation",
      location: user?.location || "",
    },
  });

  const education = watch("education");
  const location = watch("location");

  // Fetch full profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await apiClient.get<any>("/students/profile");
        setAvatar(profile.avatar || profile.googleGmailPhoto || null);
        setSkills(profile.skills || []);
        setFieldsOfInterest(profile.fieldsOfInterest || []);
        setSocialLinks(profile.socialLinks ? (typeof profile.socialLinks === 'object' && !Array.isArray(profile.socialLinks) ? profile.socialLinks : Object.fromEntries(profile.socialLinks)) : {});
        setLocationInput(profile.location || "");
        setValue("name", profile.name || "");
        setValue("description", profile.description || "");
        setValue("phone", profile.phone || "");
        setValue("education", profile.education || "graduation");
        setValue("location", profile.location || "");
      } catch (error) {
        console.error("Failed to fetch profile", error);
      }
    };
    if (user) {
      fetchProfile();
    }
  }, [user, setValue]);

  const uploadToCloudinary = async (file: File, type: "avatar"): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);

    const response = await apiClient.post<{ url: string }>("/upload/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.url;
  };

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
      const url = await uploadToCloudinary(file, "avatar");
      setAvatar(url);
      toast.success("Avatar uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const addFieldOfInterest = () => {
    const field = interestInput.trim();
    if (field && !fieldsOfInterest.includes(field) && !fieldsOfInterest.includes(`#${field}`)) {
      const formattedField = field.startsWith("#") ? field : `#${field}`;
      setFieldsOfInterest([...fieldsOfInterest, formattedField]);
      setInterestInput("");
    }
  };

  const removeFieldOfInterest = (field: string) => {
    setFieldsOfInterest(fieldsOfInterest.filter((f) => f !== field));
  };

  const updateSocialLink = (platform: string, url: string) => {
    if (url.trim()) {
      setSocialLinks({ ...socialLinks, [platform]: url.trim() });
    } else {
      const newLinks = { ...socialLinks };
      delete newLinks[platform];
      setSocialLinks(newLinks);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const updatedUser = await apiClient.patch<typeof user>("/students/profile", {
        ...data,
        avatar,
        skills,
        fieldsOfInterest,
        socialLinks,
      });
      setUser(updatedUser);
      toast.success("Profile updated successfully!");
      navigate(`/profile/${updatedUser.username}`);
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error?.response?.data?.message || "Failed to update profile");
    }
  };

  if (!user) {
    navigate("/auth/select-role");
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white page-transition">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-4xl pt-24">
        <h1 className="text-3xl font-bold mb-6 text-white">Edit Profile</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar */}
          <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            <Label className="text-sm font-medium text-white/80 mb-3 block">Avatar</Label>
            <div className="mt-4 flex items-center gap-6">
              <Avatar className="h-24 w-24 border-2 border-white/20">
                <AvatarImage src={avatar || user?.googleGmailPhoto || undefined} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {user.name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={uploading} 
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Change Avatar
                    </>
                  )}
                </Button>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </div>
            </div>
          </Card>

          {/* Name */}
          <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            <Label htmlFor="name" className="text-sm font-medium text-white/80 mb-2 block">
              <User className="h-4 w-4 inline mr-2" />
              Full Name
            </Label>
            <Input
              id="name"
              {...register("name")}
              className={`mt-2 bg-white/5 border-white/10 text-white ${errors.name ? "border-red-500" : ""}`}
              placeholder="Enter your full name"
            />
            {errors.name && <p className="text-sm text-red-400 mt-1">{errors.name.message}</p>}
          </Card>

          {/* Description */}
          <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            <Label htmlFor="description" className="text-sm font-medium text-white/80 mb-2 block">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              className={`mt-2 bg-white/5 border-white/10 text-white ${errors.description ? "border-red-500" : ""}`}
              rows={4}
              placeholder="Tell us more about yourself (minimum 10 characters)"
            />
            {errors.description && <p className="text-sm text-red-400 mt-1">{errors.description.message}</p>}
          </Card>

          {/* Contact Information */}
          <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            <Label className="text-sm font-medium text-white/80 mb-4 block">Contact Information</Label>
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone" className="text-xs text-white/60 mb-1.5 block">
                  <Phone className="h-3 w-3 inline mr-1" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  className={`mt-1 bg-white/5 border-white/10 text-white ${errors.phone ? "border-red-500" : ""}`}
                  placeholder="+1234567890"
                />
                {errors.phone && <p className="text-sm text-red-400 mt-1">{errors.phone.message}</p>}
              </div>
              <div>
                <Label htmlFor="location" className="text-xs text-white/60 mb-1.5 block">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  Location
                </Label>
                <Input
                  id="location"
                  {...register("location")}
                  value={locationInput}
                  onChange={(e) => {
                    setLocationInput(e.target.value);
                    setValue("location", e.target.value);
                  }}
                  className={`mt-1 bg-white/5 border-white/10 text-white ${errors.location ? "border-red-500" : ""}`}
                  placeholder="City, Country (e.g., Gorakhpur, India)"
                />
                <p className="text-xs text-white/40 mt-1">You can enhance this with a map library like Google Maps or Mapbox</p>
                {errors.location && <p className="text-sm text-red-400 mt-1">{errors.location.message}</p>}
              </div>
              <div>
                <Label htmlFor="education" className="text-xs text-white/60 mb-1.5 block">
                  <GraduationCap className="h-3 w-3 inline mr-1" />
                  Education Level
                </Label>
                <Select
                  value={education}
                  onValueChange={(value) => setValue("education", value as "high" | "secondary" | "graduation")}
                >
                  <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select education level" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/10">
                    <SelectItem value="high">High School</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="graduation">Graduation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Fields of Interest */}
          <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            <Label className="text-sm font-medium text-white/80 mb-3 block">Fields of Interest</Label>
            <div className="mt-2 flex gap-2">
              <Input
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFieldOfInterest();
                  }
                }}
                placeholder="Add field (e.g., #database, #datascience)"
                className="bg-white/5 border-white/10 text-white"
              />
              <Button type="button" onClick={addFieldOfInterest} className="bg-white/10 hover:bg-white/20">
                <X className="h-4 w-4 rotate-45" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {fieldsOfInterest.map((field) => (
                <Badge key={field} variant="secondary" className="flex items-center gap-1 bg-blue-500/20 text-blue-300 border-blue-400/40">
                  {field}
                  <button
                    type="button"
                    onClick={() => removeFieldOfInterest(field)}
                    className="ml-1 hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </Card>

          {/* Skills */}
          <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            <Label className="text-sm font-medium text-white/80 mb-3 block">Skills</Label>
            <div className="mt-2 flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Add a skill"
                className="bg-white/5 border-white/10 text-white"
              />
              <Button type="button" onClick={addSkill} className="bg-white/10 hover:bg-white/20">
                <X className="h-4 w-4 rotate-45" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="flex items-center gap-1 bg-green-500/20 text-green-300 border-green-400/40">
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="ml-1 hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </Card>

          {/* Social Links */}
          <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            <Label className="text-sm font-medium text-white/80 mb-3 block">
              <LinkIcon className="h-4 w-4 inline mr-2" />
              Social Links
            </Label>
            <div className="space-y-3">
              {socialPlatforms.map((platform) => {
                const Icon = platform.icon;
                return (
                  <div key={platform.key} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-white/60" />
                    </div>
                    <Input
                      type="url"
                      defaultValue={socialLinks[platform.key] || ""}
                      onBlur={(e) => updateSocialLink(platform.key, e.target.value)}
                      placeholder={`${platform.label} URL`}
                      className="bg-white/5 border-white/10 text-white flex-1"
                    />
                    {socialLinks[platform.key] && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => updateSocialLink(platform.key, "")}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Submit */}
          <div className="flex gap-4 pb-8">
            <Button type="submit" className="bg-white text-black hover:bg-white/90 border-2 border-white" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
