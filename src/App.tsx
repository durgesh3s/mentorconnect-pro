import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import SelectRole from "./pages/auth/SelectRole";
import Callback from "./pages/auth/Callback";
import CompleteProfile from "./pages/auth/CompleteProfile";
import StudentDashboard from "./pages/dashboard/StudentDashboard";
import MentorDashboard from "./pages/dashboard/MentorDashboard";
import CourseListing from "./pages/courses/CourseListing";
import CourseDetail from "./pages/courses/CourseDetail";
import CoursePlayer from "./pages/courses/CoursePlayer";
import Leaderboard from "./pages/courses/Leaderboard";
import Subscribe from "./pages/courses/Subscribe";
import ProfileView from "./pages/profile/ProfileView";
import ProfileEdit from "./pages/profile/ProfileEdit";
import Feed from "./pages/feed/Feed";
import CreateThread from "./pages/threads/CreateThread";
import PaymentSuccess from "./pages/payment/PaymentSuccess";
import PaymentFailure from "./pages/payment/PaymentFailure";
import Certificates from "./pages/certificates/Certificates";
import Internships from "./pages/internships/Internships";
import Settings from "./pages/settings/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            
            {/* Auth Routes */}
            <Route path="/auth/select-role" element={<SelectRole />} />
            <Route path="/auth/callback" element={<Callback />} />
            <Route path="/auth/complete-profile" element={<CompleteProfile />} />
            
            {/* Dashboard Routes */}
            <Route path="/dashboard/student" element={<StudentDashboard />} />
            <Route path="/dashboard/mentor" element={<MentorDashboard />} />
            
            {/* Course Routes */}
            <Route path="/courses" element={<CourseListing />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/courses/:id/learn" element={<CoursePlayer />} />
            <Route path="/courses/:id/leaderboard" element={<Leaderboard />} />
            <Route path="/courses/:id/subscribe" element={<Subscribe />} />
            
            {/* Profile Routes */}
            <Route path="/profile/:username" element={<ProfileView />} />
            <Route path="/profile/edit" element={<ProfileEdit />} />
            
            {/* Social Routes */}
            <Route path="/feed" element={<Feed />} />
            <Route path="/threads/create" element={<CreateThread />} />
            
            {/* Payment Routes */}
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/failure" element={<PaymentFailure />} />
            
            {/* Other Routes */}
            <Route path="/certificates" element={<Certificates />} />
            <Route path="/internships" element={<Internships />} />
            <Route path="/settings" element={<Settings />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

//this is for git tutorial

export default App;
