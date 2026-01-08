import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/lib/stores/authStore";
import { apiClient } from "@/lib/api/client";
import { Loader2 } from "lucide-react";

export default function Callback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, setPendingRole, pendingRole } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const error = searchParams.get("error");

      if (error) {
        navigate("/auth/select-role?error=" + error);
        return;
      }

      if (!code) {
        navigate("/auth/select-role");
        return;
      }

      try {
        // Exchange code for token
        const response = await apiClient.post<{ token: string; user: any }>("/auth/callback", {
          code,
          role: pendingRole,
        });

        localStorage.setItem("auth_token", response.token);
        setUser(response.user);
        
        // Clear pending role after successful authentication
        setPendingRole(null);
        
        // Redirect based on profile completion status
        if (response.user.isProfileComplete) {
          navigate("/dashboard/student");
        } else {
          navigate("/auth/complete-profile");
        }
      } catch (err) {
        navigate("/auth/select-role?error=authentication_failed");
      }
    };

    handleCallback();
  }, [searchParams, navigate, setUser, setPendingRole, pendingRole]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-white" />
        <p className="text-white/80">Completing authentication...</p>
      </div>
    </div>
  );
}

