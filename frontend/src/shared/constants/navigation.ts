import {
  Activity,
  BarChart3,
  Brain,
  BookOpen,
  CreditCard,
  Dumbbell,
  Home,
  Settings,
  Shield,
  Utensils,
  UserRound,
  UsersRound,
  Video,
} from "lucide-react";

import type { NavItem } from "@/shared/types";

export const navigationItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    label: "Workouts",
    href: "/workouts",
    icon: Dumbbell,
  },
  {
    label: "Live Session",
    href: "/workouts/live",
    icon: Activity,
  },
  {
    label: "Nutrition",
    href: "/diet",
    icon: Utensils,
  },
  {
    label: "AI Plan",
    href: "/ai-plan",
    icon: Brain,
  },
  {
    label: "Exercise Library",
    href: "/library",
    icon: BookOpen,
  },
  {
    label: "Subscription",
    href: "/subscription",
    icon: CreditCard,
  },
  {
    label: "Results",
    href: "/results",
    icon: BarChart3,
  },
  {
    label: "Profile",
    href: "/profile",
    icon: UserRound,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export const adminNavigationItems: NavItem[] = [
  {
    label: "Admin Dashboard",
    href: "/admin",
    icon: Shield,
  },
  {
    label: "Manage Videos",
    href: "/admin/videos",
    icon: Video,
  },
  {
    label: "Manage Plans",
    href: "/admin/plans",
    icon: CreditCard,
  },
  {
    label: "Users Overview",
    href: "/admin/users",
    icon: UsersRound,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];
