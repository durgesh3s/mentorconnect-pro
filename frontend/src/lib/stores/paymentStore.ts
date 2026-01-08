import { create } from "zustand";

interface Subscription {
  id: string;
  courseId: string;
  plan: "monthly" | "quarterly" | "annual";
  status: "active" | "expired" | "cancelled";
  startDate: string;
  endDate: string;
  amount: number;
}

interface Payment {
  id: string;
  amount: number;
  status: "success" | "pending" | "failed";
  courseId: string;
  createdAt: string;
}

interface PaymentState {
  subscriptions: Subscription[];
  paymentHistory: Payment[];
  subscriptionStatus: Record<string, Subscription>;
  setSubscriptions: (subscriptions: Subscription[]) => void;
  addSubscription: (subscription: Subscription) => void;
  addPayment: (payment: Payment) => void;
  updateSubscriptionStatus: (courseId: string, status: Subscription["status"]) => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  subscriptions: [],
  paymentHistory: [],
  subscriptionStatus: {},
  setSubscriptions: (subscriptions) =>
    set({
      subscriptions,
      subscriptionStatus: subscriptions.reduce(
        (acc, sub) => ({ ...acc, [sub.courseId]: sub }),
        {} as Record<string, Subscription>
      ),
    }),
  addSubscription: (subscription) =>
    set((state) => ({
      subscriptions: [...state.subscriptions, subscription],
      subscriptionStatus: {
        ...state.subscriptionStatus,
        [subscription.courseId]: subscription,
      },
    })),
  addPayment: (payment) =>
    set((state) => ({
      paymentHistory: [payment, ...state.paymentHistory],
    })),
  updateSubscriptionStatus: (courseId, status) =>
    set((state) => ({
      subscriptions: state.subscriptions.map((sub) =>
        sub.courseId === courseId ? { ...sub, status } : sub
      ),
      subscriptionStatus: {
        ...state.subscriptionStatus,
        [courseId]: { ...state.subscriptionStatus[courseId], status },
      },
    })),
}));

