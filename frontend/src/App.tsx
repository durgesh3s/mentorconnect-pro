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
import NotFound from "./pages/NotFound";
import CourseAssessment from "./pages/courses/CourseAssessment";
import ScheduleInterview from "./pages/interviews/ScheduleInterview";
import ViewLetters from "./pages/letters/ViewLetters";
import AdminDashboard from "./pages/admin/AdminDashboard";
import StudentManagement from "./pages/admin/StudentManagement";
import CourseManagement from "./pages/admin/CourseManagement";
import CreateCourse from "./pages/admin/CreateCourse";
import EditCourse from "./pages/admin/EditCourse";
import AssessmentManagement from "./pages/admin/AssessmentManagement";
import AssessmentSubmissions from "./pages/admin/AssessmentSubmissions";
import SearchUsers from "./pages/users/SearchUsers";
import FollowersList from "./pages/users/FollowersList";
import FollowingList from "./pages/users/FollowingList";

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
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/students" element={<StudentManagement />} />
            <Route path="/admin/courses" element={<CourseManagement />} />
            <Route path="/admin/courses/create" element={<CreateCourse />} />
            <Route path="/admin/courses/:id/edit" element={<EditCourse />} />
            <Route path="/admin/assessments" element={<AssessmentManagement />} />
            <Route path="/admin/assessments/:id/submissions" element={<AssessmentSubmissions />} />
            
            {/* Course Routes */}
            <Route path="/courses" element={<CourseListing />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/courses/:id/learn" element={<CoursePlayer />} />
            <Route path="/courses/:id/leaderboard" element={<Leaderboard />} />
            <Route path="/courses/:id/subscribe" element={<Subscribe />} />
            <Route path="/courses/:id/assessment" element={<CourseAssessment />} />
            
            {/* Interview Routes */}
            <Route path="/interviews/schedule" element={<ScheduleInterview />} />
            
            {/* Letter Routes */}
            <Route path="/letters" element={<ViewLetters />} />
            
            {/* Profile Routes */}
            <Route path="/profile/:username" element={<ProfileView />} />
            <Route path="/profile/edit" element={<ProfileEdit />} />
            
            {/* User Routes */}
            <Route path="/users/search" element={<SearchUsers />} />
            <Route path="/users/:username/followers" element={<FollowersList />} />
            <Route path="/users/:username/following" element={<FollowingList />} />
            
            {/* Social Routes */}
            <Route path="/feed" element={<Feed />} />
            <Route path="/threads/create" element={<CreateThread />} />
            
            {/* Payment Routes */}
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/failure" element={<PaymentFailure />} />
            
            {/* Other Routes */}
            <Route path="/certificates" element={<Certificates />} />
            <Route path="/internships" element={<Internships />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
