import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserCard } from "@/components/UserCard";
import { Search, Users as UsersIcon, ChevronLeft, ChevronRight } from "lucide-react";
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

export default function SearchUsers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const debouncedQuery = useDebounce(query, 500);

  // Set default URL params on mount if not present
  useEffect(() => {
    if (!searchParams.get("page")) {
      setSearchParams({ page: "1" }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

  // Sync state with URL params and fetch users
  useEffect(() => {
    const pageFromUrl = parseInt(searchParams.get("page") || "1", 10);
    const queryFromUrl = searchParams.get("q") || "";
    
    // Update local state from URL (URL is source of truth)
    setQuery(queryFromUrl);
    setPagination((prev) => ({ ...prev, page: pageFromUrl }));
    
    // Fetch users based on URL params
    fetchUsers(queryFromUrl, pageFromUrl);
  }, [searchParams, fetchUsers]);

  // Handle debounced query changes - update URL which triggers fetch
  useEffect(() => {
    const currentQuery = searchParams.get("q") || "";
    
    if (debouncedQuery !== currentQuery) {
      const params: Record<string, string> = { page: "1" };
      if (debouncedQuery.trim()) {
        params.q = debouncedQuery;
      }
      setSearchParams(params);
    }
  }, [debouncedQuery, setSearchParams, searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = { page: "1" };
    if (query.trim()) {
      params.q = query;
    }
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
      const params: Record<string, string> = { page: newPage.toString() };
      if (query.trim()) {
        params.q = query;
      }
      setSearchParams(params);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navigation />

      <div className="max-w-2xl mx-auto px-4 py-4 pt-20">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Search</h1>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-3 h-9 bg-gray-50 dark:bg-gray-900/50 border-0 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-1 focus:ring-gray-200 dark:focus:ring-gray-800 rounded-md text-sm"
            />
          </form>
        </div>

        {/* Results */}
        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-600 dark:border-gray-700 dark:border-t-gray-400 mx-auto mb-2"></div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Searching...</p>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center">
            <UsersIcon className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <h3 className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
              {query.trim() ? "No users found" : "No users available"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {query.trim() ? "Try a different search" : "Check back later"}
            </p>
          </div>
        ) : (
          <>
            {/* User List */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800/50 overflow-hidden">
              {users.map((user, index) => (
                <div key={user._id || user.id}>
                  <UserCard user={user} />
                  {index < users.length - 1 && (
                    <div className="border-b border-gray-100 dark:border-gray-800/50" />
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-3 py-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1 || loading}
                  className="h-7 px-3 text-xs border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-3 w-3 mr-1" />
                  Prev
                </Button>
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {pagination.page} / {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages || loading}
                  className="h-7 px-3 text-xs border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
