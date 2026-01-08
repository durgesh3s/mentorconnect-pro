import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCourseStore } from "@/lib/stores/courseStore";
import { apiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Lock, CheckCircle2, Play, BookOpen, MessageSquare, Bookmark } from "lucide-react";
import { Navigation } from "@/components/ui/navigation";

export default function CoursePlayer() {
  const { id } = useParams<{ id: string }>();
  const { currentCourse, setCurrentCourse } = useCourseStore();
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchCourse = async () => {
      try {
        const course = await apiClient.get<any>(`/courses/${id}`);
        setCurrentCourse(course);
        if (course.modules?.[0]?.lessons?.[0]) {
          setSelectedLesson(course.modules[0].lessons[0]);
        }
      } catch (error) {
        console.error("Failed to fetch course", error);
      }
    };

    fetchCourse();
  }, [id, setCurrentCourse]);

  const handleLessonSelect = (lesson: any) => {
    if (lesson.locked) return;
    setSelectedLesson(lesson);
    setCompleted(lesson.completed || false);
    // Load notes for this lesson
    setNotes(lesson.notes || "");
  };

  const handleComplete = async () => {
    if (!selectedLesson) return;
    try {
      const response = await apiClient.post(`/courses/${id}/lessons/${selectedLesson.id}/complete`);
      setCompleted(true);
      
      // Check if course is completed
      if (response.courseCompleted) {
        // Navigate to assessment page
        setTimeout(() => {
          window.location.href = `/courses/${id}/assessment`;
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to mark lesson as complete", error);
    }
  };

  if (!currentCourse) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Loading course...</p>
        </div>
      </div>
    );
  }

  const getVideoEmbedUrl = (url: string) => {
    // Handle YouTube URLs
    if (url.includes("youtube.com/watch?v=")) {
      const videoId = url.split("v=")[1]?.split("&")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    // Handle Google Drive URLs (would need conversion)
    return url;
  };

  return (
    <div className="min-h-screen bg-black text-white page-transition">
      <Navigation />

      <div className="flex h-[calc(100vh-4rem)] pt-20">
        {/* Left Sidebar - Modules */}
        <div className="w-80 border-r bg-card overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold">{currentCourse.title}</h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {currentCourse.modules?.map((module: any, moduleIndex: number) => (
                <Accordion key={module.id} type="single" collapsible>
                  <AccordionItem value={module.id}>
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        {module.locked ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <BookOpen className="h-4 w-4 text-primary" />
                        )}
                        <span>
                          Module {moduleIndex + 1}: {module.title}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="ml-6 space-y-1">
                        {module.lessons?.map((lesson: any) => (
                          <button
                            key={lesson.id}
                            onClick={() => handleLessonSelect(lesson)}
                            disabled={lesson.locked}
                            className={`w-full text-left p-2 rounded text-sm flex items-center gap-2 ${
                              selectedLesson?.id === lesson.id
                                ? "bg-primary/20 text-primary"
                                : lesson.locked
                                  ? "text-muted-foreground cursor-not-allowed"
                                  : "hover:bg-muted"
                            }`}
                          >
                            {lesson.completed ? (
                              <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                            ) : lesson.locked ? (
                              <Lock className="h-4 w-4 flex-shrink-0" />
                            ) : (
                              <Play className="h-4 w-4 flex-shrink-0" />
                            )}
                            <span className="truncate">{lesson.title}</span>
                            <span className="ml-auto text-xs text-muted-foreground">
                              {lesson.duration}m
                            </span>
                          </button>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Center - Video Player */}
        <div className="flex-1 flex flex-col">
          {selectedLesson ? (
            <>
              <div className="flex-1 bg-black flex items-center justify-center">
                <iframe
                  src={getVideoEmbedUrl(selectedLesson.videoUrl)}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
              <div className="p-6 border-t bg-card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{selectedLesson.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Module {currentCourse.modules?.findIndex((m: any) =>
                        m.lessons?.some((l: any) => l.id === selectedLesson.id)
                      ) + 1}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={completed}
                        onCheckedChange={(checked) => {
                          setCompleted(checked as boolean);
                          if (checked) handleComplete();
                        }}
                      />
                      <label className="text-sm">Mark as complete</label>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Select a lesson to start learning</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Notes & Resources */}
        <div className="w-80 border-l bg-card overflow-hidden flex flex-col">
          <Tabs defaultValue="notes" className="flex flex-col h-full">
            <TabsList className="mx-4 mt-4">
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="discussion">Q&A</TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="flex-1 overflow-hidden flex flex-col m-4">
              <ScrollArea className="flex-1">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Take notes here..."
                  className="min-h-[400px] resize-none"
                />
                <Button className="w-full mt-4 gradient-bg" onClick={() => {
                  // Save notes
                  apiClient.post(`/courses/${id}/lessons/${selectedLesson?.id}/notes`, { notes });
                }}>
                  Save Notes
                </Button>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="resources" className="flex-1 overflow-hidden m-4">
              <ScrollArea>
                <div className="space-y-2">
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <Bookmark className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Course Resources</p>
                        <p className="text-sm text-muted-foreground">Download materials</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="discussion" className="flex-1 overflow-hidden m-4">
              <ScrollArea>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Textarea placeholder="Ask a question..." className="min-h-[100px]" />
                    <Button className="w-full gradient-bg">Post Question</Button>
                  </div>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-xs font-medium">U{i}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium mb-1">Student {i}</p>
                            <p className="text-sm text-muted-foreground mb-2">
                              How do I implement this pattern?
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <button>Reply</button>
                              <span>2 replies</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

