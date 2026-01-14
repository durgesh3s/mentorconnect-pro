import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/stores/authStore";
import { apiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Briefcase, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Navigation } from "@/components/ui/navigation";
import { toast } from "sonner";

export default function Internships() {
  const { user } = useAuthStore();
  const [internships, setInternships] = useState<any[]>([]);

  useEffect(() => {
    const fetchInternships = async () => {
      try {
        const data = await apiClient.get<any[]>("/internships");
        setInternships(data);
      } catch (error) {
        console.error("Failed to fetch internships", error);
      }
    };

    fetchInternships();
  }, []);

  const handleAccept = async (internshipId: string) => {
    try {
      await apiClient.post(`/internships/${internshipId}/accept`);
      setInternships(
        internships.map((i) => (i.id === internshipId ? { ...i, status: "accepted" } : i))
      );
      toast.success("Internship offer accepted!");
    } catch (error) {
      toast.error("Failed to accept offer");
    }
  };

  const handleDecline = async (internshipId: string) => {
    try {
      await apiClient.post(`/internships/${internshipId}/decline`);
      setInternships(
        internships.map((i) => (i.id === internshipId ? { ...i, status: "declined" } : i))
      );
      toast.success("Internship offer declined");
    } catch (error) {
      toast.error("Failed to decline offer");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground page-transition">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-4xl pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Internship Offers</h1>
          <p className="text-muted-foreground">Manage your internship opportunities</p>
        </div>

        {internships.length === 0 ? (
          <Card className="p-12 text-center">
            <Briefcase className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No internship offers yet</h3>
            <p className="text-muted-foreground">
              Top performers in courses receive internship offers
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {internships.map((internship) => (
              <Card key={internship.id} className="p-6">
                <div className="flex items-start gap-6">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={internship.instructor?.avatar} />
                    <AvatarFallback>{internship.instructor?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">{internship.courseName}</h3>
                        <p className="text-muted-foreground mb-2">
                          Instructor: {internship.instructor?.name}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Duration: {internship.duration} months</span>
                          <span>•</span>
                          <span>Start: {new Date(internship.startDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          internship.status === "accepted"
                            ? "default"
                            : internship.status === "declined"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {internship.status}
                      </Badge>
                    </div>
                    {internship.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAccept(internship.id)}
                          className="gradient-bg"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDecline(internship.id)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

