import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  BookOpen,
  FileText,
  Calendar,
  Award,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { AdminNavigation } from "@/components/admin/AdminNavigation";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    activeEnrollments: 0,
    completedCourses: 0,
    pendingInterviews: 0,
    pendingAssessments: 0,
    lettersIssued: 0,
    offerLetters: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await apiClient.get("/admin/dashboard");
        setStats(data.stats || stats);
        setRecentActivity(data.recentActivity || []);
      } catch (error) {
        console.error("Failed to fetch admin dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <AdminNavigation />
      <div className="container mx-auto px-4 py-8 max-w-7xl pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">Admin Dashboard</h1>
          <p className="text-white/80">Manage students, courses, and the entire learning journey</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60 mb-1">Total Students</p>
                <p className="text-2xl font-bold text-white">{stats.totalStudents}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60 mb-1">Total Courses</p>
                <p className="text-2xl font-bold text-white">{stats.totalCourses}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60 mb-1">Active Enrollments</p>
                <p className="text-2xl font-bold text-white">{stats.activeEnrollments}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60 mb-1">Completed Courses</p>
                <p className="text-2xl font-bold text-white">{stats.completedCourses}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60 mb-1">Pending Interviews</p>
                <p className="text-2xl font-bold text-white">{stats.pendingInterviews}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60 mb-1">Pending Assessments</p>
                <p className="text-2xl font-bold text-white">{stats.pendingAssessments}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60 mb-1">Letters Issued</p>
                <p className="text-2xl font-bold text-white">{stats.lettersIssued}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                <Award className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60 mb-1">Offer Letters</p>
                <p className="text-2xl font-bold text-white">{stats.offerLetters}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                <Award className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
          <h2 className="text-xl font-bold mb-4 text-white">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-white/60 text-center py-8">No recent activity</p>
            ) : (
              recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="h-10 w-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                    {activity.type === "course_completed" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    {activity.type === "assessment_submitted" && <FileText className="h-5 w-5 text-blue-500" />}
                    {activity.type === "interview_scheduled" && <Calendar className="h-5 w-5 text-purple-500" />}
                    {activity.type === "letter_issued" && <Award className="h-5 w-5 text-yellow-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{activity.message}</p>
                    <p className="text-sm text-white/60">{activity.timestamp}</p>
                  </div>
                  <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                    {activity.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

