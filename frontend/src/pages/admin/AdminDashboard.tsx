import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  GraduationCap,
  MapPin,
  TrendingUp,
  Shield,
  Database,
  Activity,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AdminStats {
  totalStudents: number;
  completedProfiles: number;
  enrolledStudents: number;
  educationStats: Array<{ _id: string | null; count: number }>;
  topLocations: Array<{ _id: string | null; count: number }>;
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is admin
    if (!user || user.role !== "admin") {
      toast.error("Admin access required");
      navigate("/");
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get<AdminStats>("/admin/students/stats");
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch admin stats", error);
        toast.error("Failed to load statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, navigate]);

  if (!user || user.role !== "admin") {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground page-transition">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-7xl pt-24 text-center">
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const completionRate = stats
    ? Math.round((stats.completedProfiles / stats.totalStudents) * 100)
    : 0;
  const enrollmentRate = stats
    ? Math.round((stats.enrolledStudents / stats.totalStudents) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground page-transition">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-7xl pt-24">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage students, monitor statistics, and oversee the platform
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Profiles</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.completedProfiles || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {completionRate}% completion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enrolled Students</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.enrolledStudents || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {enrollmentRate}% enrollment rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Education Levels</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.educationStats?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Different levels</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Education Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Education Distribution
              </CardTitle>
              <CardDescription>Students by education level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.educationStats && stats.educationStats.length > 0 ? (
                  stats.educationStats.map((stat) => (
                    <div key={stat._id || "unknown"} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {stat._id === "high"
                            ? "High School"
                            : stat._id === "secondary"
                            ? "Secondary"
                            : stat._id === "graduation"
                            ? "Graduation"
                            : stat._id || "Not Specified"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{stat.count} students</span>
                        <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${
                                (stat.count / (stats.totalStudents || 1)) * 100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No education data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Locations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Top Locations
              </CardTitle>
              <CardDescription>Students by location</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.topLocations && stats.topLocations.length > 0 ? (
                  stats.topLocations.slice(0, 10).map((location) => (
                    <div
                      key={location._id || "unknown"}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {location._id || "Not Specified"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {location.count} students
                        </span>
                        <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${
                                (location.count / (stats.totalStudents || 1)) * 100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No location data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to="/admin/students">
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <Users className="h-5 w-5 mr-2" />
                  Manage Students
                </Button>
              </Link>
              <Link to="/admin/courses">
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <Database className="h-5 w-5 mr-2" />
                  Course Management
                </Button>
              </Link>
              <Link to="/admin/assessments">
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <FileText className="h-5 w-5 mr-2" />
                  Assessment Management
                </Button>
              </Link>
              <Button variant="outline" className="w-full justify-start" size="lg" disabled>
                <TrendingUp className="h-5 w-5 mr-2" />
                Analytics & Reports
                <Badge className="ml-2" variant="secondary">
                  Soon
                </Badge>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
