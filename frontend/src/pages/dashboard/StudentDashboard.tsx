import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/lib/stores/authStore";
import { useCourseStore } from "@/lib/stores/courseStore";
import { apiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  BookOpen,
  ArrowRight,
  Users,
  CheckCircle2,
  XCircle,
  Play,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Edit,
  Github,
  Linkedin,
  Twitter,
  Globe,
  Instagram,
  Link as LinkIcon,
} from "lucide-react";
import { Navigation } from "@/components/ui/navigation";

interface UserProfile {
  _id?: string;
  id?: string;
  username: string;
  email: string;
  name: string;
  avatar?: string;
  googleGmailPhoto?: string;
  description?: string;
  phone?: string;
  location?: string;
  education?: "high" | "secondary" | "graduation";
  fieldsOfInterest?: string[];
  skills?: string[];
  socialLinks?: Record<string, string>;
  followers?: string[] | number;
  following?: string[] | number;
  coursesEnrolledIn?: any[];
  role?: string;
}

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const { enrolledCourses, setEnrolledCourses } = useCourseStore();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(false);

  // Fetch user profile once on mount
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const profileData = await apiClient.get<UserProfile>(`/students/${user.username}`);
        setProfile(profileData);
      } catch (error) {
        console.error("Failed to fetch profile", error);
      }
    };

    fetchProfile();
  }, [user]);

  // Fetch enrolled courses with filter
  const fetchCourses = async (status?: string) => {
    if (!user) return;

    try {
      setCoursesLoading(true);
      const params = status && status !== "all" ? `?status=${status}` : "";
      const data = await apiClient.get<{
        enrolledCourses: any[];
      }>(`/dashboard/student${params}`);

      setEnrolledCourses(data.enrolledCourses || []);
    } catch (error) {
      console.error("Failed to fetch courses", error);
    } finally {
      setCoursesLoading(false);
      setLoading(false);
    }
  };

  // Initial fetch and fetch on tab change
  useEffect(() => {
    if (!user) return;
    fetchCourses(activeTab);
  }, [user, activeTab]);

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground page-transition">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-7xl pt-24 text-center">
          <p className="text-foreground/80">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const displayProfile = profile || user;
  const followersCount = Array.isArray(displayProfile.followers) 
    ? displayProfile.followers.length 
    : displayProfile.followers || 0;
  const followingCount = Array.isArray(displayProfile.following) 
    ? displayProfile.following.length 
    : displayProfile.following || 0;
  const coursesCount = displayProfile.coursesEnrolledIn?.length || enrolledCourses.length || 0;

  return (
    <div className="min-h-screen bg-background text-foreground page-transition">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-7xl pt-24">
        {/* Profile Section */}
        <Card className="p-3 mb-6 bg-gradient-to-br from-white/5 via-white/5 to-white/[0.02] backdrop-blur-xl border-border shadow-2xl">
          <div className="flex flex-col md:flex-row items-start gap-3">
            {/* Enhanced Avatar */}
            <div className="relative flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/50 via-purple-500/50 to-pink-500/50 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <Avatar className="h-14 w-14 md:h-16 md:w-16 border-2 border-foreground/30 shadow-lg relative z-10 ring-1 ring-white/10">
                  <AvatarImage 
                    src={displayProfile.avatar || displayProfile.googleGmailPhoto} 
                    className="object-cover w-full h-full"
                    loading="eager"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <AvatarFallback className="text-xl bg-gradient-to-br from-blue-500 to-purple-600 text-foregroundfont-bold">
                    {displayProfile.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
              {/* Status indicator */}
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-black shadow-md z-20"></div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 w-full space-y-2">
              {/* Header Section */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div>
                    <Label className="text-[10px] font-medium text-foreground/50 uppercase tracking-wider mb-0.5 block">Name</Label>
                    <h1 className="text-xl md:text-2xl font-bold text-foregroundtracking-tight">
                      {displayProfile.name}
                    </h1>
                  </div>
                  <div>
                    <Label className="text-[10px] font-medium text-foreground/50 uppercase tracking-wider mb-0.5 block">Username</Label>
                    <p className="text-sm text-foreground/70 font-medium">@{displayProfile.username}</p>
                  </div>
                  {displayProfile.description && (
                    <div>
                      <Label className="text-[10px] font-medium text-foreground/50 uppercase tracking-wider mb-0.5 block">Description</Label>
                      <p className="text-[11px] text-foreground/80 leading-snug">{displayProfile.description}</p>
                    </div>
                  )}
                </div>
                <Link to="/profile/edit">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-white/30 text-foregroundhover:bg-white/20 hover:border-white/40 transition-all shadow-lg hover:shadow-xl text-xs h-8"
                  >
                    <Edit className="h-3 w-3 mr-1.5" />
                    Edit
                  </Button>
                </Link>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-2">
                <Link to={`/users/${displayProfile.username}/followers`}>
                  <Card className="p-2 bg-card/50 border-border hover:bg-foreground/10 transition-all cursor-pointer group">
                    <div className="flex flex-col items-center text-center">
                      <Users className="h-3.5 w-3.5 text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-lg font-bold text-foreground">{followersCount}</span>
                      <span className="text-[10px] text-foreground/60 uppercase tracking-wider">Followers</span>
                    </div>
                  </Card>
                </Link>
                <Link to={`/users/${displayProfile.username}/following`}>
                  <Card className="p-2 bg-card/50 border-border hover:bg-foreground/10 transition-all cursor-pointer group">
                    <div className="flex flex-col items-center text-center">
                      <Users className="h-3.5 w-3.5 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-lg font-bold text-foreground">{followingCount}</span>
                      <span className="text-[10px] text-foreground/60 uppercase tracking-wider">Following</span>
                    </div>
                  </Card>
                </Link>
                <Card className="p-2 bg-card/50 border-border hover:bg-foreground/10 transition-all cursor-pointer group">
                  <div className="flex flex-col items-center text-center">
                    <BookOpen className="h-3.5 w-3.5 text-green-400 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-lg font-bold text-foreground">{coursesCount}</span>
                    <span className="text-[10px] text-foreground/60 uppercase tracking-wider">Courses</span>
                  </div>
                </Card>
              </div>

              {/* Contact Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {displayProfile.email && (
                  <Card className="p-2 bg-card/50 border-border hover:bg-foreground/10 transition-all group">
                    <Label className="text-[10px] font-medium text-foreground/50 uppercase tracking-wider mb-1 block">Email</Label>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                        <Mail className="h-3 w-3 text-blue-400" />
                      </div>
                      <span className="text-[11px] text-foreground/90 font-medium truncate">{displayProfile.email}</span>
                    </div>
                  </Card>
                )}
                {displayProfile.phone && (
                  <Card className="p-2 bg-card/50 border-border hover:bg-foreground/10 transition-all group">
                    <Label className="text-[10px] font-medium text-foreground/50 uppercase tracking-wider mb-1 block">Phone</Label>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                        <Phone className="h-3 w-3 text-green-400" />
                      </div>
                      <span className="text-[11px] text-foreground/90 font-medium">{displayProfile.phone}</span>
                    </div>
                  </Card>
                )}
                {displayProfile.location && (
                  <Card className="p-2 bg-card/50 border-border hover:bg-foreground/10 transition-all group">
                    <Label className="text-[10px] font-medium text-foreground/50 uppercase tracking-wider mb-1 block">Location</Label>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                        <MapPin className="h-3 w-3 text-purple-400" />
                      </div>
                      <span className="text-[11px] text-foreground/90 font-medium capitalize">{displayProfile.location}</span>
                    </div>
                  </Card>
                )}
                {displayProfile.education && (
                  <Card className="p-2 bg-card/50 border-border hover:bg-foreground/10 transition-all group">
                    <Label className="text-[10px] font-medium text-foreground/50 uppercase tracking-wider mb-1 block">Education</Label>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center group-hover:bg-yellow-500/30 transition-colors">
                        <GraduationCap className="h-3 w-3 text-yellow-400" />
                      </div>
                      <span className="text-[11px] text-foreground/90 font-medium capitalize">{displayProfile.education}</span>
                    </div>
                  </Card>
                )}
              </div>

              {/* Fields of Interest */}
              {displayProfile.fieldsOfInterest && displayProfile.fieldsOfInterest.length > 0 && (
                <div>
                  <Label className="text-[10px] font-medium text-foreground/50 uppercase tracking-wider mb-1.5 block">Fields of Interest</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {displayProfile.fieldsOfInterest.map((field, idx) => (
                      <Badge 
                        key={idx} 
                        className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-400/40 px-1.5 py-0.5 text-[10px] font-medium hover:from-blue-500/30 hover:to-cyan-500/30 transition-all cursor-default"
                      >
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {displayProfile.skills && displayProfile.skills.length > 0 && (
                <div>
                  <Label className="text-[10px] font-medium text-foreground/50 uppercase tracking-wider mb-1.5 block">Skills</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {displayProfile.skills.map((skill, idx) => (
                      <Badge 
                        key={idx} 
                        className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-green-400/40 px-1.5 py-0.5 text-[10px] font-medium hover:from-green-500/30 hover:to-emerald-500/30 transition-all cursor-default"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Links */}
              {displayProfile.socialLinks && Object.keys(displayProfile.socialLinks).length > 0 && (
                <div>
                  <Label className="text-[10px] font-medium text-foreground/50 uppercase tracking-wider mb-1.5 block">Social Links</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(displayProfile.socialLinks).map(([platform, url]) => {
                      const getIcon = () => {
                        switch (platform.toLowerCase()) {
                          case 'github':
                            return <Github className="h-3.5 w-3.5" />;
                          case 'linkedin':
                            return <Linkedin className="h-3.5 w-3.5" />;
                          case 'twitter':
                            return <Twitter className="h-3.5 w-3.5" />;
                          case 'instagram':
                            return <Instagram className="h-3.5 w-3.5" />;
                          case 'portfolio':
                            return <Globe className="h-3.5 w-3.5" />;
                          default:
                            return <LinkIcon className="h-3.5 w-3.5" />;
                        }
                      };
                      return (
                        <a
                          key={platform}
                          href={url as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-card/50 border border-border hover:bg-foreground/10 transition-all group"
                        >
                          <div className="text-foreground/70 group-hover:text-foregroundtransition-colors">
                            {getIcon()}
                          </div>
                          <span className="text-[10px] font-medium text-foreground/80 group-hover:text-foregroundcapitalize">
                            {platform}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Enrolled Courses */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">My Courses</h2>
            <Link to="/courses">
              <Button variant="outline" size="sm" className="border-border text-foregroundhover:bg-foreground/10">
                Browse All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="bg-card/50 border-border">
              <TabsTrigger value="all" className="text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background">
                All
              </TabsTrigger>
              <TabsTrigger value="enrolled" className="text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background">
                Only Enrolled
              </TabsTrigger>
              <TabsTrigger value="inprogress" className="text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background">
                In Progress
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background">
                Completed
              </TabsTrigger>
              <TabsTrigger value="failed" className="text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background">
                Failed
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {coursesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-foreground/80">Loading courses...</p>
              </div>
            </div>
          ) : enrolledCourses.length === 0 ? (
            <Card className="p-12 text-center bg-card/50 backdrop-blur-md border-border">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-foreground/60" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">No courses found</h3>
              <p className="text-foreground/80 mb-4">
                {activeTab === "all" 
                  ? "Start your learning journey by enrolling in a course"
                  : `No courses with status "${activeTab}" found`}
              </p>
              {activeTab !== "all" && (
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab("all")}
                  className="mr-2 border-border text-foregroundhover:bg-foreground/10"
                >
                  View All Courses
                </Button>
              )}
              <Link to="/courses">
                <Button className="bg-foreground text-background hover:bg-foreground/90 border-2 border-foreground">Browse Courses</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((course) => {
                  const getStatusBadge = () => {
                    const status = course.status || "inprogress";
                    if (status === "completed")
                      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
                    if (status === "failed")
                      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
                    if (status === "inprogress")
                      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Play className="h-3 w-3 mr-1" />In Progress</Badge>;
                    return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Enrolled</Badge>;
                  };

                  return (
                    <Card key={course.id || course.courseId} className="overflow-hidden bg-card/50 backdrop-blur-md border-border hover:border-border transition-all group flex flex-col">
                      <Link to={`/courses/${course.id || course.courseId}`} className="block">
                        <div className="aspect-video bg-gradient-to-br from-white/5 to-white/10 relative overflow-hidden">
                          {course.thumbnail ? (
                            <img
                              src={course.thumbnail}
                              alt={course.title || 'Course thumbnail'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="h-16 w-16 text-foreground/20" />
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="p-6 flex-1 flex flex-col">
                        <Link to={`/courses/${course.id || course.courseId}`} className="block flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-semibold line-clamp-2 text-foregroundgroup-hover:text-primary transition-colors flex-1">{course.title || 'Untitled Course'}</h3>
                          </div>
                          {course.instructor && (
                            <div className="flex items-center gap-2 mb-4">
                              <Avatar className="h-6 w-6 border border-border">
                                <AvatarImage src={course.instructor.avatar} />
                                <AvatarFallback className="bg-foreground/10 text-foregroundtext-xs">
                                  {course.instructor.name?.[0]?.toUpperCase() || 'I'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-foreground/60 truncate">{course.instructor.name || 'Unknown Instructor'}</span>
                            </div>
                          )}
                          <div className="mb-4">{getStatusBadge()}</div>
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-foreground/60">Progress</span>
                              <span className="font-medium text-foreground">{Math.round(course.progress || 0)}%</span>
                            </div>
                            <Progress value={course.progress || 0} className="h-2" />
                          </div>
                        </Link>
                        <div className="flex gap-2 mt-auto">
                          {course.status === "completed" && (
                            <Link 
                              to={`/courses/${course.id || course.courseId}/assessment`}
                              className="flex-1"
                            >
                              <Button 
                                size="sm"
                                className="w-full bg-green-500 hover:bg-green-600 text-foreground"
                              >
                                Take Assessment
                              </Button>
                            </Link>
                          )}
                          {(course.status === "inprogress" || !course.status) && (
                            <Link 
                              to={`/courses/${course.id || course.courseId}/learn`}
                              className="flex-1"
                            >
                              <Button 
                                size="sm"
                                className="w-full bg-primary hover:bg-primary/90 text-foreground"
                              >
                                Continue Learning
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

