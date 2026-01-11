import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserCard } from "@/components/UserCard";
import { Search, Users as UsersIcon } from "lucide-react";
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

  const fetchUsers = useCallback(async (searchQuery: string, page: number = 1, append: boolean = false) => {
    if (!searchQuery.trim()) {
      setUsers([]);
      setPagination({ page: 1, limit: 20, total: 0, pages: 0 });
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.get<SearchResponse>(
        `/students/search?q=${encodeURIComponent(searchQuery.trim())}&page=${page}&limit=20`
      );
      if (append) {
        setUsers((prev) => [...prev, ...response.students]);
      } else {
        setUsers(response.students);
      }
      setPagination(response.pagination);
    } catch (error) {
      console.error("Failed to search users", error);
      if (!append) {
        setUsers([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery) {
      fetchUsers(debouncedQuery, 1);
      setSearchParams({ q: debouncedQuery });
    } else {
      setUsers([]);
      setPagination({ page: 1, limit: 20, total: 0, pages: 0 });
      setSearchParams({});
    }
  }, [debouncedQuery, fetchUsers, setSearchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      fetchUsers(query.trim(), 1);
    }
  };

  const handleLoadMore = () => {
    if (pagination.page < pagination.pages && query.trim()) {
      fetchUsers(query.trim(), pagination.page + 1, true);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white page-transition">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-6xl pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Search Users</h1>
          <p className="text-white/60">Discover and connect with other learners</p>
        </div>

        {/* Search Bar */}
        <Card className="p-4 mb-6 bg-white/5 backdrop-blur-md border-white/10">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
              <Input
                type="text"
                placeholder="Search by username, name, or email..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-white text-black hover:bg-white/90"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </form>
        </Card>

        {/* Results */}
        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white/80">Searching users...</p>
            </div>
          </div>
        ) : users.length === 0 && query.trim() ? (
          <Card className="p-12 text-center bg-white/5 backdrop-blur-md border-white/10">
            <UsersIcon className="h-12 w-12 mx-auto mb-4 text-white/40" />
            <h3 className="text-lg font-semibold mb-2 text-white">No users found</h3>
            <p className="text-white/80">Try searching with a different query</p>
          </Card>
        ) : users.length === 0 ? (
          <Card className="p-12 text-center bg-white/5 backdrop-blur-md border-white/10">
            <Search className="h-12 w-12 mx-auto mb-4 text-white/40" />
            <h3 className="text-lg font-semibold mb-2 text-white">Start searching</h3>
            <p className="text-white/80">Enter a username, name, or email to find users</p>
          </Card>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-white/60">
                Found {pagination.total} {pagination.total === 1 ? "user" : "users"}
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {users.map((user) => (
                <UserCard key={user._id || user.id} user={user} />
              ))}
            </div>

            {pagination.page < pagination.pages && (
              <div className="text-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={loading}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  ) : null}
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
