import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, FileText, Download, Eye, Plus, Mail } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { AdminNavigation } from "@/components/admin/AdminNavigation";

export default function AdminLetters() {
  const [letters, setLetters] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<any>(null);

  useEffect(() => {
    const fetchLetters = async () => {
      try {
        const data = await apiClient.get("/admin/letters");
        setLetters(data || []);
      } catch (error) {
        console.error("Failed to fetch letters", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLetters();
  }, []);

  const getTypeBadge = (type: string) => {
    const typeConfig: Record<string, { label: string; className: string }> = {
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

    const config = typeConfig[type] || typeConfig.letter_of_intent;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleIssueLetter = async (studentId: string, type: string) => {
    try {
      await apiClient.post("/admin/letters", { studentId, type });
      // Refresh letters list
      const data = await apiClient.get("/admin/letters");
      setLetters(data || []);
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Failed to issue letter", error);
    }
  };

  const handleDownload = async (letterId: string) => {
    try {
      const response = await apiClient.get(`/admin/letters/${letterId}/download`, {
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
    const matchesSearch =
      letter.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      letter.courseTitle?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || letter.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <AdminNavigation />
      <div className="container mx-auto px-4 py-8 max-w-7xl pt-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-white">Letter Management</h1>
            <p className="text-white/80">Issue and manage letters (Intent, Appreciation, Offer)</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-black hover:bg-white/90">
                <Plus className="h-4 w-4 mr-2" />
                Issue Letter
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-black border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Issue New Letter</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-white/80">Letter Type</Label>
                  <Select onValueChange={(value) => setTypeFilter(value)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Select letter type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="letter_of_intent">Letter of Intent</SelectItem>
                      <SelectItem value="letter_of_appreciation">Letter of Appreciation</SelectItem>
                      <SelectItem value="offer_letter">Offer Letter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => handleIssueLetter("student-id", typeFilter)}
                  className="w-full bg-white text-black hover:bg-white/90"
                >
                  Issue Letter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
            <Input
              placeholder="Search by student or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="letter_of_intent">Letter of Intent</SelectItem>
              <SelectItem value="letter_of_appreciation">Letter of Appreciation</SelectItem>
              <SelectItem value="offer_letter">Offer Letter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-white">Student</TableHead>
                <TableHead className="text-white">Course</TableHead>
                <TableHead className="text-white">Letter Type</TableHead>
                <TableHead className="text-white">Issued Date</TableHead>
                <TableHead className="text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-white/60 py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredLetters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-white/60 py-8">
                    No letters found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLetters.map((letter) => (
                  <TableRow key={letter.id} className="border-white/10">
                    <TableCell className="text-white font-medium">{letter.studentName}</TableCell>
                    <TableCell className="text-white/80">{letter.courseTitle}</TableCell>
                    <TableCell>{getTypeBadge(letter.type)}</TableCell>
                    <TableCell className="text-white/80">
                      {letter.issuedAt
                        ? new Date(letter.issuedAt).toLocaleDateString()
                        : "Not issued"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLetter(letter)}
                          className="text-white/80 hover:text-white hover:bg-white/10"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(letter.id)}
                          className="text-white/80 hover:text-white hover:bg-white/10"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white/80 hover:text-white hover:bg-white/10"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

