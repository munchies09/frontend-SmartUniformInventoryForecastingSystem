"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import {
  HomeIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Uniform/Clothing Icon - Hanger style
  const ShirtIcon = ({ className }: { className?: string }) => (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7h8M8 7v10a2 2 0 002 2h4a2 2 0 002-2V7M8 7l-2-3h12l-2 3M10 7v4M14 7v4"
      />
      <circle cx="12" cy="4" r="1.5" fill="currentColor"/>
    </svg>
  );

  const navItems = [
    { name: "Home", href: "/member/dashboard", icon: HomeIcon },
    { name: "My Profile", href: "/member/profile", icon: UserIcon },
    { name: "My Uniform", href: "/member/uniform", icon: ShirtIcon },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <ProtectedRoute allowedRoles={["member"]}>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-blue-600 to-blue-700 shadow-lg">
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b border-blue-500/30">
              <div>
                <h1 className="text-xl font-bold text-white">Smart Uniform System</h1>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      isActive
                        ? "bg-blue-500/40 text-white shadow-md"
                        : "text-blue-100 hover:bg-blue-500/30 hover:text-white"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </a>
                );
              })}
            </nav>

            {/* User Info & Logout */}
            <div className="p-4 border-t border-blue-500/30">
              <div className="mb-3 px-4">
                <p className="text-sm font-medium text-white">{user?.name || "Member"}</p>
                <p className="text-xs text-blue-200">{user?.sispaId || user?.memberId}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 hover:bg-blue-500/30 hover:text-white transition"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="ml-64">
          <main className="p-8">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

