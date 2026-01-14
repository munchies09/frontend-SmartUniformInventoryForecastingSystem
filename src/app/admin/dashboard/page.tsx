"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  UserGroupIcon,
  CubeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [inventoryStatus, setInventoryStatus] = useState({
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
  });

  useEffect(() => {
    fetchInventoryStatus();
  }, []);

  const fetchInventoryStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const inventoryRes = await fetch("http://localhost:5000/api/inventory", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      let status = {
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
      };
      
      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json();
        if (inventoryData.success && inventoryData.inventory) {
          const inventory = inventoryData.inventory || [];
          
          inventory.forEach((item: any) => {
            const quantity = item.quantity || 0;
            if (quantity > 10) {
              status.inStock++;
            } else if (quantity > 0) {
              status.lowStock++;
            } else {
              status.outOfStock++;
            }
          });
        }
      }
      
      setInventoryStatus(status);
    } catch (error) {
      console.error("Error fetching inventory status:", error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      name: "Member",
      href: "/admin/member",
      icon: UserGroupIcon,
      description: "View and manage all members",
    },
    {
      name: "Inventory",
      href: "/admin/inventory",
      icon: CubeIcon,
      description: "Add and manage inventory items",
    },
    {
      name: "Announcements",
      href: "/admin/announcements",
      icon: SpeakerWaveIcon,
      description: "Manage system announcements",
    },
    {
      name: "Forecasting",
      href: "/admin/forecasting",
      icon: ChartBarIcon,
      description: "View demand forecasts",
    },
    {
      name: "Reports",
      href: "/admin/reports",
      icon: DocumentTextIcon,
      description: "View and generate reports",
    },
  ];

  return (
    <div className="relative">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 drop-shadow-md" style={{ textShadow: '0 2px 4px rgba(255,255,255,0.8)' }}>
          Welcome back, {user?.name || "Admin"}!
        </h1>
        <p className="text-gray-700 mt-2 font-medium drop-shadow-sm" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>Here's an overview of your system</p>
      </div>

      {/* Inventory Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md border-2 border-orange-300 p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Stock Items</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {loading ? "..." : inventoryStatus.inStock}
              </p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <ChartBarIcon className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md border-2 border-orange-300 p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {loading ? "..." : inventoryStatus.lowStock}
              </p>
            </div>
            <div className="bg-yellow-500 p-3 rounded-lg">
              <ChartBarIcon className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md border-2 border-orange-300 p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Out of Stock Items</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {loading ? "..." : inventoryStatus.outOfStock}
              </p>
            </div>
            <div className="bg-red-500 p-3 rounded-lg">
              <ChartBarIcon className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-6 border-2 border-orange-300">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <a
                key={action.name}
                href={action.href}
                className="p-4 border-2 border-orange-200 rounded-lg hover:bg-blue-50 hover:border-orange-400 transition hover:shadow-md"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-100 p-2 rounded-lg border border-orange-200">
                    <Icon className="w-5 h-5 text-blue-700" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{action.name}</h3>
                </div>
                <p className="text-sm text-gray-600 mt-1 ml-11">
                  {action.description}
                </p>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

