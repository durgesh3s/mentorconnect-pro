import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Sparkles, CheckCircle2, ArrowRight, Star } from "lucide-react";

interface CourseCompletionCelebrationProps {
  courseId: string;
  courseTitle?: string;
  onClose?: () => void;
}

export function CourseCompletionCelebration({
  courseId,
  courseTitle,
  onClose,
}: CourseCompletionCelebrationProps) {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Hide confetti after animation
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleTakeAssessment = () => {
    if (onClose) onClose();
    navigate(`/courses/${courseId}/assessment`);
  };

  const handleGoToDashboard = () => {
    if (onClose) onClose();
    navigate("/dashboard");
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: [
                    "#FFFFFF",
                    "#E0E0E0",
                    "#B0B0B0",
                    "#808080",
                    "#FFFFFF",
                  ][Math.floor(Math.random() * 5)],
                }}
                initial={{ y: -100, opacity: 1, rotate: 0 }}
                animate={{
                  y: window.innerHeight + 100,
                  opacity: [1, 1, 0],
                  rotate: 360,
                  x: (Math.random() - 0.5) * 200,
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  delay: Math.random() * 0.5,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>
        )}

        {/* Main Celebration Card */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative z-10"
        >
          <Card className="bg-black/95 backdrop-blur-xl border-2 border-white/20 shadow-2xl p-8 max-w-2xl w-full mx-4">
            {/* Sparkle Icons */}
            <div className="absolute top-4 right-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-8 w-8 text-primary" />
              </motion.div>
            </div>
            <div className="absolute top-4 left-4">
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              >
                <Star className="h-6 w-6 text-primary/80" />
              </motion.div>
            </div>

            {/* Content */}
            <div className="text-center space-y-6">
              {/* Trophy Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 10,
                  delay: 0.2,
                }}
                className="flex justify-center"
              >
                <div className="relative">
                  <Trophy className="h-24 w-24 text-primary drop-shadow-lg" />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0"
                  >
                    <div className="h-24 w-24 rounded-full bg-primary/20 blur-xl" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                  🎉 Congratulations! 🎉
                </h1>
                <p className="text-xl md:text-2xl text-white/90 font-semibold">
                  You've Completed the Course!
                </p>
                {courseTitle && (
                  <p className="text-lg text-white/70 mt-2">{courseTitle}</p>
                )}
              </motion.div>

              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 10,
                  delay: 0.6,
                }}
                className="flex justify-center"
              >
                <div className="relative">
                  <CheckCircle2 className="h-16 w-16 text-primary" />
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0"
                  >
                    <div className="h-16 w-16 rounded-full bg-primary/30 blur-lg" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Message */}
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-white/80 text-lg leading-relaxed"
              >
                You've successfully completed all the lessons! Your dedication and
                hard work have paid off. Now it's time to test your knowledge.
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
              >
                <Button
                  onClick={handleTakeAssessment}
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                  Take Assessment
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  onClick={handleGoToDashboard}
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/30 text-white hover:bg-white/10 font-semibold text-lg px-8 py-6 backdrop-blur-sm"
                >
                  Go to Dashboard
                </Button>
              </motion.div>

              {/* Info Text */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="text-white/60 text-sm pt-4"
              >
                ⏰ You have 24 hours to take the assessment after course completion
              </motion.p>
            </div>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
