import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Mail, CheckCircle2, Award, Briefcase } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Navigation } from "@/components/ui/navigation";

interface Letter {
  id: string;
  type: "letter_of_intent" | "letter_of_appreciation" | "offer_letter";
  courseTitle: string;
  issuedAt: string;
  content?: string;
  status: "issued" | "viewed" | "downloaded";
}

export default function ViewLetters() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLetters = async () => {
      try {
        const data = await apiClient.get("/letters");
        setLetters(data || []);
      } catch (error) {
        console.error("Failed to fetch letters", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLetters();
  }, []);

  const getLetterIcon = (type: string) => {
    switch (type) {
      case "letter_of_intent":
        return <FileText className="h-6 w-6 text-blue-400" />;
      case "letter_of_appreciation":
        return <Award className="h-6 w-6 text-purple-400" />;
      case "offer_letter":
        return <Briefcase className="h-6 w-6 text-green-400" />;
      default:
        return <FileText className="h-6 w-6" />;
    }
  };

  const getLetterTitle = (type: string) => {
    switch (type) {
      case "letter_of_intent":
        return "Letter of Intent";
      case "letter_of_appreciation":
        return "Letter of Appreciation";
      case "offer_letter":
        return "Offer Letter";
      default:
        return "Letter";
    }
  };

  const getLetterBadge = (type: string) => {
    const config: Record<string, { label: string; className: string }> = {
      letter_of_intent: {
        label: "Letter of Intent",
        className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      },
      letter_of_appreciation: {
        label: "Letter of Appreciation",
        className: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      },
      offer_letter: {
        label: "Offer Letter",
        className: "bg-green-500/20 text-green-400 border-green-500/30",
      },
    };

    const letterConfig = config[type] || config.letter_of_intent;
    return <Badge className={letterConfig.className}>{letterConfig.label}</Badge>;
  };

  const handleDownload = async (letterId: string) => {
    try {
      const response = await apiClient.get(`/letters/${letterId}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `letter-${letterId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Failed to download letter", error);
    }
  };

  const filteredLetters = letters.filter((letter) => {
    if (activeTab === "all") return true;
    return letter.type === activeTab;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center pt-24">
          <p className="text-white/80">Loading letters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-6xl pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">My Letters</h1>
          <p className="text-white/80">View and download your letters</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-white/5 border-white/10">
            <TabsTrigger value="all" className="text-white data-[state=active]:bg-white data-[state=active]:text-black">
              All
            </TabsTrigger>
            <TabsTrigger
              value="letter_of_intent"
              className="text-white data-[state=active]:bg-white data-[state=active]:text-black"
            >
              Letter of Intent
            </TabsTrigger>
            <TabsTrigger
              value="letter_of_appreciation"
              className="text-white data-[state=active]:bg-white data-[state=active]:text-black"
            >
              Letter of Appreciation
            </TabsTrigger>
            <TabsTrigger
              value="offer_letter"
              className="text-white data-[state=active]:bg-white data-[state=active]:text-black"
            >
              Offer Letter
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {filteredLetters.length === 0 ? (
          <Card className="p-12 text-center bg-white/5 backdrop-blur-md border-white/10">
            <FileText className="h-12 w-12 mx-auto mb-4 text-white/60" />
            <h3 className="text-lg font-semibold mb-2 text-white">No letters available</h3>
            <p className="text-white/80">
              You haven't received any letters yet. Complete courses and interviews to receive letters.
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredLetters.map((letter) => (
              <Card key={letter.id} className="p-6 bg-white/5 backdrop-blur-md border-white/10">
                <div className="flex items-start gap-4 mb-4">
                  <div className="h-12 w-12 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                    {getLetterIcon(letter.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2 text-white">{getLetterTitle(letter.type)}</h3>
                    <p className="text-sm text-white/60 mb-2">Course: {letter.courseTitle}</p>
                    <p className="text-sm text-white/60">
                      Issued: {new Date(letter.issuedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {getLetterBadge(letter.type)}
                </div>

                {letter.content && (
                  <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-white/80 text-sm line-clamp-3">{letter.content}</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleDownload(letter.id)}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

