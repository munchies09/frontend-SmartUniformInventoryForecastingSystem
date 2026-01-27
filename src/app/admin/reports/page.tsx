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

interface ReportsPageProps {
  hideHeaderActions?: boolean;
}

export default function ReportsPage({ hideHeaderActions = false }: ReportsPageProps) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK">("ALL");
  const [selectedChartCategory, setSelectedChartCategory] = useState<string>("Uniform No 3");
  const [selectedChartItemType, setSelectedChartItemType] = useState<string>("");
  const [showStatusDetails, setShowStatusDetails] = useState<boolean>(true);

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
            let category = item.category || "Unknown";
            const itemType = item.type || item.name || "Unknown";
            const size = item.size || "N/A";

            // IMPORTANT NORMALIZATION
            // Beret should always belong to "Uniform No 3", never "Accessories No 3"
            const itemTypeLower = itemType.toLowerCase().trim();
            const categoryLower = category.toLowerCase().trim();
            if (itemTypeLower === "beret" && categoryLower === "accessories no 3") {
              category = "Uniform No 3";
            }
            
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
            // CRITICAL: Filter out "Beret" from "Accessories No 3" (Beret belongs to Uniform No 3 only)
            if (category === "Accessories No 3" && itemType.toLowerCase().trim() === "beret") {
              return; // Skip this item
            }
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

  if (loading && !hideHeaderActions) {
    return (
      <div className="text-center py-12">
        <div className="text-lg text-gray-600">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {!hideHeaderActions && (
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
      )}

      {/* Pie Chart Dashboard */}
      {reportData && (
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md border-2 border-orange-300 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ChartBarIcon className="w-6 h-6 text-blue-700" />
            Inventory Status Charts
          </h2>
          
          {/* Category Slicers */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-800 mb-3">Select Category:</p>
            <div className="flex flex-wrap gap-2">
              {["Uniform No 3", "Uniform No 4", "Accessories No 3", "Accessories No 4", "Shirt"].map((category) => {
                const isActive = selectedChartCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setSelectedChartCategory(category);
                      setSelectedChartItemType("");
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-700 shadow-md"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pie Charts Section */}
          {(() => {
            const isAccessoryCategory = selectedChartCategory === "Accessories No 3" || selectedChartCategory === "Accessories No 4";
            
            if (isAccessoryCategory) {
              // For accessories: Show each individual item with its stock status
              const categoryItems = reportData.inventoryDetails.bySize[selectedChartCategory] || {};
              const itemTypes = Object.keys(categoryItems);
              
              if (itemTypes.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <p>No inventory data available for {selectedChartCategory}</p>
                  </div>
                );
              }

              // Get each item's quantity and status (accessories have no sizes, so use "N/A" or first available size)
              const itemsData: Array<{ name: string; quantity: number; status: string; color: string }> = [];
              
              itemTypes.forEach((itemType) => {
                const sizes = categoryItems[itemType] || {};
                // For accessories, get quantity from "N/A" or first available size entry
                const sizeKey = sizes["N/A"] ? "N/A" : Object.keys(sizes)[0] || "N/A";
                const itemData = sizes[sizeKey];
                
                if (itemData) {
                  const quantity = itemData.quantity || 0;
                  const status = itemData.status || (quantity > 10 ? "In Stock" : quantity > 0 ? "Low Stock" : "Out of Stock");
                  
                  // Determine color based on status
                  let color = "#10b981"; // Green for In Stock
                  if (status === "Low Stock") color = "#fbbf24"; // Yellow
                  if (status === "Out of Stock") color = "#ef4444"; // Red
                  
                  itemsData.push({
                    name: itemType,
                    quantity,
                    status,
                    color
                  });
                }
              });

              // Sort items by status priority (Out of Stock first, then Low Stock, then In Stock)
              itemsData.sort((a, b) => {
                const priority = (status: string) => status === "Out of Stock" ? 0 : status === "Low Stock" ? 1 : 2;
                return priority(a.status) - priority(b.status);
              });

              const total = itemsData.reduce((sum, item) => sum + item.quantity, 0);
              const totalItems = itemsData.length;
              
              if (totalItems === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <p>No items available for {selectedChartCategory}</p>
                  </div>
                );
              }

              // Create pie data with each item as a segment
              const pieData = itemsData.map(item => ({
                label: item.name,
                value: item.quantity,
                status: item.status,
                color: item.color,
                percentage: total > 0 ? Math.round((item.quantity / total) * 100) : 0
              }));

              let currentAngle = -90; // Start from top
              const outerRadius = 120;
              const innerRadius = 60; // Donut hole
              const centerX = 150;
              const centerY = 150;
              const svgSize = 300;

              return (
                <div className="flex flex-col items-center">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">{selectedChartCategory} - Status Overview</h3>
                  <div className="flex flex-col md:flex-row items-start gap-8 w-full">
                    <div className="relative flex-shrink-0">
                      <svg width={svgSize} height={svgSize} className="transform">
                        {pieData.map((segment, index) => {
                          const percentage = (segment.value / total) * 100;
                          const angle = (percentage / 100) * 360;
                          const largeArcFlag = angle > 180 ? 1 : 0;
                          
                          // Outer arc points
                          const x1 = centerX + outerRadius * Math.cos((currentAngle * Math.PI) / 180);
                          const y1 = centerY + outerRadius * Math.sin((currentAngle * Math.PI) / 180);
                          const x2 = centerX + outerRadius * Math.cos(((currentAngle + angle) * Math.PI) / 180);
                          const y2 = centerY + outerRadius * Math.sin(((currentAngle + angle) * Math.PI) / 180);
                          
                          // Inner arc points
                          const x3 = centerX + innerRadius * Math.cos(((currentAngle + angle) * Math.PI) / 180);
                          const y3 = centerY + innerRadius * Math.sin(((currentAngle + angle) * Math.PI) / 180);
                          const x4 = centerX + innerRadius * Math.cos((currentAngle * Math.PI) / 180);
                          const y4 = centerY + innerRadius * Math.sin((currentAngle * Math.PI) / 180);
                          
                          // Donut path
                          const pathData = [
                            `M ${x1} ${y1}`,
                            `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                            `L ${x3} ${y3}`,
                            `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
                            "Z"
                          ].join(" ");

                          // Calculate label position (middle of segment)
                          const midAngle = currentAngle + angle / 2;
                          const labelRadius = (outerRadius + innerRadius) / 2;
                          const labelX = centerX + labelRadius * Math.cos((midAngle * Math.PI) / 180);
                          const labelY = centerY + labelRadius * Math.sin((midAngle * Math.PI) / 180);

                          const segmentAngle = currentAngle;
                          currentAngle += angle;

                          return (
                            <g key={index}>
                              <path
                                d={pathData}
                                fill={segment.color}
                                stroke="white"
                                strokeWidth="3"
                                className="transition-opacity hover:opacity-90 cursor-pointer"
                              />
                              {/* Label on slice: show item name and quantity */}
                              {percentage > 5 && (
                                <text
                                  x={labelX}
                                  y={labelY}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  className="fill-white font-bold text-xs pointer-events-none"
                                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                                >
                                  <tspan x={labelX} dy="-0.3em">
                                    {segment.label}
                                  </tspan>
                                  <tspan x={labelX} dy="1.1em">
                                    {segment.value}
                                  </tspan>
                                </text>
                              )}
                            </g>
                          );
                        })}
                          {/* Center text */}
                          <text
                            x={centerX}
                            y={centerY - 10}
                            textAnchor="middle"
                            className="fill-gray-700 font-bold text-lg"
                          >
                            Total
                          </text>
                          <text
                            x={centerX}
                            y={centerY + 15}
                            textAnchor="middle"
                            className="fill-gray-900 font-bold text-2xl"
                          >
                            {totalItems}
                          </text>
                        </svg>
                      </div>
                      <div className="flex-1 space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                            Status Breakdown
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowStatusDetails(!showStatusDetails)}
                            className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                          >
                            <span>{showStatusDetails ? "Hide" : "Show"}</span>
                            {showStatusDetails ? (
                              <ChevronUpIcon className="w-4 h-4" />
                            ) : (
                              <ChevronDownIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {showStatusDetails && (
                          <>
                            {pieData.map((segment, index) => (
                              <div key={index} className="flex items-center justify-between p-2 hover:bg-white rounded transition">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="w-5 h-5 rounded" style={{ backgroundColor: segment.color }} />
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-gray-800">{segment.label}</span>
                                    <span className={`text-xs font-medium ${
                                      segment.status === "In Stock" ? "text-green-700" :
                                      segment.status === "Low Stock" ? "text-yellow-700" : "text-red-700"
                                    }`}>
                                      {segment.status}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-sm font-bold text-gray-900 min-w-[60px] text-right">
                                    {segment.value}
                                  </span>
                                </div>
                              </div>
                            ))}
                            <div className="pt-2 border-t border-gray-300 mt-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-gray-800">Total Items</span>
                                <span className="text-sm font-bold text-gray-900">{totalItems}</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
            } else {
              // For items with sizes: Show pie chart per size for selected item type
              const categorySizes = reportData.inventoryDetails.bySize[selectedChartCategory] || {};
              const itemTypes = Object.keys(categorySizes);
              
              if (itemTypes.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <p>No inventory data available for {selectedChartCategory}</p>
                  </div>
                );
              }

              // Item Type Slicer
              const selectedItemData = selectedChartItemType 
                ? categorySizes[selectedChartItemType] 
                : categorySizes[itemTypes[0]] || {};
              
              const currentItemType = selectedChartItemType || itemTypes[0];

              // Get all sizes for this item type
              const sizes = Object.keys(selectedItemData).sort((a, b) => {
                const sizeOrder = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "6 1/2", "6 5/8", "6 3/4", "6 7/8", "7", "7 1/8", "7 1/4", "7 3/8", "7 1/2", "7 5/8", "7 3/4", "7 7/8", "8", "8 1/8", "8 1/4", "8 3/8"];
                const aIndex = sizeOrder.indexOf(a);
                const bIndex = sizeOrder.indexOf(b);
                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                if (aIndex !== -1) return -1;
                if (bIndex !== -1) return 1;
                return a.localeCompare(b);
              });

              return (
                <div>
                  {/* Item Type Slicer */}
                  {itemTypes.length > 1 && (
                    <div className="mb-6">
                      <p className="text-sm font-semibold text-gray-800 mb-3">Select Item Type:</p>
                      <div className="flex flex-wrap gap-2">
                        {itemTypes.map((itemType) => {
                          const isActive = currentItemType === itemType;
                          return (
                            <button
                              key={itemType}
                              type="button"
                              onClick={() => setSelectedChartItemType(itemType)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                                isActive
                                  ? "bg-orange-500 text-white border-orange-600 shadow-md"
                                  : "bg-white text-gray-700 border-gray-300 hover:border-orange-400 hover:bg-orange-50"
                              }`}
                            >
                              {itemType}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Pie Chart showing each size individually */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">{currentItemType} - Status by Size</h3>
                    
                    {(() => {
                      // Create pie data with each size as a separate segment
                      const sizesData: Array<{ name: string; quantity: number; status: string; color: string }> = [];
                      
                      sizes.forEach((size) => {
                        const sizeData = selectedItemData[size];
                        if (!sizeData) return;
                        
                        const quantity = sizeData.quantity || 0;
                        const status = sizeData.status || (quantity > 10 ? "In Stock" : quantity > 0 ? "Low Stock" : "Out of Stock");
                        
                        // Determine color based on status
                        let color = "#10b981"; // Green for In Stock
                        if (status === "Low Stock") color = "#fbbf24"; // Yellow
                        if (status === "Out of Stock") color = "#ef4444"; // Red

                        // Customize size label for certain item types
                        const lowerType = currentItemType.toLowerCase();
                        let displaySize = size;

                        // For PVC Shoes and Boot, display size with "UK" prefix (e.g. UK 7)
                        if (lowerType.includes("pvc shoes") || lowerType.includes("boot")) {
                          displaySize = `UK ${size}`;
                        }
                        // For Beret, prefix with the word "Size" (e.g. Size 7 1/2)
                        else if (lowerType === "beret" || lowerType.includes(" beret")) {
                          displaySize = `Size ${size}`;
                        }
                        
                        sizesData.push({
                          name: displaySize,
                          quantity,
                          status,
                          color
                        });
                      });

                      const totalQuantity = sizesData.reduce((sum, item) => sum + item.quantity, 0);
                      const totalSizes = sizesData.length;
                      
                      if (totalSizes === 0) {
                        return (
                          <div className="text-center py-8 text-gray-500">
                            <p>No size data available for {currentItemType}</p>
                          </div>
                        );
                      }
                      
                      // Create pie data with each size as a segment
                      // Use equal angles for all sizes so zero-quantity sizes still appear
                      const equalAngle = 360 / totalSizes;
                      const pieData = sizesData.map(item => ({
                        label: item.name,
                        value: item.quantity,
                        status: item.status,
                        color: item.color,
                        percentage: totalQuantity > 0 ? Math.round((item.quantity / totalQuantity) * 100) : 0,
                        angle: equalAngle // Use equal angle for all sizes
                      }));
                      
                      let currentAngle = -90; // Start from top
                      const outerRadius = 120;
                      const innerRadius = 60; // Donut hole
                      const centerX = 150;
                      const centerY = 150;
                      const svgSize = 300;
                      
                      return (
                        <div className="flex flex-col md:flex-row items-start gap-8 w-full">
                          <div className="relative flex-shrink-0">
                            <svg width={svgSize} height={svgSize} className="transform">
                              {pieData.map((segment, index) => {
                                // Use equal angle for all sizes so zero-quantity sizes appear
                                const angle = segment.angle;
                                const largeArcFlag = angle > 180 ? 1 : 0;
                                
                                // Outer arc points
                                const x1 = centerX + outerRadius * Math.cos((currentAngle * Math.PI) / 180);
                                const y1 = centerY + outerRadius * Math.sin((currentAngle * Math.PI) / 180);
                                const x2 = centerX + outerRadius * Math.cos(((currentAngle + angle) * Math.PI) / 180);
                                const y2 = centerY + outerRadius * Math.sin(((currentAngle + angle) * Math.PI) / 180);
                                
                                // Inner arc points
                                const x3 = centerX + innerRadius * Math.cos(((currentAngle + angle) * Math.PI) / 180);
                                const y3 = centerY + innerRadius * Math.sin(((currentAngle + angle) * Math.PI) / 180);
                                const x4 = centerX + innerRadius * Math.cos((currentAngle * Math.PI) / 180);
                                const y4 = centerY + innerRadius * Math.sin((currentAngle * Math.PI) / 180);
                                
                                // Donut path
                                const pathData = [
                                  `M ${x1} ${y1}`,
                                  `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                                  `L ${x3} ${y3}`,
                                  `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
                                  "Z"
                                ].join(" ");

                                // Calculate label position (middle of segment)
                                const midAngle = currentAngle + angle / 2;
                                const labelRadius = (outerRadius + innerRadius) / 2;
                                const labelX = centerX + labelRadius * Math.cos((midAngle * Math.PI) / 180);
                                const labelY = centerY + labelRadius * Math.sin((midAngle * Math.PI) / 180);

                                const segmentAngle = currentAngle;
                                currentAngle += angle;

                                return (
                                  <g key={index}>
                                    <path
                                      d={pathData}
                                      fill={segment.color}
                                      stroke="white"
                                      strokeWidth="3"
                                      className="transition-opacity hover:opacity-90 cursor-pointer"
                                    />
                                    {/* Label on slice: show size name and quantity */}
                                    {/* Show label for all sizes, even if quantity is 0 */}
                                    {angle > 1 && (
                                      <text
                                        x={labelX}
                                        y={labelY}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        className="fill-white font-bold text-xs pointer-events-none"
                                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                                      >
                                        <tspan x={labelX} dy="-0.3em">
                                          {segment.label}
                                        </tspan>
                                        <tspan x={labelX} dy="1.1em">
                                          {segment.value}
                                        </tspan>
                                      </text>
                                    )}
                                  </g>
                                );
                              })}
                              {/* Center text */}
                              <text
                                x={centerX}
                                y={centerY - 10}
                                textAnchor="middle"
                                className="fill-gray-700 font-bold text-lg"
                              >
                                Total Sizes
                              </text>
                              <text
                                x={centerX}
                                y={centerY + 15}
                                textAnchor="middle"
                                className="fill-gray-900 font-bold text-2xl"
                              >
                                {totalSizes}
                              </text>
                            </svg>
                          </div>
                          <div className="flex-1 space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                                Size Status Breakdown
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowStatusDetails(!showStatusDetails)}
                                className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                              >
                                <span>{showStatusDetails ? "Hide" : "Show"}</span>
                                {showStatusDetails ? (
                                  <ChevronUpIcon className="w-4 h-4" />
                                ) : (
                                  <ChevronDownIcon className="w-4 h-4" />
                                )}
                              </button>
                            </div>

                            {showStatusDetails && (
                              <>
                                {pieData.map((segment, index) => (
                                  <div key={index} className="flex items-center justify-between p-2 hover:bg-white rounded transition">
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="w-5 h-5 rounded" style={{ backgroundColor: segment.color }} />
                                      <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-gray-800">{segment.label}</span>
                                        <span className={`text-xs font-medium ${
                                          segment.status === "In Stock" ? "text-green-700" :
                                          segment.status === "Low Stock" ? "text-yellow-700" : "text-red-700"
                                        }`}>
                                          {segment.status}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <span className="text-sm font-bold text-gray-900 min-w-[60px] text-right">{segment.value}</span>
                                    </div>
                                  </div>
                                ))}
                                <div className="pt-2 border-t border-gray-300 mt-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-gray-800">Total Sizes</span>
                                    <span className="text-sm font-bold text-gray-900">{totalSizes}</span>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            }
          })()}
        </div>
      )}
    </div>
  );
}

