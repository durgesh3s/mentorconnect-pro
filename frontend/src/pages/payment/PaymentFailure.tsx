import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, Mail } from "lucide-react";
import { Navigation } from "@/components/ui/navigation";

export default function PaymentFailure() {
  return (
    <div className="min-h-screen bg-black text-white page-transition">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-2xl pt-24">
        <Card className="p-12 text-center bg-white/5 backdrop-blur-md border-white/10">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-destructive/20 border border-destructive/50 flex items-center justify-center">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-4 text-white">Payment Failed</h1>
          <p className="text-lg text-white/80 mb-8">
            We couldn't process your payment. Please try again or contact support if the problem
            persists.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-white text-black hover:bg-white/90 border-2 border-white" size="lg" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10" asChild>
              <a href="mailto:support@codementorpro.com">
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </a>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

