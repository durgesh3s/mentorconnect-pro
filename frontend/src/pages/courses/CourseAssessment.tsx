import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Navigation } from "@/components/ui/navigation";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  points: number;
}

export default function CourseAssessment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(3600); // 60 minutes in seconds
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const data = await apiClient.get(`/courses/${id}/assessment`);
        setQuestions(data.questions || []);
        setTimeRemaining(data.timeLimit || 3600);
      } catch (error) {
        console.error("Failed to fetch assessment", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [id]);

  useEffect(() => {
    if (timeRemaining > 0 && !submitted) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining, submitted]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setAnswers({ ...answers, [questionId]: answerIndex });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (submitted) return;

    try {
      const response = await apiClient.post(`/courses/${id}/assessment/submit`, { answers });
      setScore(response.score);
      setSubmitted(true);

      // Navigate to results or next step based on score
      if (response.score >= 70) {
        // Passed - can proceed to interview
        setTimeout(() => {
          navigate(`/courses/${id}/assessment/result`, { state: { score: response.score, passed: true } });
        }, 2000);
      } else {
        // Failed
        setTimeout(() => {
          navigate(`/courses/${id}/assessment/result`, { state: { score: response.score, passed: false } });
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to submit assessment", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center pt-24">
          <p className="text-white/80">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (submitted && score !== null) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-4xl pt-24">
          <Card className="p-8 bg-white/5 backdrop-blur-md border-white/10 text-center">
            {score >= 70 ? (
              <>
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <h2 className="text-3xl font-bold mb-4 text-white">Congratulations!</h2>
                <p className="text-xl mb-2 text-white">You scored {score}%</p>
                <p className="text-white/80 mb-6">You have passed the assessment!</p>
                <Button
                  onClick={() => navigate(`/interviews/schedule?courseId=${id}`)}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  Schedule Interview
                </Button>
              </>
            ) : (
              <>
                <XCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
                <h2 className="text-3xl font-bold mb-4 text-white">Assessment Failed</h2>
                <p className="text-xl mb-2 text-white">You scored {score}%</p>
                <p className="text-white/80 mb-6">Minimum passing score is 70%</p>
                <Button
                  onClick={() => navigate(`/courses/${id}/learn`)}
                  className="bg-white text-black hover:bg-white/90"
                >
                  Review Course
                </Button>
              </>
            )}
          </Card>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl pt-24">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Course Assessment</h1>
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/10">
              <Clock className="h-4 w-4 text-white/80" />
              <span className="font-mono text-white">{formatTime(timeRemaining)}</span>
            </div>
          </div>
          <Progress value={progress} className="h-2 mb-2" />
          <p className="text-sm text-white/60">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </div>

        {/* Question Card */}
        {currentQuestion && (
          <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10 mb-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2 text-white">{currentQuestion.question}</h2>
              <p className="text-sm text-white/60">Points: {currentQuestion.points}</p>
            </div>

            <RadioGroup
              value={answers[currentQuestion.id]?.toString()}
              onValueChange={(value) => handleAnswerSelect(currentQuestion.id, parseInt(value))}
            >
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-2 p-4 rounded-lg border ${
                      answers[currentQuestion.id] === index
                        ? "bg-white/10 border-white/30"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                    <Label
                      htmlFor={`option-${index}`}
                      className="flex-1 cursor-pointer text-white"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`h-8 w-8 rounded ${
                  index === currentQuestionIndex
                    ? "bg-white text-black"
                    : answers[questions[index].id] !== undefined
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-white/5 text-white/60 border border-white/10"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Submit Assessment
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="bg-white text-black hover:bg-white/90"
            >
              Next
            </Button>
          )}
        </div>

        {/* Warning Alert */}
        <Alert className="mt-6 bg-yellow-500/10 border-yellow-500/30">
          <AlertCircle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-400">
            Make sure to review all questions before submitting. You cannot change answers after submission.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

