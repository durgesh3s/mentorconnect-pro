import { create } from "zustand";

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: {
    id: string;
    name: string;
    avatar?: string;
  };
  thumbnail?: string;
  price: {
    monthly: number;
    quarterly: number;
    annual: number;
  };
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  rating: number;
  reviewCount: number;
  studentCount: number;
  modules: Module[];
  enrolled?: boolean;
  progress?: number;
  status?: "enrolled" | "in_progress" | "completed" | "failed";
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
  locked?: boolean;
}

interface Lesson {
  id: string;
  title: string;
  videoUrl: string;
  duration: number;
  completed?: boolean;
  locked?: boolean;
}

interface CourseState {
  courses: Course[];
  enrolledCourses: Course[];
  currentCourse: Course | null;
  setCourses: (courses: Course[]) => void;
  setEnrolledCourses: (courses: Course[]) => void;
  setCurrentCourse: (course: Course | null) => void;
  updateCourseProgress: (courseId: string, progress: number) => void;
}

export const useCourseStore = create<CourseState>((set) => ({
  courses: [],
  enrolledCourses: [],
  currentCourse: null,
  setCourses: (courses) => set({ courses }),
  setEnrolledCourses: (courses) => set({ enrolledCourses: courses }),
  setCurrentCourse: (currentCourse) => set({ currentCourse }),
  updateCourseProgress: (courseId, progress) =>
    set((state) => ({
      enrolledCourses: state.enrolledCourses.map((course) =>
        course.id === courseId ? { ...course, progress } : course
      ),
    })),
}));

