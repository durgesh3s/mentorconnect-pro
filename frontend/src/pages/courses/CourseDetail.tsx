import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
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
import { formatPrice, calculateSubscriptionPrices } from "@/lib/utils";

interface Review {
  _id: string;
  author: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
    googleGmailPhoto?: string;
  };
  rating: number;
  content?: string;
  createdAt: string;
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentCourse, setCurrentCourse } = useCourseStore();
  const { user } = useAuthStore();

  // Curriculum pagination state
  const [curriculumPage, setCurriculumPage] = useState(1);
  const [curriculumPagination, setCurriculumPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [curriculumVideos, setCurriculumVideos] = useState<any[]>([]);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);

  // Reviews state
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsPagination, setReviewsPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [titleExpanded, setTitleExpanded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchCourse = async () => {
      try {
        const courseData = await apiClient.get<any>(`/courses/${id}`);
        
        // Transform backend course structure to frontend format
        const transformedCourse = {
          id: courseData._id || courseData.id,
          title: courseData.title,
          description: courseData.description,
          instructor: {
            id: courseData.createdBy?._id || courseData.createdBy?.id || '',
            name: courseData.instructor || courseData.createdBy?.name || 'Unknown',
            avatar: courseData.createdBy?.avatar || courseData.createdBy?.googleGmailPhoto,
          },
          thumbnail: courseData.thumbnail || courseData.thumbnailUrl,
          price: courseData.isFree 
            ? { monthly: 0, quarterly: 0, annual: 0 }
            : calculateSubscriptionPrices(courseData.price || 0),
          category: courseData.category,
          difficulty: courseData.level || courseData.difficulty,
          rating: courseData.averageRating || 0,
          reviewCount: courseData.reviewCount || 0,
          studentCount: courseData.enrollmentsCount || 0,
          enrolled: courseData.isEnrolled || false,
          progress: courseData.enrollment?.progress || 0,
          status: courseData.enrollment?.status || undefined,
        };
        
        setCurrentCourse(transformedCourse);
      } catch (error) {
        console.error("Failed to fetch course", error);
      }
    };

    fetchCourse();
  }, [id, setCurrentCourse]);

  // Fetch curriculum with pagination
  useEffect(() => {
    if (!id) return;

    const fetchCurriculum = async () => {
      setLoadingCurriculum(true);
      try {
        const response = await apiClient.get<any>(`/courses/${id}/curriculum?page=${curriculumPage}&limit=${curriculumPagination.limit}`);
        setCurriculumVideos(response.videos || []);
        setCurriculumPagination(response.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
      } catch (error) {
        console.error("Failed to fetch curriculum", error);
      } finally {
        setLoadingCurriculum(false);
      }
    };

    fetchCurriculum();
  }, [id, curriculumPage, curriculumPagination.limit]);

  // Fetch reviews with pagination
  useEffect(() => {
    if (!id) return;

    const fetchReviews = async () => {
      setLoadingReviews(true);
      try {
        const response = await apiClient.get<any>(`/courses/${id}/reviews?page=${reviewsPage}&limit=${reviewsPagination.limit}`);
        setReviews(response.reviews || []);
        setReviewsPagination(response.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
        
        // Check if current user has a review
        if (user?._id) {
          const userRev = response.reviews.find((r: Review) => r.author._id === user._id);
          if (userRev) {
            setUserReview(userRev);
            setReviewRating(userRev.rating);
            setReviewContent(userRev.content || "");
          }
        }
      } catch (error) {
        console.error("Failed to fetch reviews", error);
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [id, reviewsPage, reviewsPagination.limit, user]);

  // Submit review
  const handleSubmitReview = async () => {
    if (!id) return;
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) return;

    setSubmittingReview(true);
    try {
      const response = await apiClient.post<any>(`/courses/${id}/reviews`, {
        rating: reviewRating,
        content: reviewContent,
      });
      
      // Refresh reviews - always fetch page 1 after submitting (newest review will be there)
      const reviewsResponse = await apiClient.get<any>(`/courses/${id}/reviews?page=1&limit=${reviewsPagination.limit}`);
      setReviews(reviewsResponse.reviews || []);
      setReviewsPagination(reviewsResponse.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
      setReviewsPage(1); // Reset to page 1 to show the newly submitted review
      
      // Update user review (should be on page 1 since it's the newest)
      if (user?._id) {
        const userRev = reviewsResponse.reviews.find((r: Review) => r.author._id === user._id);
        if (userRev) {
          setUserReview(userRev);
          setReviewRating(userRev.rating);
          setReviewContent(userRev.content || "");
        }
      }

      // Refresh course to update rating and review count
      const courseData = await apiClient.get<any>(`/courses/${id}`);
      
      // Transform backend course structure to frontend format (same as in useEffect)
      const transformedCourse = {
        id: courseData._id || courseData.id,
        title: courseData.title,
        description: courseData.description,
        instructor: {
          id: courseData.createdBy?._id || courseData.createdBy?.id || '',
          name: courseData.instructor || courseData.createdBy?.name || 'Unknown',
          avatar: courseData.createdBy?.avatar || courseData.createdBy?.googleGmailPhoto,
        },
        thumbnail: courseData.thumbnail || courseData.thumbnailUrl,
        price: courseData.isFree 
          ? { monthly: 0, quarterly: 0, annual: 0 }
          : calculateSubscriptionPrices(courseData.price || 0),
        category: courseData.category,
        difficulty: courseData.level || courseData.difficulty,
        rating: courseData.averageRating || 0,
        reviewCount: courseData.reviewCount || 0,
        studentCount: courseData.enrollmentsCount || 0,
        enrolled: courseData.isEnrolled || false,
        progress: courseData.enrollment?.progress || 0,
        status: courseData.enrollment?.status || undefined,
      };
      
      setCurrentCourse(transformedCourse);

      setShowReviewForm(false);
    } catch (error: any) {
      console.error("Failed to submit review", error);
      alert(error.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!currentCourse) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-foreground/80">Loading course...</p>
        </div>
      </div>
    );
  }

  const isEnrolled = currentCourse.enrolled;
  const progress = currentCourse.progress || 0;
  
  // Constants for truncation
  const TITLE_MAX_LENGTH = 100;
  const DESCRIPTION_MAX_LENGTH = 200;
  const title = currentCourse.title || '';
  const description = currentCourse.description || '';
  const titleTooLong = title.length > TITLE_MAX_LENGTH;
  const descriptionTooLong = description.length > DESCRIPTION_MAX_LENGTH;

  return (
    <div className="min-h-screen bg-background text-foreground page-transition">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-7xl pt-24">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:h-full min-h-[400px] md:min-h-0 bg-card/50 rounded-lg overflow-hidden border border-border">
              {currentCourse.thumbnail ? (
                <img
                  src={currentCourse.thumbnail}
                  alt={currentCourse.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="h-16 w-16 text-foreground/20" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="space-y-3 flex-1">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="bg-foreground/10 text-foregroundborder-border">{currentCourse.category}</Badge>
                    <Badge className="bg-foreground/10 text-foregroundborder-border">{currentCourse.difficulty}</Badge>
                  </div>
                  <div className="mb-2">
                    <h1 className={`text-3xl md:text-4xl font-bold text-foregroundleading-tight ${titleExpanded ? '' : 'line-clamp-2'}`}>
                      {title}
                    </h1>
                    {titleTooLong && (
                      <button
                        onClick={() => setTitleExpanded(!titleExpanded)}
                        className="mt-1 text-sm text-foreground/60 hover:text-foreground/80 flex items-center gap-1 transition-colors"
                      >
                        {titleExpanded ? (
                          <>
                            <span>Show less</span>
                            <ChevronUp className="h-3 w-3" />
                          </>
                        ) : (
                          <>
                            <span>Show more</span>
                            <ChevronDown className="h-3 w-3" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div>
                    <p className={`text-base text-foreground/70 ${descriptionExpanded ? '' : 'line-clamp-2'}`}>
                      {description}
                    </p>
                    {descriptionTooLong && (
                      <button
                        onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                        className="mt-1 text-sm text-foreground/60 hover:text-foreground/80 flex items-center gap-1 transition-colors"
                      >
                        {descriptionExpanded ? (
                          <>
                            <span>Show less</span>
                            <ChevronUp className="h-3 w-3" />
                          </>
                        ) : (
                          <>
                            <span>Read more</span>
                            <ChevronDown className="h-3 w-3" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={currentCourse.instructor?.avatar} />
                    <AvatarFallback className="bg-foreground/10 text-foreground">{currentCourse.instructor?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foregroundtext-sm">{currentCourse.instructor?.name}</p>
                    <p className="text-xs text-foreground/60">Instructor</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium text-foreground">{currentCourse.rating}</span>
                    <span className="text-foreground/60">({currentCourse.reviewCount})</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground/60">
                    <Users className="h-4 w-4" />
                    <span>{currentCourse.studentCount} students</span>
                  </div>
                </div>
              </div>

              {isEnrolled ? (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-foreground">Your Progress</span>
                      <span className="text-base font-bold text-foreground">{progress}%</span>
                    </div>
                    <Progress 
                      value={progress} 
                      className="h-2"
                    />
                  </div>
                  <Link to={`/courses/${id}/learn`} className="block">
                    <Button 
                      className="w-full bg-foreground text-background hover:bg-white/95 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 h-11" 
                    >
                      Continue Learning
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-2xl font-bold mb-2 text-foreground">
                      ₹{formatPrice(currentCourse.price?.monthly || 0)}/month
                    </p>
                    {currentCourse.price?.quarterly && (
                      <p className="text-sm text-foreground/60">
                        Or ₹{formatPrice(currentCourse.price.quarterly)}/quarter (Save 10%)
                      </p>
                    )}
                  </div>
                  <Link to={`/courses/${id}/subscribe`}>
                    <Button className="w-full bg-foreground text-background hover:bg-foreground/90 border-2 border-foreground" size="lg">
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
            <Card className="p-6 bg-card/50 backdrop-blur-md border-border">
              {loadingCurriculum ? (
                <div className="text-center py-12">
                  <p className="text-foreground/60">Loading curriculum...</p>
                </div>
              ) : curriculumVideos.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <BookOpen className="h-5 w-5 text-foreground" />
                    <h3 className="font-semibold text-lg text-foreground">Course Content</h3>
                    <span className="text-sm text-foreground/60 ml-auto">
                      {curriculumPagination.total} {curriculumPagination.total === 1 ? 'lesson' : 'lessons'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {curriculumVideos.map((video: any, index: number) => (
                      <div
                        key={video.videoId || index}
                        className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-card/50 transition-colors"
                      >
                        {video.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-foreground/40 flex items-center justify-center flex-shrink-0">
                            <Play className="h-3 w-3 text-foreground/60 ml-0.5" />
                          </div>
                        )}
                        <span className="flex-1 text-foreground/80">
                          {(curriculumPage - 1) * curriculumPagination.limit + index + 1}. {video.title}
                        </span>
                        {video.duration && (
                          <span className="text-foreground/60 flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {Math.round(video.duration / 60)} min
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Curriculum Pagination */}
                  {curriculumPagination.pages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
                      <div className="text-sm text-foreground/60">
                        Page {curriculumPagination.page} of {curriculumPagination.pages}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurriculumPage((p) => Math.max(1, p - 1))}
                          disabled={curriculumPage === 1}
                          className="border-border text-foregroundhover:bg-foreground/10"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurriculumPage((p) => Math.min(curriculumPagination.pages, p + 1))}
                          disabled={curriculumPage >= curriculumPagination.pages}
                          className="border-border text-foregroundhover:bg-foreground/10"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-foreground/20 mx-auto mb-4" />
                  <p className="text-foreground/60 text-lg mb-2">No curriculum available</p>
                  <p className="text-foreground/40 text-sm">Course content will be available soon</p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <Card className="p-6 bg-card/50 backdrop-blur-md border-border">
              <div className="space-y-6">
                {/* Reviews Summary */}
                <div className="flex items-center justify-between pb-6 border-b border-border">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-foregroundmb-1">
                      {currentCourse.rating > 0 ? currentCourse.rating.toFixed(1) : '0.0'}
                    </div>
                    <div className="flex items-center gap-1 justify-center mb-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            star <= Math.round(currentCourse.rating)
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-foreground/20'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-foreground/60">
                      Based on {currentCourse.reviewCount} {currentCourse.reviewCount === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                  {isEnrolled && !showReviewForm && (
                    <Button
                      onClick={() => setShowReviewForm(true)}
                      className="bg-foreground text-background hover:bg-foreground/90"
                    >
                      {userReview ? 'Edit Review' : 'Write a Review'}
                    </Button>
                  )}
                </div>

                {/* Review Form */}
                {showReviewForm && isEnrolled && (
                  <Card className="p-6 bg-card/50 border-border">
                    <h3 className="text-lg font-semibold text-foregroundmb-4">
                      {userReview ? 'Edit Your Review' : 'Write a Review'}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-foreground/80 mb-2 block">Rating</label>
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className="focus:outline-none"
                            >
                              <Star
                                className={`h-8 w-8 cursor-pointer transition-colors ${
                                  star <= reviewRating
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : 'text-foreground/20 hover:text-yellow-500/50'
                                }`}
                              />
                            </button>
                          ))}
                          <span className="text-foreground/60 text-sm ml-2">{reviewRating} / 5</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-foreground/80 mb-2 block">Review (optional)</label>
                        <Textarea
                          value={reviewContent}
                          onChange={(e) => setReviewContent(e.target.value)}
                          placeholder="Share your thoughts about this course..."
                          className="bg-black/50 border-border text-foreground placeholder:text-foreground/40 min-h-[120px]"
                          maxLength={2000}
                        />
                        <p className="text-xs text-foreground/40 mt-1">{reviewContent.length} / 2000</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleSubmitReview}
                          disabled={submittingReview || !reviewRating}
                          className="bg-foreground text-background hover:bg-foreground/90"
                        >
                          {submittingReview ? 'Submitting...' : userReview ? 'Update Review' : 'Submit Review'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowReviewForm(false);
                            if (userReview) {
                              setReviewRating(userReview.rating);
                              setReviewContent(userReview.content || "");
                            } else {
                              setReviewRating(5);
                              setReviewContent("");
                            }
                          }}
                          className="border-border text-foregroundhover:bg-foreground/10"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Reviews List */}
                {loadingReviews ? (
                  <div className="text-center py-8">
                    <p className="text-foreground/60">Loading reviews...</p>
                  </div>
                ) : reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review._id} className="pb-4 border-b border-border last:border-0 last:pb-0">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={review.author.avatar || review.author.googleGmailPhoto} />
                            <AvatarFallback className="bg-foreground/10 text-foreground">
                              {review.author.name?.[0] || review.author.username?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-foreground">
                                {review.author.name || review.author.username || 'Anonymous'}
                              </p>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= review.rating
                                        ? 'text-yellow-500 fill-yellow-500'
                                        : 'text-foreground/20'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-foreground/40">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {review.content && (
                              <p className="text-foreground/80 text-sm mt-2">{review.content}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Reviews Pagination */}
                    {reviewsPagination.pages > 1 && (
                      <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
                        <div className="text-sm text-foreground/60">
                          Page {reviewsPagination.page} of {reviewsPagination.pages}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReviewsPage((p) => Math.max(1, p - 1))}
                            disabled={reviewsPage === 1}
                            className="border-border text-foregroundhover:bg-foreground/10"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReviewsPage((p) => Math.min(reviewsPagination.pages, p + 1))}
                            disabled={reviewsPage >= reviewsPagination.pages}
                            className="border-border text-foregroundhover:bg-foreground/10"
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-foreground/20 mx-auto mb-4" />
                    <p className="text-foreground/60 mb-2">No reviews yet</p>
                    <p className="text-foreground/40 text-sm">
                      {isEnrolled
                        ? 'Be the first to review this course'
                        : 'Enroll to leave a review'}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

