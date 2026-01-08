import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useCourseStore } from "@/lib/stores/courseStore";
import { useAuthStore } from "@/lib/stores/authStore";
import { apiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Star,
  Users,
  Clock,
  CheckCircle2,
  Lock,
  Play,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { Navigation } from "@/components/ui/navigation";

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentCourse, setCurrentCourse } = useCourseStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!id) return;

    const fetchCourse = async () => {
      try {
        const course = await apiClient.get<any>(`/courses/${id}`);
        setCurrentCourse(course);
      } catch (error) {
        console.error("Failed to fetch course", error);
      }
    };

    fetchCourse();
  }, [id, setCurrentCourse]);

  if (!currentCourse) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-white/80">Loading course...</p>
        </div>
      </div>
    );
  }

  const isEnrolled = currentCourse.enrolled;
  const progress = currentCourse.progress || 0;

  return (
    <div className="min-h-screen bg-black text-white page-transition">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-7xl pt-24">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="aspect-video bg-white/5 rounded-lg overflow-hidden border border-white/10">
              {currentCourse.thumbnail ? (
                <img
                  src={currentCourse.thumbnail}
                  alt={currentCourse.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="h-16 w-16 text-white/20" />
                </div>
              )}
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="secondary" className="bg-white/10 text-white border-white/20">{currentCourse.category}</Badge>
                  <Badge className="bg-white/10 text-white border-white/20">{currentCourse.difficulty}</Badge>
                </div>
                <h1 className="text-4xl font-bold mb-4 text-white">{currentCourse.title}</h1>
                <p className="text-lg text-white/80">{currentCourse.description}</p>
              </div>

              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={currentCourse.instructor?.avatar} />
                  <AvatarFallback className="bg-white/10 text-white">{currentCourse.instructor?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-white">{currentCourse.instructor?.name}</p>
                  <p className="text-sm text-white/60">Instructor</p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium text-white">{currentCourse.rating}</span>
                  <span className="text-white/60">({currentCourse.reviewCount})</span>
                </div>
                <div className="flex items-center gap-2 text-white/60">
                  <Users className="h-4 w-4" />
                  <span>{currentCourse.studentCount} students</span>
                </div>
              </div>

              {isEnrolled ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/60">Your Progress</span>
                      <span className="text-sm font-medium text-white">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  <Link to={`/courses/${id}/learn`}>
                    <Button className="w-full bg-white text-black hover:bg-white/90 border-2 border-white" size="lg">
                      Continue Learning
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-2xl font-bold mb-2 text-white">₹{currentCourse.price.monthly}/month</p>
                    <p className="text-sm text-white/60">
                      Or ₹{currentCourse.price.quarterly}/quarter (Save 10%)
                    </p>
                  </div>
                  <Link to={`/courses/${id}/subscribe`}>
                    <Button className="w-full bg-white text-black hover:bg-white/90 border-2 border-white" size="lg">
                      Enroll Now
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="curriculum" className="mb-8">
          <TabsList>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="curriculum" className="mt-6">
            <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
              <div className="space-y-4">
                {currentCourse.modules?.map((module: any, moduleIndex: number) => (
                  <div key={module.id} className="border-b border-white/10 last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center gap-3 mb-3">
                      {module.locked ? (
                        <Lock className="h-5 w-5 text-white/60" />
                      ) : (
                        <BookOpen className="h-5 w-5 text-white" />
                      )}
                      <h3 className="font-semibold text-white">
                        Module {moduleIndex + 1}: {module.title}
                      </h3>
                    </div>
                    <div className="ml-8 space-y-2">
                      {module.lessons?.map((lesson: any, lessonIndex: number) => (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-3 text-sm text-white/60"
                        >
                          {lesson.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          ) : lesson.locked ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-white/40" />
                          )}
                          <span>
                            {lessonIndex + 1}. {lesson.title}
                          </span>
                          <span className="ml-auto">{lesson.duration} min</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border-b border-white/10 last:border-0 pb-4 last:pb-0">
                    <div className="flex items-start gap-4">
                      <Avatar>
                        <AvatarFallback className="bg-white/10 text-white">U{i}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-white">Student {i}</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className="h-4 w-4 text-yellow-500 fill-yellow-500"
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-white/70">
                          Great course! Learned a lot about React patterns and best practices.
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

