import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import "react-day-picker/dist/style.css";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Calendar as CalendarIcon, Clock } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Navigation } from "@/components/ui/navigation";

export default function ScheduleInterview() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const courseId = searchParams.get("courseId");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [preferredMode, setPreferredMode] = useState<string>("online");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00"
  ];

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      alert("Please select both date and time");
      return;
    }

    setLoading(true);
    try {
      const interviewDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(":").map(Number);
      interviewDateTime.setHours(hours, minutes, 0, 0);

      await apiClient.post("/interviews/schedule", {
        courseId,
        scheduledAt: interviewDateTime.toISOString(),
        mode: preferredMode,
        notes,
      });

      setSubmitted(true);
      setTimeout(() => {
        navigate("/dashboard/student");
      }, 2000);
    } catch (error) {
      console.error("Failed to schedule interview", error);
      alert("Failed to schedule interview. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-2xl pt-24">
          <Card className="p-8 bg-card/50 backdrop-blur-md border-border text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-3xl font-bold mb-4 text-foreground">Interview Scheduled!</h2>
            <p className="text-foreground/80 mb-6">
              Your interview has been scheduled. You will receive a confirmation email shortly.
            </p>
            <Button
              onClick={() => navigate("/dashboard/student")}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              Go to Dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-foreground">Schedule Interview</h1>
          <p className="text-foreground/80">Select your preferred date and time for the face-to-face interview</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 bg-card/50 backdrop-blur-md border-border">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Select Date</h2>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date()}
              className="rounded-md border border-border"
            />
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-md border-border">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Select Time</h2>
            <div className="space-y-4">
              <div>
                <Label className="text-foreground/80 mb-2 block">Time Slot</Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger className="bg-card/50 border-border text-foreground">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-foreground/80 mb-2 block">Interview Mode</Label>
                <Select value={preferredMode} onValueChange={setPreferredMode}>
                  <SelectTrigger className="bg-card/50 border-border text-foreground">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online (Video Call)</SelectItem>
                    <SelectItem value="offline">Offline (In-Person)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-foreground/80 mb-2 block">Additional Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requirements or notes..."
                  className="bg-card/50 border-border text-foreground"
                  rows={4}
                />
              </div>
            </div>
          </Card>
        </div>

        <Alert className="mt-6 bg-blue-500/10 border-blue-500/30">
          <CalendarIcon className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-400">
            Please ensure you are available at the selected time. You will receive a confirmation email with interview details.
          </AlertDescription>
        </Alert>

        <div className="mt-6 flex gap-4">
          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedDate || !selectedTime}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            {loading ? "Scheduling..." : "Schedule Interview"}
          </Button>
          <Button
            onClick={() => navigate("/dashboard/student")}
            variant="outline"
            className="border-border text-foreground hover:bg-foreground/10"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

