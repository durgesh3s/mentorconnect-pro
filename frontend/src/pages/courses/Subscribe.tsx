import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCourseStore } from "@/lib/stores/courseStore";
import { usePaymentStore } from "@/lib/stores/paymentStore";
import { apiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Navigation } from "@/components/ui/navigation";

export default function Subscribe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentCourse, setCurrentCourse } = useCourseStore();
  const { addSubscription } = usePaymentStore();

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

  const handleSubscribe = async (plan: "monthly" | "quarterly" | "annual") => {
    if (!currentCourse || !id) return;

    try {
      // Initialize payment
      const paymentData = await apiClient.post<{ orderId: string; amount: number }>(
        `/courses/${id}/subscribe`,
        { plan }
      );

      // Initialize Razorpay/Stripe
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY,
        amount: paymentData.amount,
        currency: "INR",
        name: "CodeMentor Pro",
        description: `Subscription for ${currentCourse.title}`,
        order_id: paymentData.orderId,
        handler: async (response: any) => {
          try {
            await apiClient.post(`/payment/verify`, {
              orderId: paymentData.orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            toast.success("Subscription successful!");
            navigate(`/payment/success?courseId=${id}`);
          } catch (error) {
            toast.error("Payment verification failed");
            navigate(`/payment/failure`);
          }
        },
        prefill: {
          name: "User Name",
          email: "user@example.com",
        },
        theme: {
          color: "#7B61FF", // CRED Purple
        },
      };

      // @ts-ignore
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      toast.error("Failed to initialize payment");
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

  const plans = [
    {
      id: "monthly",
      name: "Monthly",
      price: currentCourse.price.monthly,
      period: "month",
      savings: 0,
    },
    {
      id: "quarterly",
      name: "Quarterly",
      price: currentCourse.price.quarterly,
      period: "3 months",
      savings: 10,
      popular: true,
    },
    {
      id: "annual",
      name: "Annual",
      price: currentCourse.price.annual || currentCourse.price.monthly * 10,
      period: "year",
      savings: 20,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white page-transition">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-5xl pt-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-lg text-muted-foreground">{currentCourse.title}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-8 relative ${plan.popular ? "border-2 border-primary" : ""}`}
            >
              {plan.popular && (
                <Badge className="absolute top-4 right-4 gradient-bg">Most Popular</Badge>
              )}
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <div className="mb-2">
                  <span className="text-4xl font-bold">₹{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
                {plan.savings > 0 && (
                  <p className="text-sm text-success">Save {plan.savings}%</p>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-success" />
                  <span>Full course access</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-success" />
                  <span>All modules & lessons</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-success" />
                  <span>Assignments & projects</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-success" />
                  <span>Certificate on completion</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-success" />
                  <span>Instructor support</span>
                </li>
                {plan.id === "quarterly" || plan.id === "annual" ? (
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span>Priority internship consideration</span>
                  </li>
                ) : null}
              </ul>

              <Button
                className={`w-full ${plan.popular ? "gradient-bg" : ""}`}
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handleSubscribe(plan.id as any)}
              >
                Subscribe Now
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

