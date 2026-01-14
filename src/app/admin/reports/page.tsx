"use client";

import { useState, useEffect } from "react";
import {
  DocumentArrowDownIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

interface ReportData {
  inventoryStatus: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
  };
  inventoryDetails: {
    byCategory: Record<string, { inStock: number; lowStock: number; outOfStock: number }>;
    byItemType: Record<string, { inStock: number; lowStock: number; outOfStock: number; total: number }>;
    bySize: Record<string, Record<string, Record<string, { quantity: number; status: string }>>>;
  };
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      // Fetch inventory data
      const inventoryRes = await fetch("http://localhost:5000/api/inventory", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      let inventoryStatus = {
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
      };
      
      const inventoryByCategory: Record<string, { inStock: number; lowStock: number; outOfStock: number }> = {};
      const inventoryByItemType: Record<string, { inStock: number; lowStock: number; outOfStock: number; total: number }> = {};
      const inventoryBySize: Record<string, Record<string, Record<string, { quantity: number; status: string }>>> = {};
      
      // Helper function to get item sizes (same as inventory page)
      const getItemSizes = (itemType: string): string[] => {
        const lower = itemType.toLowerCase();
        if (lower.includes("apulet") || lower.includes("badge") || lower.includes("cel bar") || 
            lower.includes("beret logo pin") || lower.includes("belt") || lower.includes("apm tag")) {
          return []; // No sizes for accessories
        }
        if (lower.includes("cloth") || lower.includes("pant") || lower.includes("digital") || lower.includes("inner") || lower.includes("company")) {
          return ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
        } else if (lower.includes("pvc shoes") || lower.includes("shoe")) {
          return ["4", "5", "6", "7", "8", "9", "10", "11", "12"];
        } else if (lower.includes("boot")) {
          return ["2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
        } else if (lower.includes("beret")) {
          return ["6 1/2", "6 5/8", "6 3/4", "6 7/8", "7", "7 1/8", "7 1/4", "7 3/8", "7 1/2", "7 5/8", "7 3/4", "7 7/8", "8", "8 1/8", "8 1/4", "8 3/8"];
        }
        return [];
      };
      
      // Helper function to get stock status
      const getStockStatus = (quantity: number): string => {
        if (quantity > 10) return "In Stock";
        if (quantity > 0) return "Low Stock";
        return "Out of Stock";
      };
      
      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json();
        if (inventoryData.success && inventoryData.inventory) {
          const inventory = inventoryData.inventory || [];
          
          inventory.forEach((item: any) => {
            const quantity = item.quantity || 0;
            const category = item.category || "Unknown";
            const itemType = item.type || item.name || "Unknown";
            const size = item.size || "N/A";
            
            // Overall status
            if (quantity > 10) {
              inventoryStatus.inStock++;
            } else if (quantity > 0) {
              inventoryStatus.lowStock++;
            } else {
              inventoryStatus.outOfStock++;
            }
            
            // By category
            if (!inventoryByCategory[category]) {
              inventoryByCategory[category] = { inStock: 0, lowStock: 0, outOfStock: 0 };
            }
            if (quantity > 10) {
              inventoryByCategory[category].inStock++;
            } else if (quantity > 0) {
              inventoryByCategory[category].lowStock++;
            } else {
              inventoryByCategory[category].outOfStock++;
            }
            
            // By item type
            const itemKey = `${category} - ${itemType}`;
            if (!inventoryByItemType[itemKey]) {
              inventoryByItemType[itemKey] = { inStock: 0, lowStock: 0, outOfStock: 0, total: 0 };
            }
            inventoryByItemType[itemKey].total += quantity;
            if (quantity > 10) {
              inventoryByItemType[itemKey].inStock++;
            } else if (quantity > 0) {
              inventoryByItemType[itemKey].lowStock++;
            } else {
              inventoryByItemType[itemKey].outOfStock++;
            }
            
            // By size (grouped by category → item type → size)
            if (!inventoryBySize[category]) {
              inventoryBySize[category] = {};
            }
            if (!inventoryBySize[category][itemType]) {
              inventoryBySize[category][itemType] = {};
            }
            inventoryBySize[category][itemType][size] = {
              quantity,
              status: getStockStatus(quantity)
            };
          });
        }
      }
      
      setReportData({
        inventoryStatus,
        inventoryDetails: {
          byCategory: inventoryByCategory,
          byItemType: inventoryByItemType,
          bySize: inventoryBySize,
        },
      });
    } catch (error) {
      console.error("Error fetching report data:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to fetch report data. Please try again.",
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    await fetchReportData();
    Swal.fire({
      icon: "success",
      title: "Report Refreshed",
      text: "Inventory data has been refreshed.",
      confirmButtonColor: "#1d4ed8",
      timer: 2000,
      timerProgressBar: true,
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Helper function to check if item type has sizes
  const itemHasSizes = (itemType: string): boolean => {
    const lower = itemType.toLowerCase();
    // Items without sizes (accessories)
    if (lower.includes("apulet") || lower.includes("badge") || lower.includes("cel bar") || 
        lower.includes("beret logo pin") || lower.includes("belt") || lower.includes("apm tag") ||
        lower.includes("nametag") || lower.includes("name tag")) {
      return false;
    }
    // Items with sizes: cloth, pants, shoes, boot, beret, digital, inner, company
    return true;
  };

  // Helper function to get item order within category
  const getItemOrder = (category: string, itemType: string): number => {
    const lowerItemType = itemType.toLowerCase();
    
    if (category === "Uniform No 3") {
      const order = [
        "uniform no 3 male", "uniform no 3 female", "cloth no 3", "pants no 3",
        "pvc shoes", "shoe",
        "beret"
      ];
      const index = order.findIndex(term => lowerItemType.includes(term));
      return index !== -1 ? index : 999;
    } else if (category === "Uniform No 4") {
      const order = [
        "uniform no 4", "cloth no 4", "pants no 4",
        "boot"
      ];
      const index = order.findIndex(term => lowerItemType.includes(term));
      return index !== -1 ? index : 999;
    } else if (category === "Accessories No 3") {
      const order = [
        "apulet",
        "integrity badge", "shoulder badge",
        "cel bar",
        "beret logo pin",
        "belt no 3"
        // Note: Nametag is not in inventory, so not included here
      ];
      const index = order.findIndex(term => lowerItemType.includes(term));
      return index !== -1 ? index : 999;
    } else if (category === "Accessories No 4") {
      const order = [
        "apm tag",
        "belt no 4"
        // Note: Nametag is not in inventory, so not included here
      ];
      const index = order.findIndex(term => lowerItemType.includes(term));
      return index !== -1 ? index : 999;
    } else if (category === "T-Shirt" || category === "Shirt") {
      const order = [
        "digital", "digital shirt",
        "inner apm", "inner apm shirt",
        "company", "company shirt"
      ];
      const index = order.findIndex(term => lowerItemType.includes(term));
      return index !== -1 ? index : 999;
    }
    
    return 999;
  };

  const handleDownloadInventoryReport = () => {
    if (!reportData || !reportData.inventoryDetails || !reportData.inventoryDetails.bySize) {
      Swal.fire({
        icon: "warning",
        title: "No Data",
        text: "No inventory data available. Please refresh the report.",
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }

    try {
      // Create workbook
      const wb = XLSX.utils.book_new();

      // Create a sheet for each category (all 5 categories)
      Object.entries(reportData.inventoryDetails.bySize)
        .filter(([category]) => ["Uniform No 3", "Uniform No 4", "Accessories No 3", "Accessories No 4", "Shirt", "T-Shirt"].includes(category))
        .forEach(([category, itemTypes]) => {
          // Prepare data for this category
          const categoryData: any[] = [];
          
          Object.entries(itemTypes).forEach(([itemType, sizes]) => {
            const sizeEntries = Object.entries(sizes);
            const hasSizes = sizeEntries.some(([size]) => size !== "N/A" && size !== null);
            
            if (hasSizes) {
              // Sort sizes logically
              const sizeOrder = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "6 1/2", "6 5/8", "6 3/4", "6 7/8", "7", "7 1/8", "7 1/4", "7 3/8", "7 1/2", "7 5/8", "7 3/4", "7 7/8", "8", "8 1/8", "8 1/4", "8 3/8"];
              const sortedSizes = sizeEntries
                .filter(([size]) => size !== "N/A" && size !== null)
                .sort(([a], [b]) => {
                  const aIndex = sizeOrder.indexOf(a);
                  const bIndex = sizeOrder.indexOf(b);
                  if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                  if (aIndex !== -1) return -1;
                  if (bIndex !== -1) return 1;
                  return a.localeCompare(b);
                });
              
              sortedSizes.forEach(([size, data]) => {
                categoryData.push({
                  "Item Type": itemType,
                  "Size": size,
                  "Quantity": data.quantity,
                  "Status": data.status,
                });
              });
            } else {
              // Accessories (no sizes)
              const totalQty = sizeEntries.reduce((sum, [, data]) => sum + data.quantity, 0);
              categoryData.push({
                "Item Type": itemType,
                "Size": "N/A",
                "Quantity": totalQty,
                "Status": sizeEntries[0]?.[1].status || "N/A",
              });
            }
          });
          
          // Create worksheet
          const ws = XLSX.utils.json_to_sheet(categoryData);
          
          // Set column widths
          ws["!cols"] = [
            { wch: 30 }, // Item Type
            { wch: 15 }, // Size
            { wch: 12 }, // Quantity
            { wch: 15 }, // Status
          ];
          
          // Add worksheet to workbook (sanitize sheet name for Excel - max 31 chars)
          const sheetName = category.length > 31 ? category.substring(0, 31) : category;
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

      // Generate filename
      const date = new Date().toISOString().split("T")[0];
      const filename = `Inventory_Report_${date}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);

      Swal.fire({
        icon: "success",
        title: "Download Complete!",
        text: `Successfully downloaded inventory report with ${Object.keys(reportData.inventoryDetails.bySize).filter(cat => ["Uniform No 3", "Uniform No 4", "Accessories No 3", "Accessories No 4", "Shirt", "T-Shirt"].includes(cat)).length} category sheets.`,
        confirmButtonColor: "#1d4ed8",
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (error: any) {
      console.error("Error downloading inventory report:", error);
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: error.message || "An error occurred while downloading the file.",
        confirmButtonColor: "#1d4ed8",
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-lg text-gray-600">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 drop-shadow-md" style={{ textShadow: '0 2px 4px rgba(255,255,255,0.8)' }}>Inventory Reports</h1>
          <p className="text-gray-700 mt-2 font-medium drop-shadow-sm" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
            View and download current inventory data
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed border-2 border-orange-400/50 hover:border-orange-500"
          >
            <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
          <button
            onClick={handleDownloadInventoryReport}
            disabled={!reportData}
            className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed border-2 border-orange-400/50 hover:border-orange-500"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            Download Inventory Report
          </button>
        </div>
      </div>

      {/* Inventory Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md border-2 border-orange-300 p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Stock Items</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {reportData?.inventoryStatus.inStock || 0}
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
                {reportData?.inventoryStatus.lowStock || 0}
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
                {reportData?.inventoryStatus.outOfStock || 0}
              </p>
            </div>
            <div className="bg-red-500 p-3 rounded-lg">
              <ChartBarIcon className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>


      {/* Detailed Inventory by Size - Grouped by Uniform Type */}
      {reportData && reportData.inventoryDetails && reportData.inventoryDetails.bySize && Object.keys(reportData.inventoryDetails.bySize).length > 0 && (
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md border-2 border-orange-300 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Detailed Inventory by Size</h2>
          <div className="space-y-0 border-l-4 border-blue-500">
            {Object.entries(reportData.inventoryDetails.bySize)
              .filter(([category]) => ["Uniform No 3", "Uniform No 4", "Accessories No 3", "Accessories No 4", "Shirt", "T-Shirt"].includes(category))
              .sort(([a], [b]) => {
                // Order: Uniform No 3, Uniform No 4, Accessories No 3, Accessories No 4, Shirt
                const order = ["Uniform No 3", "Uniform No 4", "Accessories No 3", "Accessories No 4", "Shirt", "T-Shirt"];
                return order.indexOf(a) - order.indexOf(b);
              })
              .map(([category, itemTypes]) => {
                const isExpanded = expandedCategories.has(category);
                // Normalize category name for display (T-Shirt -> Shirt)
                const displayCategory = category === "T-Shirt" ? "Shirt" : category;
                
                return (
                  <div key={category} className="border-b border-gray-200">
                    <button
                      onClick={() => toggleCategory(category)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition ${
                        isExpanded ? "bg-gray-50" : ""
                      }`}
                    >
                      <span className="font-medium text-gray-900">{displayCategory}</span>
                      {isExpanded ? (
                        <ChevronUpIcon className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-4 py-4 bg-white space-y-6 max-h-[600px] overflow-y-auto">
                    {Object.entries(itemTypes)
                      .sort(([itemTypeA, sizesA], [itemTypeB, sizesB]) => {
                        // Get predefined order for both items
                        const orderA = getItemOrder(category, itemTypeA);
                        const orderB = getItemOrder(category, itemTypeB);
                        
                        // If both have predefined order, sort by order
                        if (orderA !== 999 && orderB !== 999) {
                          return orderA - orderB;
                        }
                        
                        // If only one has predefined order, it comes first
                        if (orderA !== 999) return -1;
                        if (orderB !== 999) return 1;
                        
                        // If neither has predefined order, sort alphabetically
                        return itemTypeA.localeCompare(itemTypeB);
                      })
                      .map(([itemType, sizes]) => {
                      const sizeEntries = Object.entries(sizes);
                      const hasSizes = sizeEntries.some(([size]) => size !== "N/A" && size !== null);
                      
                      // Sort sizes logically
                      const sizeOrder = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "6 1/2", "6 5/8", "6 3/4", "6 7/8", "7", "7 1/8", "7 1/4", "7 3/8", "7 1/2", "7 5/8", "7 3/4", "7 7/8", "8", "8 1/8", "8 1/4", "8 3/8"];
                      const sortedSizes = hasSizes 
                        ? sizeEntries
                            .filter(([size]) => size !== "N/A" && size !== null)
                            .sort(([a], [b]) => {
                              const aIndex = sizeOrder.indexOf(a);
                              const bIndex = sizeOrder.indexOf(b);
                              if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                              if (aIndex !== -1) return -1;
                              if (bIndex !== -1) return 1;
                              return a.localeCompare(b);
                            })
                        : sizeEntries;
                      
                      return (
                        <div key={itemType} className="border-2 border-orange-200 rounded-lg p-4 bg-gray-50/80 backdrop-blur-sm">
                          <h4 className="font-semibold text-gray-800 mb-3">{itemType}</h4>
                          {hasSizes ? (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg border-2 border-orange-300">
                                <thead className="bg-gray-100 border-b-2 border-orange-300">
                                  <tr>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 uppercase border-r border-orange-200">Size</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 uppercase border-r border-orange-200">Quantity</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 uppercase">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-orange-100">
                                  {sortedSizes.map(([size, data]) => {
                                    const statusColor = 
                                      data.status === "In Stock" ? "bg-green-100 text-green-800" :
                                      data.status === "Low Stock" ? "bg-yellow-100 text-yellow-800" :
                                      "bg-red-100 text-red-800";
                                    
                                    return (
                                      <tr key={size} className="hover:bg-orange-50/50 border-b border-orange-100">
                                        <td className="px-4 py-2 text-sm font-medium text-gray-900 text-center border-r border-orange-200">{size}</td>
                                        <td className="px-4 py-2 text-sm text-center font-semibold text-gray-700 border-r border-orange-200">{data.quantity}</td>
                                        <td className="px-4 py-2 text-center">
                                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                                            {data.status}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg border-2 border-orange-300">
                                <thead className="bg-gray-100 border-b-2 border-orange-300">
                                  <tr>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 uppercase border-r border-orange-200">Size</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 uppercase border-r border-orange-200">Quantity</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 uppercase">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-orange-100">
                                  {(() => {
                                    const totalQuantity = sizeEntries.reduce((sum, [, data]) => sum + data.quantity, 0);
                                    const status = sizeEntries[0]?.[1].status || "N/A";
                                    const statusColor = 
                                      status === "In Stock" ? "bg-green-100 text-green-800" :
                                      status === "Low Stock" ? "bg-yellow-100 text-yellow-800" :
                                      "bg-red-100 text-red-800";
                                    
                                    return (
                                      <tr className="hover:bg-orange-50/50 border-b border-orange-100">
                                        <td className="px-4 py-2 text-sm font-medium text-gray-900 text-center border-r border-orange-200">N/A</td>
                                        <td className="px-4 py-2 text-sm text-center font-semibold text-gray-700 border-r border-orange-200">{totalQuantity}</td>
                                        <td className="px-4 py-2 text-center">
                                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                                            {status}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                      })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

