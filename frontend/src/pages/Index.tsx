import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Navigation } from "@/components/ui/navigation";
import { ScrollReveal } from "@/components/ScrollReveal";
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

interface Stats {
  activeStudents: number;
  totalCourses: number;
  internshipsPlaced: number;
}

export default function Index() {
  const { setThreads } = useProfileStore();
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [featuredThreads, setFeaturedThreads] = useState<BackendThread[]>([]);
  const [featuredCourses, setFeaturedCourses] = useState<TransformedCourse[]>([]);
  const [videoLoading, setVideoLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    activeStudents: 0,
    totalCourses: 0,
    internshipsPlaced: 0,
  });

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
        
        // Fetch statistics
        try {
          const statsResponse = await apiClient.get<Stats>("/courses/stats");
          setStats(statsResponse);
        } catch (statsError) {
          console.error("Failed to fetch statistics", statsError);
          // Keep default values (0) if stats fail
        }
        
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

  // Handle hash navigation - scroll to section when hash is present in URL
  useEffect(() => {
    const hash = location.hash || window.location.hash;
    
    if (!hash) return;

    const scrollToElement = () => {
      const element = document.querySelector(hash);
      if (element) {
        // Account for fixed navbar height
        const navbarHeight = 80;
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - navbarHeight;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        return true;
      }
      return false;
    };

    // Try scrolling with multiple attempts to handle async content loading
    const attemptScroll = () => {
      if (scrollToElement()) {
        return; // Success, no need for more attempts
      }
      
      // Retry after a short delay
      setTimeout(() => {
        if (!scrollToElement()) {
          // Final retry after longer delay
          setTimeout(scrollToElement, 500);
        }
      }, 100);
    };

    // Wait a bit for content to render, especially if still loading
    const delay = loading ? 600 : 100;
    const timeoutId = setTimeout(attemptScroll, delay);

    return () => clearTimeout(timeoutId);
  }, [location.hash, location.pathname, loading]);

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
      <section className="relative pt-32 pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden z-10">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center space-y-8 animate-fade-in-up">
            <div className="inline-block animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              <Badge className="bg-foreground/10 backdrop-blur-sm border border-foreground/20 px-5 py-2 text-sm font-medium text-foreground hover:bg-foreground/15 transition-all duration-300">
                <Rocket className="h-4 w-4 mr-2 inline-block" />
                Guaranteed Internships for Top Performers
              </Badge>
            </div>

            <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-foreground leading-tight">
                Learn From Industry
                <span className="block text-foreground mt-3">Experts & Get Hired</span>
              </h1>
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <p className="text-lg sm:text-xl md:text-2xl text-foreground/80 max-w-3xl mx-auto leading-relaxed font-light">
                Join subscription-based courses led by industry experts. Master JavaScript, DSA, and modern frameworks. Top 10
                students get guaranteed 3-month internships.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
              {!isAuthenticated && (
                <>
                  <Link to="/auth/select-role">
                    <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 text-base sm:text-lg px-8 sm:px-10 h-12 sm:h-14 border-2 border-foreground rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl">
                      Start Learning Now
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/courses">
                    <Button size="lg" variant="outline" className="text-base sm:text-lg px-8 sm:px-10 h-12 sm:h-14 border-2 border-foreground rounded-xl transition-all duration-300 hover:scale-105 hover:bg-foreground hover:text-background">
                      Browse Courses
                    </Button>
                  </Link>
                </>
              )}
              
              {isAuthenticated && (
                <Link to="/courses">
                  <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 text-base sm:text-lg px-8 sm:px-10 h-12 sm:h-14 border-2 border-foreground rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl">
                    Browse Courses
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto pt-12 sm:pt-16 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
              <div className="space-y-2 stagger-item">
                <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
                  <AnimatedCounter target={stats.activeStudents} suffix="+" />
                </p>
                <p className="text-xs sm:text-sm text-foreground/60 font-medium">Active Students</p>
              </div>
              <div className="space-y-2 stagger-item">
                <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
                  <AnimatedCounter target={stats.totalCourses} suffix="+" />
                </p>
                <p className="text-xs sm:text-sm text-foreground/60 font-medium">Total Courses</p>
              </div>
              <div className="space-y-2 stagger-item">
                <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
                  <AnimatedCounter target={stats.internshipsPlaced} suffix="+" />
                </p>
                <p className="text-xs sm:text-sm text-foreground/60 font-medium">Internships Placed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3D Workflow Section - Marquee */}
      <section id="how-it-works" className="relative py-12 px-4 sm:px-6 lg:px-8 z-10">
        <div className="container mx-auto max-w-7xl">
          <ScrollReveal animationType="fadeInUp" delay={0} duration={0.9} threshold={0.2}>
            <div className="mb-16 text-center">
              <div className="inline-block mb-5">
                <Badge className="bg-foreground/10 backdrop-blur-sm border border-foreground/20 px-5 py-2 text-sm font-medium text-foreground hover:bg-foreground/15 transition-all duration-300">
                  How It Works
                </Badge>
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-4 leading-tight">
                Your Journey to Success
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto font-light">
                Simple 3-step process to launch your career
              </p>
            </div>
          </ScrollReveal>

          {/* Marquee Container */}
          <div className="marquee-container mt-12">
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
                  className="flex-shrink-0 w-[360px] sm:w-[400px] md:w-[450px] lg:w-[500px] px-3"
                >
                  <div className="bg-card/50 backdrop-blur-md border border-border rounded-2xl p-8 sm:p-10 h-full transform transition-all duration-500 hover:scale-105 hover:-translate-y-2 hover:shadow-2xl">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-foreground/10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-6 border border-border transition-all duration-300 hover:bg-foreground/15">
                      <span className="text-3xl sm:text-4xl font-bold text-foreground">{step.num}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4 leading-tight">{step.title}</h3>
                    <p className="text-foreground/70 leading-relaxed mb-6 text-sm sm:text-base">{step.desc}</p>
                    <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
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
      <section className="relative py-12 px-4 sm:px-6 lg:px-8 z-10">
        <div className="container mx-auto max-w-7xl">
          <ScrollReveal animationType="fadeInUp" delay={0} duration={0.9} threshold={0.2}>
            <div className="mb-16 text-center">
              <div className="inline-block mb-5">
                <Badge className="bg-foreground/10 backdrop-blur-sm border border-foreground/20 px-5 py-2 text-sm font-medium text-foreground hover:bg-foreground/15 transition-all duration-300">
                  Why Choose Us
                </Badge>
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight">
                Everything You Need to
                <span className="block text-foreground mt-3">Launch Your Career</span>
              </h2>
            </div>
          </ScrollReveal>

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
                  <div key={idx} className="flex-shrink-0 w-[340px] sm:w-[380px] md:w-[400px] px-3">
                    <Card className="p-8 sm:p-10 cred-hover border-border bg-card/50 backdrop-blur-md h-full transition-all duration-300">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-foreground/10 border border-border mb-6 transition-all duration-300 hover:bg-foreground/15 hover:scale-110">
                        <IconComponent className="h-7 w-7 text-foreground" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold mb-4 text-foreground leading-tight">{feature.title}</h3>
                      <p className="text-foreground/70 leading-relaxed text-sm sm:text-base">{feature.desc}</p>
                    </Card>
                  </div>
                );
              })}
              </div>
          </div>
        </div>
      </section>

      {/* Featured Tutorials Section - Marquee */}
      <section className="relative py-12 px-4 sm:px-6 lg:px-8 z-10">
        <div className="container mx-auto max-w-7xl">
          <ScrollReveal animationType="fadeInUp" delay={0} duration={0.9} threshold={0.2}>
            <div className="mb-16 text-center">
              <div className="inline-block mb-5">
                <Badge className="bg-foreground/10 backdrop-blur-sm border border-foreground/20 px-5 py-2 text-sm font-medium text-foreground hover:bg-foreground/15 transition-all duration-300">
                  Popular Courses
                </Badge>
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-4 leading-tight">
                Start Learning Today
                <span className="block text-foreground mt-3">Featured Tutorials</span>
              </h2>
              <p className="text-base sm:text-lg text-foreground/80 max-w-2xl mx-auto font-light">
                Hand-picked courses from industry experts
              </p>
            </div>
          </ScrollReveal>

          {/* Marquee Container */}
          <div className="marquee-container mt-12">
            <div className="marquee-content">
              {featuredCourses.length > 0 ? (
                // Render real courses
                featuredCourses.map((course) => (
                  <div key={course.id} className="flex-shrink-0 w-[340px] sm:w-[380px] md:w-[400px] px-3">
                    <Card className="overflow-hidden cred-hover border-border bg-card/50 backdrop-blur-md h-full transition-all duration-300">
                      <Link to={`/courses/${course.id}`} className="block h-full">
                        <div className="aspect-video bg-foreground/5 relative overflow-hidden group">
                          {course.thumbnail ? (
                            <img
                              src={course.thumbnail}
                              alt={course.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
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
                            <Badge className="bg-background/80 backdrop-blur-sm border border-border text-foreground px-3 py-1.5">
                              <Star className="h-3.5 w-3.5 mr-1.5 fill-foreground text-foreground" />
                              {course.rating > 0 ? course.rating.toFixed(1) : 'N/A'}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-6 sm:p-8">
                          <h3 className="font-bold text-lg mb-3 line-clamp-2 text-foreground leading-tight">{course.title}</h3>
                          <div className="flex items-center gap-2.5 mb-5">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="bg-foreground/10 text-foreground text-xs font-semibold">{course.initial}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-foreground/70 font-medium">{course.instructor}</span>
                          </div>
                          <div className="flex items-center justify-between pt-4 border-t border-border/50">
                            <div className="flex items-center gap-5 text-sm text-foreground/70">
                              <span className="flex items-center gap-1.5 font-medium">
                                <Users className="h-4 w-4" />
                                {course.students}
                              </span>
                              <span className="flex items-center gap-1.5 font-medium">
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
                <div className="flex-shrink-0 w-full text-center py-16">
                  <p className="text-foreground/60 text-lg">No courses available at the moment.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Threads Section - Marquee */}
      <section className="relative py-12 px-4 sm:px-6 lg:px-8 z-10">
        <div className="container mx-auto max-w-7xl">
          <ScrollReveal animationType="fadeInUp" delay={0} duration={0.9} threshold={0.2}>
            <div className="mb-16 text-center">
              <div className="inline-block mb-5">
                <Badge className="bg-foreground/10 backdrop-blur-sm border border-foreground/20 px-5 py-2 text-sm font-medium text-foreground hover:bg-foreground/15 transition-all duration-300">
                  Community
                </Badge>
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-4 leading-tight">
                Latest from Our
                <span className="block text-foreground mt-3">Community</span>
              </h2>
              <p className="text-base sm:text-lg text-foreground/80 max-w-2xl mx-auto font-light">
                See what students are sharing and learning
              </p>
            </div>
          </ScrollReveal>

          {/* Marquee Container */}
          <div className="marquee-container mt-12">
            <div className="marquee-content">
              {featuredThreads.length > 0 ? (
                // Render real threads
                featuredThreads.map((thread) => {
                  const initial = thread.author?.name?.[0]?.toUpperCase() || thread.author?.username?.[0]?.toUpperCase() || "?";
                  return (
                    <div key={thread.id} className="flex-shrink-0 w-[340px] sm:w-[380px] md:w-[400px] px-3">
                      <Link to={`/feed?thread=${thread.id}`}>
                        <Card className="p-6 sm:p-8 cred-hover border-border bg-card/50 backdrop-blur-md h-full cursor-pointer transition-all duration-300">
                          <div className="flex items-start gap-4 mb-5">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={thread.author?.avatar || thread.author?.googleGmailPhoto} />
                              <AvatarFallback className="bg-foreground/10 text-foreground font-semibold">{initial}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-foreground truncate">{thread.author?.name || thread.author?.username}</p>
                              <p className="text-sm text-foreground/60">@{thread.author?.username}</p>
                            </div>
                          </div>
                          <p className="mb-5 line-clamp-3 text-foreground/90 leading-relaxed text-sm sm:text-base">{thread.content}</p>
                          <div className="flex items-center gap-5 text-sm text-foreground/70 pt-4 border-t border-border/50">
                            <div className="flex items-center gap-1.5 font-medium">
                              <Heart className="h-4 w-4" />
                              {thread.likes || 0}
                            </div>
                            <div className="flex items-center gap-1.5 font-medium">
                              <MessageSquare className="h-4 w-4" />
                              {thread.comments || 0}
                            </div>
                            <span className="ml-auto text-xs">{formatDate(thread.createdAt)}</span>
                          </div>
                        </Card>
                      </Link>
                    </div>
                  );
                })
              ) : (
                // Show message if no threads available
                <div className="flex-shrink-0 w-full text-center py-16">
                  <p className="text-foreground/60 text-lg">No community posts available at the moment.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="relative py-12 px-4 sm:px-6 lg:px-8 z-10">
          <div className="container mx-auto max-w-5xl">
            <ScrollReveal animationType="scaleIn" delay={0} duration={0.9} threshold={0.2}>
              <Card className="relative overflow-hidden p-10 sm:p-12 md:p-16 border-2 border-foreground bg-card/50 backdrop-blur-md">
                <div className="text-center space-y-6 sm:space-y-8 text-foreground">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                    Ready to Start Your Journey?
                  </h2>
                  <p className="text-lg sm:text-xl md:text-2xl text-foreground/80 max-w-2xl mx-auto font-light leading-relaxed">
                    Join thousands of students learning from industry experts and landing their dream internships.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                    <Link to="/auth/select-role">
                      <Button size="lg" className="text-base sm:text-lg px-8 sm:px-10 h-12 sm:h-14 bg-foreground text-background hover:bg-foreground/90 border-2 border-foreground rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl">
                        Create Account
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="relative border-t border-border py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-background/50 backdrop-blur-sm z-10">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
            <div className="space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/10 border border-border transition-all duration-300 hover:bg-foreground/15">
                  <GraduationCap className="h-5 w-5 text-foreground" />
                </div>
                <span className="font-bold text-lg text-foreground">Mentorise</span>
              </div>
              <p className="text-sm sm:text-base text-foreground/70 leading-relaxed max-w-xs">
                Empowering students with industry-ready skills and guaranteed career opportunities.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-base mb-5 text-foreground">Platform</h4>
              <ul className="space-y-3 text-sm sm:text-base text-foreground/70">
                <li>
                  <Link to="/courses" className="hover:text-foreground transition-all duration-300 hover:translate-x-1 inline-block">
                    Courses
                  </Link>
                </li>
                <li>
                  <Link to="/feed" className="hover:text-foreground transition-all duration-300 hover:translate-x-1 inline-block">
                    Community
                  </Link>
                </li>
                <li>
                  <Link to="/certificates" className="hover:text-foreground transition-all duration-300 hover:translate-x-1 inline-block">
                    Certificates
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-base mb-5 text-foreground">Company</h4>
              <ul className="space-y-3 text-sm sm:text-base text-foreground/70">
                <li>
                  <Link 
                    to="/" 
                    onClick={(e) => {
                      if (window.location.pathname !== '/') {
                        navigate('/#how-it-works');
                      } else {
                        e.preventDefault();
                        const element = document.querySelector('#how-it-works');
                        if (element) {
                          const navbarHeight = 80;
                          const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                          const offsetPosition = elementPosition - navbarHeight;
                          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                        }
                      }
                    }}
                    className="hover:text-foreground transition-all duration-300 hover:translate-x-1 inline-block"
                  >
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link to="/internships" className="hover:text-foreground transition-all duration-300 hover:translate-x-1 inline-block">
                    Internships
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-base mb-5 text-foreground">Support</h4>
              <ul className="space-y-3 text-sm sm:text-base text-foreground/70">
                <li>
                  <Link to="/dashboard/student" className="hover:text-foreground transition-all duration-300 hover:translate-x-1 inline-block">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <a href="mailto:support@mentorise.in" className="hover:text-foreground transition-all duration-300 hover:translate-x-1 inline-block">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="mailto:support@mentorise.in" className="hover:text-foreground transition-all duration-300 hover:translate-x-1 inline-block">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 sm:mt-16 pt-8 border-t border-border text-center">
            <p className="text-sm sm:text-base text-foreground/60">&copy; 2024 Mentorise. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
