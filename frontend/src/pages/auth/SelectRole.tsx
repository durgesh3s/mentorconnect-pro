import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowRight, Check, Loader2, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/lib/stores/authStore";
import { apiClient } from "@/lib/api/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function SelectRole() {
  const [selectedRole, setSelectedRole] = useState<"student" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setPendingRole } = useAuthStore();

  // Check for error in URL params
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      switch (errorParam) {
        case "authentication_failed":
          setError("Authentication failed. Please try again.");
          break;
        case "access_denied":
          setError("Access denied. Please authorize the application.");
          break;
        default:
          setError("An error occurred during authentication. Please try again.");
      }
      // Clean up URL
      navigate("/auth/select-role", { replace: true });
    }
  }, [searchParams, navigate]);

  const handleContinue = async () => {
    if (!selectedRole) return;

    setLoading(true);
    setError(null);

    try {
      // Store the selected role in the auth store
      setPendingRole(selectedRole);

      // Get current origin and construct callback URL
      const currentOrigin = window.location.origin;
      const redirectUri = `${currentOrigin}/auth/callback`;

      // Get Google OAuth URL from backend with current redirect URI
      const response = await apiClient.get<{ url: string }>(`/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`);
      
      // Redirect to Google OAuth
      window.location.href = response.url;
    } catch (err: any) {
      setLoading(false);
      const errorMessage = err.response?.data?.message || "Failed to start authentication. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden page-transition bg-background pt-20">
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
          <div className="absolute inset-0 bg-background" />
        </video>
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <div className="w-full max-w-4xl animate-fade-in-up relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/10 border border-border">
              <GraduationCap className="h-7 w-7 text-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">Mentorise</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">Choose Your Path</h1>
          <p className="text-xl text-foreground/80">Select your role to get started</p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-1 gap-6 mb-8 max-w-2xl mx-auto">
          {/* Student Card */}
          <Card
            className={`p-8 cursor-pointer transition-all duration-300 cred-hover border-2 bg-card/50 backdrop-blur-md ${
              selectedRole === "student"
                ? "border-borderglow"
                : "border-border hover:border-white/50"
            }`}
            onClick={() => setSelectedRole("student")}
          >
            <div className="relative">
              {/* Checkmark */}
              {selectedRole === "student" && (
                <div className="absolute -top-4 -right-4 flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background animate-scale-in">
                  <Check className="h-5 w-5" />
                </div>
              )}

              {/* Icon */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/10 border border-border mb-6">
                <GraduationCap className="h-8 w-8 text-foreground" />
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold mb-3 text-foreground">I'm a Student</h3>
              <p className="text-foreground/70 mb-6 leading-relaxed">
                Learn from industry experts, master in-demand skills, and compete for guaranteed internship opportunities.
              </p>

              {/* Features */}
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-foregroundmt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground/80">Access to expert-led courses</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-foregroundmt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground/80">Real-time progress tracking & rankings</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-foregroundmt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground/80">Guaranteed internships for top performers</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-foregroundmt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground/80">Industry-recognized certifications</span>
                </li>
              </ul>
            </div>
          </Card>

        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 max-w-2xl mx-auto">
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 text-foreground">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Continue Button */}
        <div className="text-center">
          <Button
            size="lg"
            disabled={!selectedRole || loading}
            onClick={handleContinue}
            className="bg-foreground text-background hover:bg-foreground/90 border-2 border-foreground text-lg px-12 h-14 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                Continue with Google
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
          <p className="mt-6 text-sm text-foreground/60">
            Already have an account?{" "}
            <button onClick={() => navigate("/auth/login")} className="text-foregroundfont-medium hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
