"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import {
  HomeIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      <div className="min-h-screen bg-cover bg-center bg-fixed relative" style={{ backgroundImage: "url('/background.png')", backgroundPosition: "center center", backgroundRepeat: "no-repeat" }}>
        {/* White overlay for light shade effect */}
        <div className="fixed inset-0 bg-white/65 pointer-events-none"></div>
        {/* Additional overlay for better readability */}
        <div className="fixed inset-0 bg-gray-900/10 pointer-events-none"></div>
        
        {/* Sidebar - Darker blue for member */}
        <div className={`fixed inset-y-0 left-0 bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 shadow-2xl transition-all duration-300 z-40 ${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full overflow-hidden'
        }`}>
          <div className="flex flex-col h-full">
            {/* Logo with Toggle Button */}
            <div className="p-6 border-b border-blue-400/50 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-white leading-tight">UniTrack: Smart Uniform Inventory Forecasting System</h1>
              </div>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 text-white hover:bg-blue-600/50 rounded-lg transition-all duration-300 hover:scale-110"
                title="Toggle Menu"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto hide-scrollbar">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      isActive
                        ? "bg-orange-400/90 text-white shadow-md border-l-4 border-orange-300"
                        : "text-blue-50 hover:bg-blue-400/50 hover:text-white hover:border-l-4 hover:border-orange-300/50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </a>
                );
              })}
            </nav>

            {/* User Info & Log out */}
            <div className="p-4 border-t border-blue-500/50">
              <div className="mb-3 px-4">
                <p className="text-sm font-medium text-white">{user?.name || "Member"}</p>
                <p className="text-xs text-blue-50">{user?.sispaId}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-blue-50 hover:bg-blue-400/50 hover:text-white transition border border-blue-400/30 hover:border-orange-300/50"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="font-medium">Log out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Toggle Button - Shown when sidebar is closed */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="fixed top-4 left-4 z-50 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-all duration-300 hover:scale-110"
            title="Show Menu"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
        )}

        {/* Main Content */}
        <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
          <main className="p-8 relative z-10">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

