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
import { Lock, CheckCircle2, Play, BookOpen, MessageSquare, Bookmark, Menu, X } from "lucide-react";
import { Navigation } from "@/components/ui/navigation";
import { useIsMobile } from "@/hooks/use-mobile";

export default function CoursePlayer() {
  const { id } = useParams<{ id: string }>();
  const { currentCourse, setCurrentCourse } = useCourseStore();
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isMobile = useIsMobile();
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  
  // Initialize sidebar state based on mobile status
  useEffect(() => {
    setShowLeftSidebar(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    if (!id) return;

    const fetchCourse = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      
      console.log('[CoursePlayer] Fetching course:', id);
      setLoading(true);
      try {
        const course = await apiClient.get<any>(`/courses/${id}`);
        console.log('[CoursePlayer] Course fetched:', {
          id: course._id,
          title: course.title,
          youtubeType: course.youtubeType,
          videoCount: course.videoCount,
          videosLength: course.videos?.length || 0,
          hasVideos: !!(course.videos && course.videos.length > 0),
          videos: course.videos?.map((v: any) => ({
            videoId: v.videoId,
            title: v.title?.substring(0, 50),
            order: v.order,
            notes: v.notes ? 'has notes' : 'no notes'
          })) || []
        });
        setCurrentCourse(course);
        
        // Handle videos array from backend
        if (course.videos && course.videos.length > 0) {
          console.log('[CoursePlayer] Setting first video as selected:', course.videos[0]);
          const firstVideo = course.videos[0];
          setSelectedLesson(firstVideo);
          // Load notes for first video
          if (firstVideo.videoId) {
            try {
              const notesResponse = await apiClient.get(`/courses/${id}/videos/${firstVideo.videoId}/notes`);
              setNotes(notesResponse.notes || firstVideo.notes || "");
            } catch (error) {
              console.warn('[CoursePlayer] Failed to load notes for first video:', error);
              setNotes(firstVideo.notes || "");
            }
          } else {
            setNotes(firstVideo.notes || "");
          }
        } else if (course.modules?.[0]?.lessons?.[0]) {
          // Fallback to modules/lessons structure if videos not available
          console.log('[CoursePlayer] No videos found, using modules/lessons fallback');
          setSelectedLesson(course.modules[0].lessons[0]);
        } else {
          console.warn('[CoursePlayer] No videos or lessons found in course');
        }
      } catch (error: any) {
        console.error("[CoursePlayer] ❌ Failed to fetch course", error);
        // Show error message to user
        if (error.response) {
          console.error("[CoursePlayer] Error response:", error.response.status, error.response.data);
          if (error.response.status === 401) {
            // Auth error - will be handled by interceptor
            return;
          }
        }
        // Set error state - could add error message display here
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id, setCurrentCourse]);

  // Handle refresh videos for playlist courses
  const handleRefreshVideos = async () => {
    if (!id || !currentCourse || currentCourse.youtubeType !== 'playlist') {
      console.warn('[CoursePlayer] Cannot refresh: missing id, course, or not a playlist');
      return;
    }
    
    console.log('[CoursePlayer] Refreshing videos for playlist course:', id);
    setRefreshing(true);
    try {
      // Try student endpoint first, fallback to admin endpoint if needed
      const response = await apiClient.post(`/courses/${id}/refresh-videos`).catch(async (error) => {
        console.log('[CoursePlayer] Student endpoint failed, trying admin endpoint:', error);
        return await apiClient.post(`/courses/admin/${id}/refresh-videos`);
      });
      console.log('[CoursePlayer] Refresh response:', response);
      
      // Reload course data after refresh
      console.log('[CoursePlayer] Reloading course data...');
      const course = await apiClient.get<any>(`/courses/${id}`);
      console.log('[CoursePlayer] Course reloaded:', {
        videosCount: course.videos?.length || 0,
        videos: course.videos?.map((v: any) => ({ videoId: v.videoId, title: v.title?.substring(0, 30) }))
      });
      
      setCurrentCourse(course);
      if (course.videos && course.videos.length > 0) {
        console.log('[CoursePlayer] Setting first video after refresh:', course.videos[0]);
        setSelectedLesson(course.videos[0]);
      } else {
        console.warn('[CoursePlayer] No videos found after refresh');
      }
    } catch (error) {
      console.error("[CoursePlayer] ❌ Failed to refresh videos", error);
      alert("Failed to refresh videos. Make sure you're logged in as admin and YOUTUBE_API_KEY is set.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleLessonSelect = async (lesson: any) => {
    if (lesson.locked) return;
    console.log('[CoursePlayer] Lesson selected:', {
      videoId: lesson.videoId,
      id: lesson.id,
      title: lesson.title,
      order: lesson.order,
      completed: lesson.completed
    });
    setSelectedLesson(lesson);
    setCompleted(lesson.completed || false);
    
    // Load notes for this video
    const videoId = lesson.videoId || lesson.id;
    if (videoId && id) {
      try {
        console.log('[CoursePlayer] Loading notes for video:', videoId);
        const response = await apiClient.get(`/courses/${id}/videos/${videoId}/notes`);
        console.log('[CoursePlayer] Notes loaded:', response);
        setNotes(response.notes || "");
      } catch (error) {
        console.warn('[CoursePlayer] Failed to load notes (might not exist yet):', error);
        // Use notes from lesson object if available, otherwise empty
        setNotes(lesson.notes || "");
      }
    } else {
      // Use notes from lesson object if available
    setNotes(lesson.notes || "");
    }
  };

  // Format duration from seconds to minutes
  const formatDuration = (seconds: number) => {
    if (!seconds) return '0m';
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  // Get videos list - prioritize videos array from backend
  const getVideosList = () => {
    if (!currentCourse) {
      console.log('[CoursePlayer] No currentCourse, returning empty list');
      return [];
    }
    
    console.log('[CoursePlayer] Getting videos list, currentCourse:', {
      hasVideos: !!(currentCourse.videos && currentCourse.videos.length > 0),
      videosLength: currentCourse.videos?.length || 0,
      hasModules: !!currentCourse.modules,
      modulesLength: currentCourse.modules?.length || 0
    });
    
    if (currentCourse.videos && currentCourse.videos.length > 0) {
      const videos = currentCourse.videos.map((video: any, index: number) => ({
        ...video,
        id: video.videoId || video._id || `video-${index}`,
        title: video.title || `Video ${index + 1}`,
        duration: video.duration || 0,
        order: video.order || index + 1,
        locked: false,
        completed: video.completed || false, // Use completion status from backend
      }));
      console.log('[CoursePlayer] Returning videos from videos array:', videos.length);
      return videos;
    }
    // Fallback to modules/lessons structure
    const lessons: any[] = [];
    currentCourse.modules?.forEach((module: any) => {
      module.lessons?.forEach((lesson: any) => {
        lessons.push(lesson);
      });
    });
    console.log('[CoursePlayer] Returning lessons from modules:', lessons.length);
    return lessons;
  };

  const videosList = currentCourse ? getVideosList() : [];
  
  if (currentCourse) {
    console.log('[CoursePlayer] Videos list:', {
      count: videosList.length,
      selectedLesson: selectedLesson ? {
        videoId: selectedLesson.videoId,
        title: selectedLesson.title
      } : null
    });
  }

  const handleComplete = async () => {
    if (!selectedLesson) return;
    const videoId = selectedLesson.videoId || selectedLesson.id;
    if (!videoId) {
      console.error('[CoursePlayer] Cannot mark complete: missing videoId');
      return;
    }
    
    try {
      console.log('[CoursePlayer] Marking video as complete:', videoId);
      const response = await apiClient.post(`/courses/${id}/videos/${videoId}/complete`);
      console.log('[CoursePlayer] Video marked complete:', response);
      setCompleted(true);
      
      // Update the video in the list to show as completed
      if (currentCourse?.videos) {
        const updatedVideos = currentCourse.videos.map((v: any) => 
          v.videoId === videoId ? { ...v, completed: true } : v
        );
        setCurrentCourse({ ...currentCourse, videos: updatedVideos });
      }
      
      // Check if course is completed
      if (response.courseCompleted) {
        console.log('[CoursePlayer] Course completed!');
        // Show success message
        setTimeout(() => {
          if (confirm('Congratulations! You completed the course. Would you like to view the assessment?')) {
          window.location.href = `/courses/${id}/assessment`;
          }
        }, 1000);
      }
    } catch (error) {
      console.error("[CoursePlayer] ❌ Failed to mark lesson as complete", error);
      alert('Failed to mark video as complete. Please try again.');
    }
  };

  if (loading || !currentCourse) {
    return (
      <div className="min-h-screen bg-black text-white page-transition">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)] pt-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading course...</p>
          </div>
        </div>
      </div>
    );
  }

  const getVideoEmbedUrl = (video: any) => {
    console.log('[CoursePlayer] Getting embed URL for video:', video);
    // If video is an object with videoId
    if (video?.videoId) {
      const embedUrl = `https://www.youtube.com/embed/${video.videoId}`;
      console.log('[CoursePlayer] Generated embed URL from videoId:', embedUrl);
      return embedUrl;
    }
    // If video is a string URL
    if (typeof video === 'string') {
    // Handle YouTube URLs
      if (video.includes("youtube.com/watch?v=")) {
        const videoId = video.split("v=")[1]?.split("&")[0];
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        console.log('[CoursePlayer] Generated embed URL from YouTube URL:', embedUrl);
        return embedUrl;
      }
      // Handle direct videoId
      if (video.match(/^[a-zA-Z0-9_-]{11}$/)) {
        const embedUrl = `https://www.youtube.com/embed/${video}`;
        console.log('[CoursePlayer] Generated embed URL from direct videoId:', embedUrl);
        return embedUrl;
      }
      return video;
    }
    // If video has videoUrl property
    if (video?.videoUrl) {
      if (video.videoUrl.includes("youtube.com/watch?v=")) {
        const videoId = video.videoUrl.split("v=")[1]?.split("&")[0];
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        console.log('[CoursePlayer] Generated embed URL from videoUrl:', embedUrl);
        return embedUrl;
      }
      return video.videoUrl;
    }
    console.warn('[CoursePlayer] Could not generate embed URL, returning empty string');
    return '';
  };

  return (
    <div className="min-h-screen bg-black text-white page-transition">
      <Navigation />

      <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] pt-20">
        {/* Left Sidebar - Modules */}
        <div className={`${isMobile ? (showLeftSidebar ? 'fixed inset-0 z-50' : 'hidden') : 'block'} md:relative md:w-80 border-r border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden flex flex-col shadow-xl`}>
          {isMobile && (
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="font-bold text-lg">Course Content</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowLeftSidebar(false)}
                className="text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}
          <div className="p-4 border-b border-white/10 bg-gradient-to-r from-primary/10 to-transparent">
            <h2 className="font-bold text-lg leading-tight line-clamp-2">{currentCourse.title}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {videosList.length} {videosList.length === 1 ? 'video' : 'videos'}
            </p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {currentCourse?.youtubeType === 'playlist' && 
               (!currentCourse?.videos || currentCourse.videos.length === 0) && (
                <div className="mb-4 p-4 bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/30 rounded-xl shadow-lg backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-300 mb-2">
                        Videos not loaded
                      </p>
                      <p className="text-xs text-yellow-400/80 mb-3">
                        Click to refresh from YouTube playlist.
                      </p>
                      <Button 
                        onClick={handleRefreshVideos}
                        disabled={refreshing}
                        size="sm"
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold transition-all duration-200 shadow-lg"
                      >
                        {refreshing ? (
                          <span className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                            Refreshing...
                          </span>
                        ) : (
                          "Refresh Videos"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {videosList.length > 0 ? (
                videosList.map((video: any) => {
                  const isSelected = selectedLesson?.videoId === video.videoId || selectedLesson?.id === video.id;
                  return (
                    <button
                      key={video.id || video.videoId}
                      onClick={() => handleLessonSelect(video)}
                      disabled={video.locked}
                      className={`w-full text-left p-3 rounded-lg text-sm flex items-center gap-3 transition-all duration-200 group ${
                        isSelected
                          ? "bg-gradient-to-r from-primary/30 to-primary/10 text-primary border-l-4 border-primary shadow-lg"
                          : video.locked
                            ? "text-muted-foreground cursor-not-allowed opacity-50"
                            : "hover:bg-white/5 hover:translate-x-1 border-l-4 border-transparent"
                      }`}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        isSelected 
                          ? "bg-primary/20" 
                          : video.completed 
                            ? "bg-green-500/20" 
                            : "bg-white/5 group-hover:bg-white/10"
                      }`}>
                        {video.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        ) : video.locked ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Play className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-white'}`} />
                        )}
                      </div>
                      <span className={`truncate flex-1 font-medium ${isSelected ? 'text-primary' : ''}`}>
                        {video.title}
                      </span>
                      <span className={`ml-auto text-xs px-2 py-1 rounded ${
                        isSelected 
                          ? "bg-primary/20 text-primary" 
                          : "text-muted-foreground bg-white/5"
                      }`}>
                        {formatDuration(video.duration)}
                      </span>
                    </button>
                  );
                })
              ) : currentCourse?.modules ? (
                // Fallback to modules structure if videos not available
                currentCourse.modules.map((module: any, moduleIndex: number) => (
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
                ))
              ) : (
                <div className="text-center text-sm text-muted-foreground p-4">
                  No videos available
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Center - Video Player */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-black via-black to-gray-900 min-w-0">
          {selectedLesson ? (
            <>
              <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden shadow-2xl p-2 md:p-4 lg:p-6">
                <div className="w-full h-full max-w-full max-h-full relative rounded-lg overflow-hidden border border-white/10 shadow-2xl">
                  <iframe
                    src={getVideoEmbedUrl(selectedLesson)}
                    className="w-full h-full absolute inset-0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                </div>
              </div>
              <div className="p-4 md:p-6 border-t border-white/10 bg-gradient-to-b from-black/80 to-black backdrop-blur-sm">
                <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 md:mb-0">
                      {isMobile && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowLeftSidebar(true)}
                          className="text-white hover:bg-white/10 flex-shrink-0"
                        >
                          <Menu className="h-5 w-5" />
                        </Button>
                      )}
                      <h3 className="text-xl md:text-2xl font-bold text-white leading-tight break-words">{selectedLesson.title}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-2">
                      <span className="text-xs px-3 py-1 rounded-full bg-primary/20 text-primary font-medium">
                      {selectedLesson.order 
                        ? `Video ${selectedLesson.order} of ${videosList.length}`
                        : currentCourse?.modules?.findIndex((m: any) =>
                            m.lessons?.some((l: any) => l.id === selectedLesson.id)
                          ) !== -1 
                          ? `Module ${currentCourse.modules.findIndex((m: any) =>
                        m.lessons?.some((l: any) => l.id === selectedLesson.id)
                            ) + 1}`
                          : 'Video'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(selectedLesson.duration)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
                    {isMobile && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRightSidebar(true)}
                        className="flex-1 md:flex-initial text-white border-white/20 hover:bg-white/10"
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Notes
                      </Button>
                    )}
                    <div className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                      <Checkbox
                        checked={completed}
                        onCheckedChange={(checked) => {
                          setCompleted(checked as boolean);
                          if (checked) handleComplete();
                        }}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <label className="text-sm font-medium cursor-pointer whitespace-nowrap">Mark as complete</label>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center animate-pulse">
                  <BookOpen className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Ready to Learn?</h3>
                <p className="text-muted-foreground">Select a lesson from the sidebar to start</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Notes & Resources */}
        <div className={`${isMobile ? (showRightSidebar ? 'fixed inset-0 z-50' : 'hidden') : 'block'} md:relative md:w-80 border-l border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden flex flex-col shadow-xl`}>
          {isMobile && (
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="font-bold text-lg">Notes & Resources</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowRightSidebar(false)}
                className="text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}
          <Tabs defaultValue="notes" className="flex flex-col h-full">
            <TabsList className="mx-4 mt-4 bg-white/5 rounded-lg p-1">
              <TabsTrigger 
                value="notes" 
                className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
              >
                Notes
              </TabsTrigger>
              <TabsTrigger 
                value="resources"
                className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
              >
                Resources
              </TabsTrigger>
              <TabsTrigger 
                value="discussion"
                className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
              >
                Q&A
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="flex-1 overflow-hidden flex flex-col m-4 mt-2">
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-white mb-1">Your Notes</h4>
                <p className="text-xs text-muted-foreground">
                  {selectedLesson ? `Taking notes for: ${selectedLesson.title?.substring(0, 30)}...` : 'Select a video to take notes'}
                </p>
              </div>
              <ScrollArea className="flex-1 mb-4">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Take notes here...&#10;&#10;Your notes are automatically saved per video. You can write key points, code snippets, or anything you find useful!"
                  className="min-h-[400px] resize-none bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 text-sm leading-relaxed"
                  disabled={!selectedLesson}
                />
              </ScrollArea>
              <Button 
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={async () => {
                  if (!selectedLesson || !id) {
                    console.warn('[CoursePlayer] Cannot save notes: missing lesson or course ID');
                    return;
                  }
                  const videoId = selectedLesson.videoId || selectedLesson.id;
                  if (!videoId) {
                    console.error('[CoursePlayer] Cannot save notes: missing videoId');
                    alert('Error: Video ID is missing. Cannot save notes.');
                    return;
                  }
                  try {
                    console.log('[CoursePlayer] Saving notes for video:', videoId);
                    await apiClient.post(`/courses/${id}/videos/${videoId}/notes`, { notes });
                    console.log('[CoursePlayer] Notes saved successfully');
                    // Show success feedback
                    const button = document.activeElement as HTMLElement;
                    if (button) {
                      const originalText = button.textContent;
                      button.textContent = '✓ Saved!';
                      button.className += ' bg-green-500 hover:bg-green-600';
                      setTimeout(() => {
                        if (button) {
                          button.textContent = originalText;
                          button.className = button.className.replace(' bg-green-500 hover:bg-green-600', '');
                        }
                      }, 2000);
                    }
                  } catch (error) {
                    console.error('[CoursePlayer] Failed to save notes:', error);
                    alert('Failed to save notes. Please try again.');
                  }
                }}
                disabled={!selectedLesson}
              >
                💾 Save Notes
              </Button>
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

