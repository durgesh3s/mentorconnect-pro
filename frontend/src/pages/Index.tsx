import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Navigation } from "@/components/ui/navigation";
import { formatPrice } from "@/lib/utils";
import { useProfileStore } from "@/lib/stores/profileStore";
import { useAuthStore } from "@/lib/stores/authStore";
import { apiClient } from "@/lib/api/client";
import {
  GraduationCap,
  Users,
  Award,
  Briefcase,
  Rocket,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  TrendingUp,
  Star,
  MessageSquare,
  Heart,
  Play,
  Clock,
} from "lucide-react";

// Type definitions
interface BackendCourse {
  _id?: string;
  id?: string;
  title: string;
  instructor?: string;
  createdBy?: {
    name: string;
  };
  thumbnail?: string;
  thumbnailUrl?: string;
  youtubeId?: string;
  youtubeType?: "video" | "playlist";
  videos?: Array<{ videoId: string }>;
  averageRating?: number;
  enrollmentsCount?: number;
  isFree?: boolean;
  price?: number;
  duration?: number;
}

interface TransformedCourse {
  id: string;
  title: string;
  instructor: string;
  initial: string;
  rating: number;
  students: number;
  price: number;
  duration: number;
  thumbnail?: string;
}

interface BackendThread {
  id?: string;
  _id?: string;
  author?: {
    id?: string;
    username?: string;
    name?: string;
    avatar?: string;
    googleGmailPhoto?: string;
  };
  content: string;
  likes?: number;
  comments?: number;
  createdAt: string;
}

interface ThreadsResponse {
  data?: BackendThread[];
  threads?: BackendThread[];
}

interface CoursesResponse {
  courses?: BackendCourse[];
}

// Thread type matching the store interface
interface Thread {
  id: string;
  author: {
    id: string;
    username: string;
    name: string;
    avatar?: string;
    googleGmailPhoto?: string;
  };
  content: string;
  images?: string[];
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
  shared?: boolean;
  createdAt: string;
}

// Animated Counter Component
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = target / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const nextValue = Math.min(Math.ceil(increment * currentStep), target);
      setCount(nextValue);

      if (currentStep >= steps) {
        clearInterval(timer);
        setCount(target);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [target]);

  return <span>{count}{suffix}</span>;
}

