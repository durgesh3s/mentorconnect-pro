import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCourseStore } from "@/lib/stores/courseStore";
import { usePaymentStore } from "@/lib/stores/paymentStore";
import { useAuthStore } from "@/lib/stores/authStore";
import { apiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Navigation } from "@/components/ui/navigation";
import { cn, formatPrice, calculateSubscriptionPrices } from "@/lib/utils";

type PlanType = "monthly" | "quarterly" | "annual";

interface Plan {
  id: PlanType;
  name: string;
  price: number;
  period: string;
  savings: number;
  popular?: boolean;
  features: string[];
}

export default function Subscribe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentCourse, setCurrentCourse } = useCourseStore();
  const { addSubscription } = usePaymentStore();
  const { user } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
          modules: courseData.modules || [],
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

  const handlePlanSelect = (planId: PlanType) => {
    setSelectedPlan(planId);
  };

  const handleSubscribe = async () => {
    if (!currentCourse || !id || !selectedPlan) {
      toast.error("Please select a plan");
      return;
    }

    setIsProcessing(true);

    try {
      // Initialize payment
      const paymentData = await apiClient.post<{ 
        orderId: string | null; 
        amount: number;
        message: string;
      }>(
        `/courses/${id}/subscribe`,
        { plan: selectedPlan }
      );

      // If free course, handle directly
      if (paymentData.amount === 0 || !paymentData.orderId) {
        toast.success(paymentData.message || "Successfully enrolled!");
        navigate(`/courses/${id}/learn`);
        return;
      }

      // Check if Razorpay is available
      if (typeof window === 'undefined' || !(window as any).Razorpay) {
        toast.error("Payment gateway not available. Please refresh the page.");
        setIsProcessing(false);
        return;
      }

      // Get Razorpay key from environment
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY;
      if (!razorpayKey) {
        toast.error("Payment gateway configuration missing");
        setIsProcessing(false);
        return;
      }

      // Initialize Razorpay
      const options = {
        key: razorpayKey,
        amount: paymentData.amount, // Amount is already in paise
        currency: paymentData.currency || "INR",
        name: "Mentorise",
        description: `Subscription for ${currentCourse.title}`,
        order_id: paymentData.orderId, // Razorpay order ID from backend
        handler: async (response: any) => {
          try {
            // Verify payment with backend
            await apiClient.post(`/courses/${id}/verify-payment`, {
              orderId: paymentData.orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              plan: selectedPlan,
            });

            toast.success("Subscription successful!");
            navigate(`/courses/${id}/learn`);
          } catch (error: any) {
            console.error("Payment verification error:", error);
            toast.error(error?.response?.data?.message || "Payment verification failed");
            navigate(`/courses/${id}`);
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: user?.name || user?.username || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: {
          color: "#7B61FF",
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      // @ts-ignore - Razorpay is loaded via script tag
      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', (response: any) => {
        console.error("Payment failed:", response);
        toast.error("Payment failed. Please try again.");
        setIsProcessing(false);
      });
      razorpay.open();
    } catch (error: any) {
      console.error("Subscribe error:", error);
      toast.error(error?.response?.data?.message || "Failed to initialize payment");
      setIsProcessing(false);
    }
  };

  if (!currentCourse) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Calculate dynamic pricing and savings with useMemo
  const plans = useMemo<Plan[]>(() => {
    if (!currentCourse) return [];

    const monthlyPrice = currentCourse.price?.monthly || 0;
    const quarterlyPrice = currentCourse.price?.quarterly || 0;
    const annualPrice = currentCourse.price?.annual || 0;
    
    // Calculate savings percentages dynamically
    const quarterlySavings = monthlyPrice > 0 
      ? Math.round(((monthlyPrice * 3 - quarterlyPrice) / (monthlyPrice * 3)) * 100)
      : 0;
    const annualSavings = monthlyPrice > 0
      ? Math.round(((monthlyPrice * 12 - annualPrice) / (monthlyPrice * 12)) * 100)
      : 0;

    // Base features for all plans
    const baseFeatures = [
      "Full course access",
      "All modules & lessons",
      "Assignments & projects",
      "Certificate on completion",
      "Instructor support",
    ];

    // Dynamic features based on plan
    return [
      {
        id: "monthly" as PlanType,
        name: "Monthly",
        price: monthlyPrice,
        period: "month",
        savings: 0,
        features: baseFeatures,
      },
      {
        id: "quarterly" as PlanType,
        name: "Quarterly",
        price: quarterlyPrice,
        period: "3 months",
        savings: quarterlySavings,
        popular: true,
        features: [
          ...baseFeatures,
          "Priority internship consideration",
        ],
      },
      {
        id: "annual" as PlanType,
        name: "Annual",
        price: annualPrice,
        period: "year",
        savings: annualSavings,
        features: [
          ...baseFeatures,
          "Priority internship consideration",
          "Early access to new courses",
        ],
      },
    ];
  }, [currentCourse]);

  // Set default selected plan to popular one or first plan
  useEffect(() => {
    if (!selectedPlan && plans.length > 0) {
      const popularPlan = plans.find(p => p.popular);
      setSelectedPlan(popularPlan?.id || plans[0].id);
    }
  }, [plans, selectedPlan]);

  return (
    <div className="min-h-screen bg-background text-foreground page-transition">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-5xl pt-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-lg text-muted-foreground">{currentCourse.title}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <Card
                key={plan.id}
                className={cn(
                  "p-8 relative cursor-pointer transition-all duration-200",
                  "hover:scale-105 hover:shadow-lg",
                  isSelected 
                    ? "border-2 border-primary bg-primary/5 shadow-lg scale-105" 
                    : "border border-border bg-card/50",
                  plan.popular && !isSelected && "border-primary/50"
                )}
                onClick={() => handlePlanSelect(plan.id)}
              >
                {plan.popular && (
                  <Badge className="absolute top-4 right-4 gradient-bg">Most Popular</Badge>
                )}
                {isSelected && (
                  <div className="absolute top-4 left-4">
                    <CheckCircle2 className="h-6 w-6 text-primary fill-primary" />
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold">₹{formatPrice(plan.price)}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                  {plan.savings > 0 && (
                    <p className="text-sm text-green-500 font-medium">Save {plan.savings}%</p>
                  )}
                  {plan.price === 0 && (
                    <p className="text-sm text-green-500 font-medium">Free</p>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={cn(
                    "w-full",
                    isSelected && "gradient-bg"
                  )}
                  variant={isSelected ? "default" : "outline"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlanSelect(plan.id);
                  }}
                >
                  {isSelected ? "Selected" : "Select Plan"}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Continue Button */}
        {selectedPlan && (
          <div className="text-center">
            <Button
              className="px-12 py-6 text-lg gradient-bg"
              size="lg"
              onClick={handleSubscribe}
              disabled={isProcessing}
            >
              {isProcessing 
                ? "Processing..." 
                : currentCourse.price?.monthly === 0 
                  ? `Enroll for Free`
                  : `Continue with ${plans.find(p => p.id === selectedPlan)?.name} Plan`}
            </Button>
            {currentCourse.price?.monthly === 0 ? (
              <p className="text-sm text-muted-foreground mt-4">
                This is a free course. You'll be enrolled immediately.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-4">
                You will be redirected to secure payment gateway
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

