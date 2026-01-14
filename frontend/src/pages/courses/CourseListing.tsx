import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCourseStore } from "@/lib/stores/courseStore";
import { apiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Grid, List, Filter } from "lucide-react";
import { Navigation } from "@/components/ui/navigation";
import { formatPrice, calculateSubscriptionPrices } from "@/lib/utils";

export default function CourseListing() {
  const { courses, setCourses } = useCourseStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("popularity");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get<any>("/courses", {
          params: { category, difficulty, sortBy, search: searchQuery },
        });
        
        // Extract courses array from response
        const coursesData = response.courses || response || [];
        
        // Transform backend course structure to frontend format
        const transformedCourses = coursesData.map((course: any) => ({
          id: course._id || course.id,
          title: course.title,
          description: course.description,
          instructor: {
            id: course.createdBy?._id || course.createdBy?.id || '',
            name: course.instructor || course.createdBy?.name || 'Unknown',
            avatar: course.createdBy?.avatar || course.createdBy?.googleGmailPhoto,
          },
          thumbnail: course.thumbnail || course.thumbnailUrl,
          price: course.isFree 
            ? { monthly: 0, quarterly: 0, annual: 0 }
            : calculateSubscriptionPrices(course.price || 0),
          category: course.category,
          difficulty: course.level || course.difficulty,
          rating: course.averageRating || 0,
          reviewCount: course.reviewCount || 0,
          studentCount: course.enrollmentsCount || 0,
          modules: [],
          enrolled: course.isEnrolled || false,
          progress: course.enrollment?.progress || 0,
          status: course.enrollment?.status || undefined,
        }));
        
        setCourses(transformedCourses);
      } catch (error) {
        console.error("Failed to fetch courses", error);
        setCourses([]); // Set empty array on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, [category, difficulty, sortBy, searchQuery, setCourses]);

  return (
    <div className="min-h-screen bg-black text-white page-transition">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-7xl pt-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">Browse Courses</h1>
          <p className="text-white/80">Find the perfect course for your learning journey</p>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="react">React</SelectItem>
                <SelectItem value="nextjs">Next.js</SelectItem>
                <SelectItem value="dsa">Data Structures</SelectItem>
              </SelectContent>
            </Select>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popularity">Popularity</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Courses Grid/List */}
        {isLoading ? (
          viewMode === "grid" ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden bg-white/5 backdrop-blur-md border-white/10">
                  <Skeleton className="aspect-video w-full bg-white/10" />
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <Skeleton className="h-5 w-20 bg-white/10" />
                      <Skeleton className="h-5 w-16 bg-white/10" />
                    </div>
                    <Skeleton className="h-6 w-full mb-4 bg-white/10" />
                    <Skeleton className="h-4 w-3/4 bg-white/10" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="bg-white/5 backdrop-blur-md border-white/10">
                  <div className="flex gap-6 p-6">
                    <Skeleton className="w-64 aspect-video rounded-lg bg-white/10" />
                    <div className="flex-1 space-y-4">
                      <Skeleton className="h-6 w-3/4 bg-white/10" />
                      <Skeleton className="h-4 w-full bg-white/10" />
                      <Skeleton className="h-4 w-2/3 bg-white/10" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : !courses || courses.length === 0 ? (
          <Card className="p-12 text-center bg-white/5 backdrop-blur-md border-white/10">
            <p className="text-white/80">No courses found. Try adjusting your filters.</p>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="overflow-hidden cred-hover bg-white/5 backdrop-blur-md border-white/10">
                <Link to={`/courses/${course.id}`}>
                  <div className="aspect-video bg-white/5 relative">
                    {course.thumbnail && (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary" className="bg-white/10 text-white border-white/20">{course.category}</Badge>
                      <Badge className="bg-white/10 text-white border-white/20">{course.difficulty}</Badge>
                    </div>
                    <h3 className="font-semibold mb-2 line-clamp-2 text-white">{course.title}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={course.instructor?.avatar} />
                        <AvatarFallback className="bg-white/10 text-white text-xs">{course.instructor?.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-white/60">{course.instructor?.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-white">₹{formatPrice(course.price.monthly)}/mo</span>
                        <span className="text-sm text-white/60 ml-2">
                          {course.rating} ⭐ ({course.reviewCount})
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <Card key={course.id} className="cred-hover bg-white/5 backdrop-blur-md border-white/10">
                <Link to={`/courses/${course.id}`}>
                  <div className="flex gap-6 p-6">
                    <div className="w-64 aspect-video bg-white/5 rounded-lg flex-shrink-0">
                      {course.thumbnail && (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="bg-white/10 text-white border-white/20">{course.category}</Badge>
                            <Badge className="bg-white/10 text-white border-white/20">{course.difficulty}</Badge>
                          </div>
                          <h3 className="text-xl font-semibold mb-2 text-white">{course.title}</h3>
                          <p className="text-white/70 line-clamp-2">{course.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={course.instructor?.avatar} />
                              <AvatarFallback className="bg-white/10 text-white text-xs">{course.instructor?.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-white/60">
                              {course.instructor?.name}
                            </span>
                          </div>
                          <span className="text-sm text-white/60">
                            {course.studentCount} students
                          </span>
                          <span className="text-sm text-white/60">
                            {course.rating} ⭐ ({course.reviewCount})
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-white">₹{formatPrice(course.price.monthly)}/mo</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

