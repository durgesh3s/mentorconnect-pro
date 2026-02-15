import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, ArrowRight, Check } from "lucide-react";

export default function SelectRole() {
  const [selectedRole, setSelectedRole] = useState<"student" | "mentor" | null>(null);
  const navigate = useNavigate();

  const  handleContinue = () => {
    if (selectedRole) {
      localStorage.setItem("pendingRole", selectedRole);
      // In production, this would redirect to OAuth
      // For now, redirect to complete profile page
      navigate("/auth/complete-profile");
    }
  };

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

      <div className="w-full max-w-4xl animate-fade-in-up relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 border border-white/20">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">CodeMentor Pro</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">Choose Your Path</h1>
          <p className="text-xl text-white/80">Select your role to get started</p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Student Card */}
          <Card
            className={`p-8 cursor-pointer transition-all duration-300 cred-hover border-2 bg-white/5 backdrop-blur-md ${
              selectedRole === "student"
                ? "border-white glow"
                : "border-white/20 hover:border-white/50"
            }`}
            onClick={() => setSelectedRole("student")}
          >
            <div className="relative">
              {/* Checkmark */}
              {selectedRole === "student" && (
                <div className="absolute -top-4 -right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black animate-scale-in">
                  <Check className="h-5 w-5" />
                </div>
              )}

              {/* Icon */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 border border-white/20 mb-6">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold mb-3 text-white">I'm a Student</h3>
              <p className="text-white/70 mb-6 leading-relaxed">
                Learn from industry experts, master in-demand skills, and compete for guaranteed internship opportunities.
              </p>

              {/* Features */}
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-white/80">Access to expert-led courses</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-white/80">Real-time progress tracking & rankings</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-white/80">Guaranteed internships for top performers</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-white/80">Industry-recognized certifications</span>
                </li>
              </ul>
            </div>
          </Card>

          {/* Mentor Card */}
          <Card
            className={`p-8 cursor-pointer transition-all duration-300 cred-hover border-2 bg-white/5 backdrop-blur-md ${
              selectedRole === "mentor"
                ? "border-white glow"
                : "border-white/20 hover:border-white/50"
            }`}
            onClick={() => setSelectedRole("mentor")}
          >
            <div className="relative">
              {/* Checkmark */}
              {selectedRole === "mentor" && (
                <div className="absolute -top-4 -right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black animate-scale-in">
                  <Check className="h-5 w-5" />
                </div>
              )}

              {/* Icon */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 border border-white/20 mb-6">
                <Users className="h-8 w-8 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold mb-3 text-white">I'm a Mentor</h3>
              <p className="text-white/70 mb-6 leading-relaxed">
                Share your expertise, create courses, mentor students, and offer internships to top performers.
              </p>

              {/* Features */}
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-white/80">Create & publish courses</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-white/80">Manage up to 50 students per course</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-white/80">Select top performers for internships</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-white/80">Build your professional brand</span>
                </li>
              </ul>
            </div>
          </Card>
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <Button
            size="lg"
            disabled={!selectedRole}
            onClick={handleContinue}
            className="bg-white text-black hover:bg-white/90 border-2 border-white text-lg px-12 h-14 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="mt-6 text-sm text-white/60">
            Already have an account?{" "}
            <button onClick={() => navigate("/auth/login")} className="text-white font-medium hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
