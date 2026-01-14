import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserCard } from "@/components/UserCard";
import { Search, Users as UsersIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { useDebounce } from "@/hooks/use-debounce";

interface User {
  _id?: string;
  id?: string;
  username: string;
  name: string;
  avatar?: string;
  googleGmailPhoto?: string;
  description?: string;
  location?: string;
  education?: "high" | "secondary" | "graduation";
  fieldsOfInterest?: string[];
}

interface SearchResponse {
  students: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface SearchDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDrawer({ open, onOpenChange }: SearchDrawerProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const debouncedQuery = useDebounce(query, 500);

  const fetchUsers = useCallback(async (searchQuery: string, page: number = 1) => {
    setLoading(true);
    try {
      const url = searchQuery.trim()
        ? `/students/search?q=${encodeURIComponent(searchQuery.trim())}&page=${page}&limit=20`
        : `/students/search?page=${page}&limit=20`;
      
      const response = await apiClient.get<SearchResponse>(url);
      setUsers(response.students);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Failed to fetch users", error);
      setUsers([]);
      setPagination({ page: 1, limit: 20, total: 0, pages: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  // Track if drawer was just opened
  const [wasOpen, setWasOpen] = useState(false);

  // Initial load when drawer opens or query changes
  useEffect(() => {
    if (open) {
      if (!wasOpen) {
        // Just opened - initial load
        setWasOpen(true);
        fetchUsers(debouncedQuery, 1);
      } else {
        // Already open - query changed, reset to page 1
        setPagination((prev) => ({ ...prev, page: 1 }));
        fetchUsers(debouncedQuery, 1);
      }
    } else {
      setWasOpen(false);
    }
  }, [open, debouncedQuery, wasOpen, fetchUsers]);

  // Reset when drawer closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setUsers([]);
      setPagination({ page: 1, limit: 20, total: 0, pages: 0 });
    }
  }, [open]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchUsers(query, 1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
      fetchUsers(query, newPage);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="left" 
        className="w-full sm:w-[400px] p-0 bg-background border-r border-border flex flex-col h-full"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Search</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-full hover:bg-accent transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-3 h-9 bg-muted border-0 text-foreground placeholder:text-muted-foreground focus:bg-background focus:ring-1 focus:ring-ring rounded-md text-sm"
              autoFocus
            />
          </form>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-muted border-t-foreground mx-auto mb-2"></div>
                <p className="text-xs text-muted-foreground">Searching...</p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center px-4">
              <UsersIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="text-sm font-medium mb-1 text-foreground">
                {query.trim() ? "No users found" : "No users available"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {query.trim() ? "Try a different search" : "Check back later"}
              </p>
            </div>
          ) : (
            <>
              {/* User List */}
              <div className="bg-background">
                {users.map((user, index) => (
                  <div key={user._id || user.id}>
                    <UserCard user={user} />
                    {index < users.length - 1 && (
                      <div className="border-b border-border" />
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-3 py-3 border-t border-border bg-background sticky bottom-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1 || loading}
                    className="h-7 px-3 text-xs"
                  >
                    <ChevronLeft className="h-3 w-3 mr-1" />
                    Prev
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {pagination.page} / {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages || loading}
                    className="h-7 px-3 text-xs"
                  >
                    Next
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
