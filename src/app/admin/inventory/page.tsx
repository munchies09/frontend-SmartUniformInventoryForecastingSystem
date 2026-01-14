"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CategoryInfo {
  name: string;
  image: string;
  route: string;
}

export default function InventoryPage() {
  const router = useRouter();
  const [categoryStats, setCategoryStats] = useState<Record<string, { items: number; units: number; status: string }>>({});
  const [loading, setLoading] = useState(true);

  const categories: CategoryInfo[] = [
    { name: "Uniform No 3", image: "/no3.png", route: "/admin/inventory/uniform?category=Uniform No 3" },
    { name: "Uniform No 4", image: "/no4.png", route: "/admin/inventory/uniform?category=Uniform No 4" },
    { name: "Accessories No 3", image: "/no3.png", route: "/admin/inventory/uniform?category=Accessories No 3" },
    { name: "Accessories No 4", image: "/no4.png", route: "/admin/inventory/uniform?category=Accessories No 4" },
    { name: "Shirt", image: "/digital.png", route: "/admin/inventory/uniform?category=Shirt" },
  ];

  useEffect(() => {
    fetchCategoryStats();
  }, []);

  const fetchCategoryStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/inventory", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.inventory) {
          const stats: Record<string, { items: Set<string>; totalUnits: number; lowStockCount: number }> = {};
          
          data.inventory.forEach((item: any) => {
            const category = item.category || "Unknown";
            if (!stats[category]) {
              stats[category] = { items: new Set(), totalUnits: 0, lowStockCount: 0 };
            }
            
            // Count unique item types (type + size combination for items with sizes, just type for accessories)
            const itemKey = item.size && item.size !== "N/A" && item.size !== null 
              ? `${item.type}_${item.size}` 
              : item.type;
            stats[category].items.add(itemKey);
            stats[category].totalUnits += item.quantity || 0;
            
            // Check for low stock (quantity <= 10)
            if ((item.quantity || 0) <= 10) {
              stats[category].lowStockCount++;
            }
          });

          // Convert to display format
          const displayStats: Record<string, { items: number; units: number; status: string }> = {};
          Object.keys(stats).forEach(category => {
            const itemCount = stats[category].items.size;
            const unitCount = stats[category].totalUnits;
            let status = "In Stock";
            
            if (itemCount === 0) {
              status = "No Items";
            } else if (stats[category].lowStockCount > 0 && stats[category].lowStockCount <= itemCount / 2) {
              status = "Low Stock";
            } else if (stats[category].lowStockCount === itemCount) {
              status = "Out of Stock";
            }
            
            displayStats[category] = {
              items: itemCount,
              units: unitCount,
              status: status,
            };
          });

          setCategoryStats(displayStats);
        }
      }
    } catch (error) {
      console.error("Error fetching category stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Low Stock":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Out of Stock":
        return "bg-red-100 text-red-800 border-red-300";
      case "No Items":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-green-100 text-green-800 border-green-300";
    }
  };

  return (
    <div className="relative">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 drop-shadow-md" style={{ textShadow: '0 2px 4px rgba(255,255,255,0.8)' }}>
          Inventory Management
        </h1>
        <p className="text-gray-700 mt-2 font-medium drop-shadow-sm" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
          Select a category to manage inventory items
        </p>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {categories.map((category) => {
          return (
            <button
              key={category.name}
              onClick={() => router.push(category.route)}
              className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md border-2 border-orange-300 p-6 hover:shadow-lg transition-all duration-300 hover:scale-105 text-left"
            >
              {/* Category Image */}
              <div className="mb-4 flex justify-center items-center bg-gray-50 rounded-lg border-2 border-orange-200" style={{ height: '200px' }}>
                <img
                  src={category.image}
                  alt={category.name}
                  className="max-w-full max-h-full object-contain p-2"
                />
              </div>

              {/* Category Name */}
              <h2 className="text-xl font-bold text-gray-900 text-center">{category.name}</h2>
            </button>
          );
        })}
      </div>
    </div>
  );
}
