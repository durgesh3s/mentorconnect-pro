import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/stores/authStore";
import { apiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Share2, Award } from "lucide-react";
import { Navigation } from "@/components/ui/navigation";

export default function Certificates() {
  const { user } = useAuthStore();
  const [certificates, setCertificates] = useState<any[]>([]);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const data = await apiClient.get<any[]>("/certificates");
        setCertificates(data);
      } catch (error) {
        console.error("Failed to fetch certificates", error);
      }
    };

    fetchCertificates();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white page-transition">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-6xl pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Certificates</h1>
          <p className="text-muted-foreground">Your earned certificates and achievements</p>
        </div>

        {certificates.length === 0 ? (
          <Card className="p-12 text-center">
            <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No certificates yet</h3>
            <p className="text-muted-foreground mb-4">
              Complete courses to earn certificates
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((certificate) => (
              <Card key={certificate.id} className="overflow-hidden hover-lift">
                <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <Award className="h-16 w-16 text-primary" />
                </div>
                <div className="p-6">
                  <h3 className="font-semibold mb-2">{certificate.courseName}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Issued on {new Date(certificate.issuedDate).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
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