export default function Index() {
  const { setThreads } = useProfileStore();
  const { isAuthenticated } = useAuthStore();
  const [featuredThreads, setFeaturedThreads] = useState<BackendThread[]>([]);
  const [featuredCourses, setFeaturedCourses] = useState<TransformedCourse[]>([]);
  const [videoLoading, setVideoLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const threadsResponse = await apiClient.get<BackendThread[] | ThreadsResponse>("/feed", { params: { limit: 6 } });
        // Handle different response structures
        const threadsData = Array.isArray(threadsResponse) 
          ? threadsResponse 
          : (threadsResponse as ThreadsResponse)?.data || (threadsResponse as ThreadsResponse)?.threads || [];
        
        if (Array.isArray(threadsData) && threadsData.length > 0) {
          setFeaturedThreads(threadsData);
          // Transform BackendThread to Thread for store
          const transformedThreads: Thread[] = threadsData.map((thread) => ({
            id: thread.id || thread._id || '',
            author: {
              id: thread.author?.id || '',
              username: thread.author?.username || '',
              name: thread.author?.name || 'Unknown',
              avatar: thread.author?.avatar,
              googleGmailPhoto: thread.author?.googleGmailPhoto,
            },
            content: thread.content,
            likes: thread.likes || 0,
            comments: thread.comments || 0,
            shares: 0,
            liked: false,
            createdAt: thread.createdAt,
          }));
          setThreads(transformedThreads);
        } else {
          setFeaturedThreads([]);
        }

        try {
          const coursesResponse = await apiClient.get<CoursesResponse>("/courses", { params: { limit: 6, sortBy: 'popularity' } });
          // Handle response structure: { courses: [], pagination: {} }
          const coursesData = coursesResponse?.courses || [];
          
          if (Array.isArray(coursesData) && coursesData.length > 0) {
            // Transform backend course structure to match rendering format
            const transformedCourses = coursesData.map((course: BackendCourse): TransformedCourse => {
              const instructorName = course.instructor || course.createdBy?.name || 'Unknown';
              const initial = instructorName.charAt(0).toUpperCase();
              const durationHours = course.duration ? Math.round(course.duration / 60) : 20; // Convert minutes to hours
              
              // Generate thumbnail URL if not provided
              let thumbnail = course.thumbnail || course.thumbnailUrl;
              if (!thumbnail && course.youtubeId) {
                // Generate YouTube thumbnail URL
                if (course.youtubeType === 'video') {
                  thumbnail = `https://img.youtube.com/vi/${course.youtubeId}/hqdefault.jpg`;
                } else if (course.youtubeType === 'playlist' && course.videos && course.videos.length > 0) {
                  thumbnail = `https://img.youtube.com/vi/${course.videos[0].videoId}/hqdefault.jpg`;
                }
              }
              
              return {
                id: course._id || course.id,
                title: course.title,
                instructor: instructorName,
                initial: initial,
                rating: course.averageRating || 0,
                students: course.enrollmentsCount || 0,
                price: course.isFree ? 0 : (course.price || 0),
                duration: durationHours,
                thumbnail: thumbnail,
              };
            });
            
            setFeaturedCourses(transformedCourses);
            // Note: setCourses expects Course[] type from store, but we have BackendCourse[]
            // Skipping store update for now as the structure differs significantly
            // If needed, transform BackendCourse to Course format before calling setCourses
          } else {
            setFeaturedCourses([]);
          }
        } catch (courseError) {
          // If courses endpoint fails (e.g., not authenticated), set empty array
          console.error("Failed to fetch courses", courseError);
          setFeaturedCourses([]);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
        // On error, set empty arrays - will show appropriate empty states
        setFeaturedThreads([]);
        setFeaturedCourses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [setThreads]);

  return (
    <div className="min-h-screen bg-background text-foreground page-transition relative overflow-hidden">
      <Navigation />

      {/* Animated Video Background */}
      <div className="fixed inset-0 -z-10 opacity-20 dark:opacity-20 opacity-5">
        {videoLoading && (
          <div className="absolute inset-0 bg-background animate-pulse" />
        )}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          onLoadedData={() => setVideoLoading(false)}
          onError={() => setVideoLoading(false)}
        >
          <source src="https://videos.pexels.com/video-files/3045163/3045163-hd_1920_1080_30fps.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-background/50 dark:bg-background/50 bg-background/20" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-4 overflow-hidden z-10">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6 animate-fade-in-up">
            <Badge className="bg-foreground/10 backdrop-blur-sm border border-foreground/20 px-4 py-1.5 text-foreground">
              <Rocket className="h-3.5 w-3.5 mr-2" />
              Guaranteed Internships for Top Performers
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground">
              Learn From Industry
              <span className="block text-foreground mt-2">Experts & Get Hired</span>
            </h1>

            <p className="text-xl text-foreground/80 max-w-2xl mx-auto leading-relaxed">
              Join subscription-based courses led by industry experts. Master JavaScript, DSA, and modern frameworks. Top 10
              students get guaranteed 3-month internships.
            </p>

            {!isAuthenticated && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
                <Link to="/auth/select-role">
                  <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 text-lg px-8 h-14 border-2 border-foreground">
                    Start Learning Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/courses">
                  <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 text-lg px-8 h-14 border-2 border-foreground">
                    Browse Courses
                  </Button>
                </Link>
              </div>
            )}
            
            {isAuthenticated && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
                <Link to="/courses">
                  <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 text-lg px-8 h-14 border-2 border-foreground">
                    Browse Courses
                  </Button>
                </Link>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto pt-8">
              <div className="space-y-1 stagger-item animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                <p className="text-3xl font-bold text-foreground">
                  <AnimatedCounter target={500} suffix="+" />
                </p>
                <p className="text-sm text-foreground/60">Active Students</p>
              </div>
              <div className="space-y-1 stagger-item animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                <p className="text-3xl font-bold text-foreground">
                  <AnimatedCounter target={50} suffix="+" />
                </p>
                <p className="text-sm text-foreground/60">Expert Instructors</p>
              </div>
              <div className="space-y-1 stagger-item animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
                <p className="text-3xl font-bold text-foreground">
                  <AnimatedCounter target={200} suffix="+" />
                </p>
                <p className="text-sm text-foreground/60">Internships Placed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3D Workflow Section - Marquee */}
      <section id="how-it-works" className="relative py-16 px-4 z-10">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-12 animate-fade-in-up">
            <Badge className="bg-foreground/10 backdrop-blur-sm border border-foreground/20 px-4 py-1.5 text-foreground mb-4">
              How It Works
            </Badge>
            <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
              Your Journey to Success
            </h2>
            <p className="text-foreground/80 text-lg">Simple 3-step process to launch your career</p>
          </div>

          {/* Marquee Container */}
          <div className="marquee-container mt-16">
            <div className="marquee-content">
              {/* Original 3 cards */}
              {[
                { num: "1", title: "Choose Your Path", desc: "Browse courses in JavaScript, React, Next.js, and DSA. Select the perfect course matching your skill level and goals.", feature: "30-50 students per course" },
                { num: "2", title: "Learn & Excel", desc: "Complete modules, submit assignments, and work on real-world projects. Track your progress on the leaderboard.", feature: "Monthly/Quarterly subscriptions" },
                { num: "3", title: "Get Hired", desc: "Top performers receive guaranteed 3-month internship offers. Start your career with real industry experience.", feature: "Top 5-10 students guaranteed" },
                // Duplicate for seamless loop + 3 more cards
                { num: "4", title: "Build Portfolio", desc: "Create real-world projects that showcase your skills. Add them to your portfolio and impress employers.", feature: "Project-based learning" },
                { num: "5", title: "Get Certified", desc: "Earn industry-recognized certificates upon course completion. Validate your skills to employers.", feature: "Verified certificates" },
                { num: "6", title: "Join Network", desc: "Connect with peers and industry professionals. Build your professional network.", feature: "Community access" },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 w-[400px] md:w-[500px]"
                >
                  <div className="bg-card/50 backdrop-blur-md border border-border rounded-3xl p-8 h-full transform transition-all duration-500 hover:scale-105 hover:-translate-y-4">
                    <div className="w-20 h-20 bg-foreground/10 rounded-2xl flex items-center justify-center mb-6 border border-border">
                      <span className="text-4xl font-bold text-foreground">{step.num}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-4">{step.title}</h3>
                    <p className="text-foreground/70 leading-relaxed mb-6">{step.desc}</p>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{step.feature}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Marquee */}
      <section className="relative py-16 px-4 z-10">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 animate-fade-in-up">
            <Badge className="bg-foreground/10 backdrop-blur-sm border border-foreground/20 px-4 py-1.5 text-foreground mb-4">
              Why Choose Us
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">
              Everything You Need to
              <span className="block text-foreground mt-2">Launch Your Career</span>
            </h2>
          </div>

          {/* Marquee Container */}
          <div className="marquee-container mt-12">
            <div className="marquee-content">
              {[
                { icon: BookOpen, title: "Expert-Led Courses", desc: "Learn from industry professionals with real-world experience. Structured curriculum covering JavaScript, React, Next.js, and DSA." },
                { icon: Briefcase, title: "Guaranteed Internships", desc: "Top 5-10 performers in each course receive guaranteed 3-month internships at leading companies." },
                { icon: TrendingUp, title: "Progress Tracking", desc: "Real-time rankings based on assignments, projects, and engagement. See where you stand on the leaderboard." },
                // Duplicate + 3 more
                { icon: Award, title: "Industry Certificates", desc: "Earn recognized certificates that validate your skills and boost your resume credibility." },
                { icon: Users, title: "Instructor Support", desc: "Get personalized guidance from experienced instructors who are invested in your success." },
                { icon: Rocket, title: "Career Growth", desc: "Accelerate your career with practical skills and real-world project experience." },
              ].map((feature, idx) => {
                const IconComponent = feature.icon;
                return (
                  <div key={idx} className="flex-shrink-0 w-[350px] md:w-[400px]">
                    <Card className="p-8 cred-hover border-border bg-card/50 backdrop-blur-md h-full">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/10 border border-border mb-6 animate-zoom-in">
                        <IconComponent className="h-6 w-6 text-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold mb-3 text-foreground">{feature.title}</h3>
                      <p className="text-foreground/70 leading-relaxed">{feature.desc}</p>
                    </Card>
                  </div>
                );
              })}
              </div>
          </div>
        </div>
      </section>

      {/* Featured Tutorials Section - Marquee */}
      <section className="relative py-16 px-4 z-10">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 animate-fade-in-up">
            <Badge className="bg-foreground/10 backdrop-blur-sm border border-foreground/20 px-4 py-1.5 text-foreground mb-4">
              Popular Courses
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
              Start Learning Today
              <span className="block text-foreground mt-2">Featured Tutorials</span>
            </h2>
            <p className="text-foreground/80">Hand-picked courses from industry experts</p>
          </div>

          {/* Marquee Container */}
          <div className="marquee-container mt-12">
            <div className="marquee-content">
              {featuredCourses.length > 0 ? (
                // Render real courses
                featuredCourses.map((course) => (
                  <div key={course.id} className="flex-shrink-0 w-[350px] md:w-[400px]">
                    <Card className="overflow-hidden cred-hover border-border bg-card/50 backdrop-blur-md h-full">
                      <Link to={`/courses/${course.id}`}>
                        <div className="aspect-video bg-foreground/5 relative overflow-hidden">
                          {course.thumbnail ? (
                            <img
                              src={course.thumbnail}
                              alt={course.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const fallback = parent.querySelector('.thumbnail-fallback') as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div className={`thumbnail-fallback w-full h-full flex items-center justify-center ${course.thumbnail ? 'hidden' : ''}`}>
                            <Play className="h-12 w-12 text-foreground/20" />
                          </div>
                          <div className="absolute top-4 right-4">
                            <Badge className="bg-background/50 backdrop-blur-sm border border-border text-foreground">
                              <Star className="h-3 w-3 mr-1 fill-foreground text-foreground" />
                              {course.rating > 0 ? course.rating.toFixed(1) : 'N/A'}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-6">
                          <h3 className="font-semibold mb-2 line-clamp-2 text-foreground">{course.title}</h3>
                          <div className="flex items-center gap-2 mb-4">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-foreground/10 text-foreground text-xs">{course.initial}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-foreground/60">{course.instructor}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-foreground/60">
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {course.students}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {course.duration || 20}h
                              </span>
                            </div>
                            <span className="text-lg font-bold text-foreground">
                              {course.price > 0 ? `₹${formatPrice(course.price)}/mo` : 'Free'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </Card>
                  </div>
                ))
              ) : (
                // Show message if no courses available
                <div className="flex-shrink-0 w-full text-center py-8">
                  <p className="text-foreground/60">No courses available at the moment.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Threads Section - Marquee */}
      <section className="relative py-16 px-4 z-10">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 animate-fade-in-up">
            <Badge className="bg-foreground/10 backdrop-blur-sm border border-foreground/20 px-4 py-1.5 text-foreground mb-4">
              Community
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
              Latest from Our
              <span className="block text-foreground mt-2">Community</span>
            </h2>
            <p className="text-foreground/80">See what students are sharing and learning</p>
          </div>

          {/* Marquee Container */}
          <div className="marquee-container mt-12">
            <div className="marquee-content">
              {featuredThreads.length > 0 ? (
                // Render real threads
                featuredThreads.map((thread) => {
                  const initial = thread.author?.name?.[0]?.toUpperCase() || thread.author?.username?.[0]?.toUpperCase() || "?";
                  return (
                    <div key={thread.id} className="flex-shrink-0 w-[350px] md:w-[400px]">
                      <Link to={`/feed?thread=${thread.id}`}>
                        <Card className="p-6 cred-hover border-border bg-card/50 backdrop-blur-md h-full cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg">
                          <div className="flex items-start gap-4 mb-4">
                            <Avatar>
                              <AvatarImage src={thread.author?.avatar || thread.author?.googleGmailPhoto} />
                              <AvatarFallback className="bg-foreground/10 text-foreground">{initial}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">{thread.author?.name || thread.author?.username}</p>
                              <p className="text-sm text-foreground/60">@{thread.author?.username}</p>
                            </div>
                          </div>
                          <p className="mb-4 line-clamp-3 text-foreground/90">{thread.content}</p>
                          <div className="flex items-center gap-4 text-sm text-foreground/60">
                            <div className="flex items-center gap-1">
                              <Heart className="h-4 w-4" />
                              {thread.likes || 0}
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              {thread.comments || 0}
                            </div>
                            <span className="ml-auto">{formatDate(thread.createdAt)}</span>
                          </div>
                        </Card>
                      </Link>
                    </div>
                  );
                })
              ) : (
                // Show message if no threads available
                <div className="flex-shrink-0 w-full text-center py-8">
                  <p className="text-foreground/60">No community posts available at the moment.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="relative py-16 px-4 z-10">
          <div className="container mx-auto max-w-4xl">
            <Card className="relative overflow-hidden p-12 border-2 border-foreground bg-card/50 backdrop-blur-md animate-zoom-in">
              <div className="text-center space-y-6 text-foreground">
                <h2 className="text-4xl md:text-5xl font-bold">Ready to Start Your Journey?</h2>
                <p className="text-xl text-foreground/80 max-w-2xl mx-auto">
                  Join thousands of students learning from industry experts and landing their dream internships.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Link to="/auth/select-role">
                    <Button size="lg" className="text-lg px-8 h-14 bg-foreground text-background hover:bg-foreground/90 cred-hover border-2 border-foreground">
                      Create Account
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="relative border-t border-border py-12 px-4 bg-background/50 backdrop-blur-sm z-10">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/10 border border-border">
                  <GraduationCap className="h-5 w-5 text-foreground" />
                </div>
                <span className="font-bold text-foreground">Mentorise</span>
              </div>
              <p className="text-sm text-foreground/60">
                Empowering students with industry-ready skills and guaranteed career opportunities.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-foreground">Platform</h4>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li><Link to="/courses" className="hover:text-foreground transition-base">Courses</Link></li>
                <li><Link to="/feed" className="hover:text-foreground transition-base">Community</Link></li>
                <li><Link to="/certificates" className="hover:text-foreground transition-base">Certificates</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-foreground">Company</h4>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li><a href="#how-it-works" className="hover:text-foreground transition-base">How It Works</a></li>
                <li><Link to="/internships" className="hover:text-foreground transition-base">Internships</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-foreground">Support</h4>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li><Link to="/dashboard/student" className="hover:text-foreground transition-base">Dashboard</Link></li>
                <li><a href="mailto:support@mentorise.in" className="hover:text-foreground transition-base">Help Center</a></li>
                <li><a href="mailto:support@mentorise.in" className="hover:text-foreground transition-base">Contact Us</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-foreground/60">
            <p>&copy; 2024 Mentorise. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
