"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
  UserGroupIcon,
  CubeIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

export default function AdminDashboard() {
  const { user } = useAuth();

  const stats = [
    {
      name: "Total Members",
      value: "0",
      icon: UserGroupIcon,
      color: "bg-blue-500",
    },
    {
      name: "Total Batches",
      value: "0",
      icon: ClipboardDocumentListIcon,
      color: "bg-green-500",
    },
    {
      name: "Inventory Items",
      value: "0",
      icon: CubeIcon,
      color: "bg-yellow-500",
    },
    {
      name: "Forecasts",
      value: "0",
      icon: ChartBarIcon,
      color: "bg-purple-500",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name || "Admin"}!
        </h1>
        <p className="text-gray-600 mt-2">Here's an overview of your system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.name}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/admin/batch"
            className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition"
          >
            <h3 className="font-semibold text-gray-900">Manage Batches</h3>
            <p className="text-sm text-gray-600 mt-1">
              Create and manage uniform batches
            </p>
          </a>
          <a
            href="/admin/member"
            className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition"
          >
            <h3 className="font-semibold text-gray-900">Manage Members</h3>
            <p className="text-sm text-gray-600 mt-1">
              View and manage all members
            </p>
          </a>
          <a
            href="/admin/inventory"
            className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition"
          >
            <h3 className="font-semibold text-gray-900">View Inventory</h3>
            <p className="text-sm text-gray-600 mt-1">
              Check current inventory status
            </p>
          </a>
          <a
            href="/admin/forecasting"
            className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition"
          >
            <h3 className="font-semibold text-gray-900">Forecasting</h3>
            <p className="text-sm text-gray-600 mt-1">
              View demand forecasts
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}

