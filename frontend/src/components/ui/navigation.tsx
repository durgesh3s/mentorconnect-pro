import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Menu, X, FileText, User, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuthStore } from "@/lib/stores/authStore";
import { toast } from "sonner";

export function Navigation() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);

  const handleLogout = () => {
    logout();
    navigate("/");
    toast.success("Logged out successfully");
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Only show navbar when at the top of the page
      setIsAtTop(currentScrollY === 0);
    };

    // Check initial position
    setIsAtTop(window.scrollY === 0);

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 bg-transparent transition-transform duration-300 ${
      isAtTop ? "translate-y-0" : "-translate-y-full"
    }`}>
      <div className="container mx-auto px-6 md:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo - Left Side */}
          <Link to="/" className="flex items-center gap-3 transition-smooth hover:opacity-80">
            <div className="flex h-10 w-10 items-center justify-center">
              <GraduationCap className="h-8 w-8 text-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">CodeMentor Pro</span>
          </Link>

          {/* Desktop Navigation - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/courses" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-base">
              Courses
            </Link>
            <Link to="/feed" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-base">
              Community
            </Link>
            {isAuthenticated && user?.role === "student" && (
              <Link to="/letters" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-base">
                My Letters
              </Link>
            )}
            <a href="#how-it-works" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-base">
              How It Works
            </a>
          </div>

          {/* Right Side - CRED Style Button */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard/student">
                    <Button variant="ghost" size="sm" className="text-foreground hover:bg-foreground/10">
                      <User className="h-4 w-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleLogout}
                    className="text-foreground hover:bg-foreground/10"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/auth/select-role">
                    <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90 border-2 border-foreground">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
            
            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-foreground/10 transition-base"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-border animate-fade-in bg-background/80 backdrop-blur-md">
            <div className="px-4 pb-2">
              <ThemeToggle />
            </div>
            <Link
              to="/courses"
              className="block py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-base px-4"
              onClick={() => setMobileMenuOpen(false)}
            >
              Courses
            </Link>
            <Link
              to="/feed"
              className="block py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-base px-4"
              onClick={() => setMobileMenuOpen(false)}
            >
              Community
            </Link>
            {isAuthenticated && user?.role === "student" && (
              <Link
                to="/letters"
                className="block py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-base px-4"
                onClick={() => setMobileMenuOpen(false)}
              >
                My Letters
              </Link>
            )}
            <a
              href="#how-it-works"
              className="block py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-base px-4"
              onClick={() => setMobileMenuOpen(false)}
            >
              How It Works
            </a>
            <div className="flex flex-col gap-2 pt-4 border-t border-border px-4">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard/student" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full border-foreground/20 text-foreground hover:bg-foreground/10">
                      <User className="h-4 w-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full border-foreground/20 text-foreground hover:bg-foreground/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/auth/select-role" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-foreground text-background hover:bg-foreground/90">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
