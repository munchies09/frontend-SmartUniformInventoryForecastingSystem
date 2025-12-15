"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import {
  HomeIcon,
  UserGroupIcon,
  CubeIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: HomeIcon },
    { name: "Batch", href: "/admin/batch", icon: CubeIcon },
    { name: "Member", href: "/admin/member", icon: UserGroupIcon },
    { name: "Inventory", href: "/admin/inventory", icon: CubeIcon },
    { name: "Forecasting", href: "/admin/forecasting", icon: ChartBarIcon },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="fixed inset-y-0 left-0 w-64 bg-blue-900 text-white shadow-lg">
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b border-blue-800">
              <div className="flex items-center gap-3">
                <img src="/logoupm.png" className="w-10 h-10" alt="Logo" />
                <div>
                  <h1 className="text-xl font-bold">Smart Uniform</h1>
                  <p className="text-xs text-blue-300">Admin Panel</p>
                </div>
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
                        ? "bg-blue-800 text-white"
                        : "text-blue-200 hover:bg-blue-800 hover:text-white"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </a>
                );
              })}
            </nav>

            {/* User Info & Logout */}
            <div className="p-4 border-t border-blue-800">
              <div className="mb-3 px-4">
                <p className="text-sm font-medium">{user?.name || "Admin"}</p>
                <p className="text-xs text-blue-300">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-blue-200 hover:bg-blue-800 hover:text-white transition"
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

