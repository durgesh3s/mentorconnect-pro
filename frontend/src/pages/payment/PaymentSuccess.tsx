import { useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Navigation } from "@/components/ui/navigation";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const courseId = searchParams.get("courseId");

  return (
    <div className="min-h-screen bg-background text-foreground page-transition">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-2xl pt-24">
        <Card className="p-12 text-center bg-card/50 backdrop-blur-md border-border">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-foreground/10 border border-border flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-4 text-foreground">Payment Successful!</h1>
          <p className="text-lg text-foreground/80 mb-8">
            Your subscription has been activated. You now have full access to the course.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {courseId ? (
              <Link to={`/courses/${courseId}/learn`}>
                <Button className="bg-foreground text-background hover:bg-foreground/90 border-2 border-foreground" size="lg">
                  Start Learning
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <Link to="/courses">
                <Button className="bg-foreground text-background hover:bg-foreground/90 border-2 border-foreground" size="lg">
                  Browse Courses
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            )}
            <Link to="/dashboard/student">
              <Button variant="outline" size="lg" className="border-border text-foregroundhover:bg-foreground/10">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

