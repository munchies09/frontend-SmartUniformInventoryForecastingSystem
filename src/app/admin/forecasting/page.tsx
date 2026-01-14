"use client";

import { useState, useEffect, useRef } from "react";
import { ChartBarIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { recommendedStockService, RecommendedStockItem, sortGraphData, groupByType } from "@/services/recommendedStockService";
import { forecastService } from "@/services/forecastService";

interface GraphData {
  size: string | null;
  recommendedStock: number;
  forecastedDemand?: number;
}

// Helper function to transform "BAJU" to "UNIFORM" and update gender labels for display
const transformTypeForDisplay = (type: string): string => {
  if (!type) return type;
  // Replace longer patterns first to avoid partial replacements
  return type
    .replace(/BAJU_NO_3_LELAKI/gi, 'UNIFORM_NO_3_MALE')
    .replace(/BAJU_NO_3_PEREMPUAN/gi, 'UNIFORM_NO_3_FEMALE')
    .replace(/UNIFORM_NO_3_LELAKI/gi, 'UNIFORM_NO_3_MALE')
    .replace(/UNIFORM_NO_3_PEREMPUAN/gi, 'UNIFORM_NO_3_FEMALE')
    .replace(/BAJU_NO_3/gi, 'UNIFORM_NO_3')
    .replace(/BAJU_NO_4/gi, 'UNIFORM_NO_4')
    .replace(/BAJU/gi, 'UNIFORM');
};

export default function ForecastingPage() {
  const [recommendations, setRecommendations] = useState<RecommendedStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [graphData, setGraphData] = useState<GraphData[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const graphCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  // Auto-select first type when recommendations are loaded
  useEffect(() => {
    if (recommendations.length > 0 && !selectedType) {
      const firstType = Array.from(new Set(recommendations.map((r) => r.type))).filter(Boolean)[0];
      if (firstType) {
        const firstRec = recommendations.find(r => r.type === firstType);
        if (firstRec) {
          setSelectedCategory(firstRec.category);
          setSelectedType(firstType);
        }
      }
    }
  }, [recommendations, selectedType]);

  useEffect(() => {
    if (selectedType) {
      // Always find category from selected type (in case it wasn't set)
      const typeRec = recommendations.find(r => r.type === selectedType);
      if (typeRec) {
        const categoryToUse = selectedCategory || typeRec.category;
        if (categoryToUse) {
          fetchGraphData(categoryToUse, selectedType);
        }
      } else {
        setGraphData([]);
      }
    } else {
      setGraphData([]);
    }
  }, [selectedCategory, selectedType, recommendations]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      // FIX 2: Remove latest: true - it freezes data and prevents seeing new imports
      const filters: any = {};

      const result = await recommendedStockService.getAllRecommendations(filters);
      
      console.log('FETCHED RECOMMENDATIONS:', result.recommendations?.length || 0);
      if (result.recommendations && result.recommendations.length > 0) {
        console.log('FIRST REC CATEGORY:', result.recommendations[0]?.category);
        console.log('FIRST REC TYPE:', result.recommendations[0]?.type);
      }

      if (result.success && result.recommendations) {
        setRecommendations(result.recommendations);
      } else {
        setRecommendations([]);
      }
    } catch (error: any) {
      console.error("Error fetching recommendations:", error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGraphData = async (category: string, type: string) => {
    try {
      // Generate graph data directly from recommendations
      const typeRecommendations = recommendations.filter(
        r => r.category === category && r.type === type
      );
      
      if (typeRecommendations.length > 0) {
        const graphDataItems: GraphData[] = typeRecommendations.map(rec => ({
          size: rec.size || null,
          recommendedStock: rec.recommendedStock,
          forecastedDemand: rec.forecastedDemand
        }));
        
        // Sort the data by size - convert to format expected by sortGraphData
        const graphDataForSorting = graphDataItems.map(item => ({
          size: item.size || 'N/A',
          recommendedStock: item.recommendedStock
        }));
        const sorted = sortGraphData(graphDataForSorting, type);
        
        // FIX 2: Preserve order - map directly from sorted array, don't use find()
        // Create a map for quick forecastedDemand lookup
        const forecastMap = new Map(
          graphDataItems.map(item => [
            item.size || 'N/A',
            item.forecastedDemand
          ])
        );
        
        // Convert back to GraphData format - preserve sorted order
        const sortedGraphData: GraphData[] = sorted.map(item => ({
          size: item.size === 'N/A' ? null : item.size,
          recommendedStock: item.recommendedStock,
          forecastedDemand: forecastMap.get(item.size)
        }));
        
        setGraphData(sortedGraphData);
      } else {
        setGraphData([]);
      }
    } catch (error) {
      console.error("Error generating graph data:", error);
      setGraphData([]);
    }
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    // Automatically find and set the category for this type
    const typeRec = recommendations.find(r => r.type === type);
    if (typeRec) {
      setSelectedCategory(typeRec.category);
    }
  };

  const handleRunForecast = async () => {
    try {
      setForecastLoading(true);
      
      // Show loading alert
      Swal.fire({
        title: "Generating Forecast...",
        html: "Please wait while we analyze historical data and generate recommendations.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const result = await forecastService.runForecast();
      
      if (result.success) {
        await Swal.fire({
          icon: "success",
          title: "Forecast Generated!",
          html: `
            <div style="text-align: left;">
              <p style="margin-bottom: 10px;">${result.message || "Successfully generated forecast recommendations."}</p>
              ${result.generated ? `<p style="color: #666; font-size: 14px;">Generated ${result.generated} recommendations.</p>` : ''}
            </div>
          `,
          confirmButtonColor: "#1d4ed8",
          timer: 3000,
          timerProgressBar: true,
        });
        
        // Refresh recommendations to show new data
        // The useEffect will auto-select the first type after recommendations are loaded
        await fetchRecommendations();
      } else {
        Swal.fire({
          icon: "error",
          title: "Forecast Failed",
          html: `
            <div style="text-align: left;">
              <p style="margin-bottom: 10px; font-weight: bold;">${result.message || "Failed to generate forecast."}</p>
              ${result.error ? `<p style="color: #666; font-size: 14px;">Error: ${result.error}</p>` : ''}
              <p style="color: #666; font-size: 14px; margin-top: 10px;">Please ensure a pre-trained model is available and try again.</p>
            </div>
          `,
          confirmButtonColor: "#1d4ed8",
          width: '500px',
        });
      }
    } catch (error: any) {
      console.error("Error running forecast:", error);
      
      Swal.fire({
        icon: "error",
        title: "Forecast Error",
        html: `
          <div style="text-align: left;">
            <p style="margin-bottom: 10px; font-weight: bold;">${error.message || "An error occurred while generating the forecast."}</p>
            <p style="color: #666; font-size: 14px; margin-top: 10px;">Please check that:</p>
            <ul style="color: #666; font-size: 14px; margin-left: 20px; margin-top: 5px;">
              <li>A pre-trained ML model is uploaded to the system</li>
              <li>Historical data is available in the database</li>
              <li>The backend service is running correctly</li>
            </ul>
          </div>
        `,
        confirmButtonColor: "#1d4ed8",
        width: '500px',
      });
    } finally {
      setForecastLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (recommendations.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Data",
        text: "No recommendations available to download.",
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }

    try {
      // Show loading alert
      Swal.fire({
        title: "Preparing Download...",
        html: "Generating Excel file and graph image...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Group recommendations by type
      const groupedByType: Record<string, RecommendedStockItem[]> = {};
      recommendations.forEach((rec) => {
        const type = rec.type || "Unknown";
        if (!groupedByType[type]) {
          groupedByType[type] = [];
        }
        groupedByType[type].push(rec);
      });

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Create a worksheet for each type
      Object.keys(groupedByType).forEach((type) => {
        const typeRecommendations = groupedByType[type];
        
        // Sort by size (same logic as table)
        const sorted = [...typeRecommendations].sort((a, b) => {
          const aSize = (a.size || 'N/A').toUpperCase().trim();
          const bSize = (b.size || 'N/A').toUpperCase().trim();
          
          if (type.toUpperCase().includes("BOOT")) {
            const aNum = Number(aSize) || 0;
            const bNum = Number(bSize) || 0;
            return aNum - bNum;
          }
          
          const CLOTHING_SIZE_ORDER = [
            "XXS", "XS", "S", "M", "L",
            "XL", "2XL", "XXL",
            "3XL", "XXXL",
            "4XL", "5XL"
          ];
          
          if (type.toUpperCase().includes("BAJU") || type.toUpperCase().includes("UNIFORM")) {
            const aIndex = CLOTHING_SIZE_ORDER.indexOf(aSize);
            const bIndex = CLOTHING_SIZE_ORDER.indexOf(bSize);
            
            if (aIndex !== -1 && bIndex !== -1) {
              return aIndex - bIndex;
            }
            if (aIndex === -1 && bIndex === -1) return 0;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
          }
          
          return aSize.localeCompare(bSize);
        });

        // Prepare data for Excel
        const excelData = sorted.map((rec) => ({
          Size: rec.size || "N/A",
          "Forecasted Demand": rec.forecastedDemand || "N/A",
          "Recommended Stock": rec.recommendedStock || 0,
        }));

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // Set column widths
        ws["!cols"] = [
          { wch: 10 }, // Size
          { wch: 18 }, // Forecasted Demand
          { wch: 18 }, // Recommended Stock
        ];

        // Add worksheet to workbook (sanitize sheet name for Excel)
        const sheetName = type.length > 31 ? type.substring(0, 31) : type;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      // Generate filename with current date
      const date = new Date().toISOString().split("T")[0];
      const excelFilename = `Recommended_Stock_All_Types_${date}.xlsx`;

      // Download Excel file
      XLSX.writeFile(wb, excelFilename);

      // Draw graph directly on canvas and download (simpler approach, avoids html2canvas issues)
      let graphDownloaded = false;
      let graphFilename = '';
      
      if (graphData.length > 0 && selectedType) {
        try {
          graphFilename = `Forecast_Graph_${transformTypeForDisplay(selectedType).replace(/[^a-zA-Z0-9]/g, '_')}_${date}.png`;
          
          // Create a canvas element to draw the graph
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error("Could not get canvas context");
          }
          
          // Canvas dimensions
          const padding = 60;
          const barWidth = 40;
          const barSpacing = 10;
          const chartWidth = Math.max(800, graphData.length * (barWidth + barSpacing) + padding * 2);
          const chartHeight = 500;
          
          canvas.width = chartWidth;
          canvas.height = chartHeight;
          
          // Fill white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, chartWidth, chartHeight);
          
          // Draw title
          ctx.fillStyle = '#111827';
          ctx.font = 'bold 20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(transformTypeForDisplay(selectedType), chartWidth / 2, 30);
          ctx.font = '14px Arial';
          ctx.fillText('Recommended Stock by Size', chartWidth / 2, 50);
          
          // Calculate chart area
          const chartAreaX = padding;
          const chartAreaY = 80;
          const chartAreaWidth = chartWidth - padding * 2;
          const chartAreaHeight = chartHeight - chartAreaY - padding;
          
          // Find max value for scaling
          const maxStock = Math.max(...graphData.map(d => d.recommendedStock), 1);
          
          // Draw Y-axis
          ctx.strokeStyle = '#fb923c';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(chartAreaX, chartAreaY);
          ctx.lineTo(chartAreaX, chartAreaY + chartAreaHeight);
          ctx.stroke();
          
          // Draw X-axis
          ctx.beginPath();
          ctx.moveTo(chartAreaX, chartAreaY + chartAreaHeight);
          ctx.lineTo(chartAreaX + chartAreaWidth, chartAreaY + chartAreaHeight);
          ctx.stroke();
          
          // Draw Y-axis labels
          ctx.fillStyle = '#2563eb';
          ctx.font = '12px Arial';
          ctx.textAlign = 'right';
          for (let i = 0; i <= 4; i++) {
            const value = Math.round((maxStock / 4) * (4 - i));
            const y = chartAreaY + (chartAreaHeight / 4) * i;
            ctx.fillText(value.toString(), chartAreaX - 10, y + 4);
            // Draw grid line
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(chartAreaX, y);
            ctx.lineTo(chartAreaX + chartAreaWidth, y);
            ctx.stroke();
          }
          
          // Draw bars
          const barXStart = chartAreaX + 20;
          graphData.forEach((item, index) => {
            const x = barXStart + index * (barWidth + barSpacing);
            const height = (item.recommendedStock / maxStock) * chartAreaHeight;
            const y = chartAreaY + chartAreaHeight - height;
            
            // Determine bar color
            const percentage = (item.recommendedStock / maxStock) * 100;
            let barColor = '#eab308'; // yellow (low)
            if (percentage > 75) {
              barColor = '#16a34a'; // green (high)
            } else if (percentage > 40) {
              barColor = '#2563eb'; // blue (medium)
            }
            
            // Draw bar
            ctx.fillStyle = barColor;
            ctx.fillRect(x, y, barWidth, height);
            
            // Draw border
            ctx.strokeStyle = '#1f2937';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, barWidth, height);
            
            // Draw value label on top of bar
            ctx.fillStyle = '#111827';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(item.recommendedStock.toString(), x + barWidth / 2, Math.max(y - 5, chartAreaY - 10));
            
            // Draw size label below
            ctx.fillStyle = '#ea580c';
            ctx.font = '10px Arial';
            ctx.fillText(item.size || 'N/A', x + barWidth / 2, chartAreaY + chartAreaHeight + 15);
            
            // Draw forecasted demand if available
            if (item.forecastedDemand !== undefined) {
              ctx.fillStyle = '#6b7280';
              ctx.font = '9px Arial';
              ctx.fillText(`(${item.forecastedDemand})`, x + barWidth / 2, chartAreaY + chartAreaHeight + 27);
            }
          });
          
          // Try to download as PNG first, then PDF as fallback
          try {
            // Try PNG download
            const pngBlob = await new Promise<Blob | null>((resolve) => {
              canvas.toBlob((blob) => {
                resolve(blob);
              }, 'image/png');
            });
            
            if (pngBlob) {
              // Download PNG
              const url = URL.createObjectURL(pngBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = graphFilename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              graphDownloaded = true;
            } else {
              // PNG failed, try PDF
              throw new Error("PNG blob creation failed, trying PDF");
            }
          } catch (pngError) {
            console.warn("PNG download failed, trying PDF:", pngError);
            
            // Fallback to PDF
            try {
              const pdfFilename = graphFilename.replace('.png', '.pdf');
              const pdf = new jsPDF('landscape', 'mm', 'a4');
              
              // Convert canvas to image data URL
              const imgData = canvas.toDataURL('image/png');
              
              // Get PDF dimensions
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = pdf.internal.pageSize.getHeight();
              const margin = 10;
              
              // Calculate scaling to fit
              const imgAspectRatio = canvas.width / canvas.height;
              const pdfAspectRatio = pdfWidth / pdfHeight;
              
              let finalWidth: number;
              let finalHeight: number;
              
              if (imgAspectRatio > pdfAspectRatio) {
                finalWidth = pdfWidth - (margin * 2);
                finalHeight = finalWidth / imgAspectRatio;
              } else {
                finalHeight = pdfHeight - (margin * 2);
                finalWidth = finalHeight * imgAspectRatio;
              }
              
              // Center the image
              const xOffset = (pdfWidth - finalWidth) / 2;
              const yOffset = (pdfHeight - finalHeight) / 2;
              
              pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
              pdf.save(pdfFilename);
              
              graphDownloaded = true;
              graphFilename = pdfFilename;
            } catch (pdfError) {
              console.error("PDF download also failed:", pdfError);
              graphDownloaded = false;
              
              // Last resort: try direct data URL download
              try {
                const dataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = graphFilename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                graphDownloaded = true;
              } catch (finalError) {
                console.error("All download methods failed:", finalError);
                graphDownloaded = false;
              }
            }
          }
        } catch (graphError: any) {
          console.error("Error creating graph canvas:", graphError);
          graphDownloaded = false;
        }
      }

      Swal.fire({
        icon: graphDownloaded || (selectedType && graphData.length === 0) ? "success" : "warning",
        title: graphDownloaded || (selectedType && graphData.length === 0) ? "Download Complete!" : "Partial Download",
        html: `
          <div style="text-align: left;">
            <p style="margin-bottom: 10px;">Successfully downloaded:</p>
            <ul style="margin-left: 20px; margin-top: 5px;">
              <li>✅ Excel file: <strong>${excelFilename}</strong></li>
              ${selectedType && graphData.length > 0 
                ? graphDownloaded
                  ? `<li>✅ Graph ${graphFilename.endsWith('.pdf') ? 'PDF' : 'PNG image'}: <strong>${graphFilename}</strong></li>`
                  : `<li>❌ Graph download: <span style="color: #dc2626;">Failed (tried PNG, PDF, and direct download)</span></li>`
                : '<li style="color: #666;">ℹ️ Graph: Not available (no graph displayed)</li>'}
            </ul>
            <p style="margin-top: 10px; color: #666; font-size: 14px;">${recommendations.length} recommendations across ${Object.keys(groupedByType).length} type(s)</p>
            ${!graphDownloaded && selectedType && graphData.length > 0
              ? '<p style="margin-top: 10px; color: #dc2626; font-size: 13px;">Note: Graph download failed. The Excel file contains all the data.</p>'
              : ''}
          </div>
        `,
        confirmButtonColor: "#1d4ed8",
        timer: graphDownloaded ? 3000 : 5000,
        timerProgressBar: true,
      });
    } catch (error: any) {
      console.error("Error downloading Excel:", error);
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: error.message || "An error occurred while downloading the file.",
        confirmButtonColor: "#1d4ed8",
      });
    }
  };


  // Filter recommendations by selected type
  const filteredRecommendations = recommendations.filter((rec) => {
    // Filter by selected type if one is selected
    const matchesType = !selectedType || rec.type === selectedType;
    
    return matchesType;
  });

  // Sort filtered recommendations by size
  const sortedRecommendations = [...filteredRecommendations].sort((a, b) => {
    const aSize = (a.size || 'N/A').toUpperCase().trim();
    const bSize = (b.size || 'N/A').toUpperCase().trim();
    
    // Use the same sorting logic as sortGraphData
    if (selectedType && selectedType.toUpperCase().includes("BOOT")) {
      // Numeric sorting for boots
      const aNum = Number(aSize) || 0;
      const bNum = Number(bSize) || 0;
      return aNum - bNum;
    }
    
    // Clothing size order
    const CLOTHING_SIZE_ORDER = [
      "XXS", "XS", "S", "M", "L",
      "XL", "2XL", "XXL",
      "3XL", "XXXL",
      "4XL", "5XL"
    ];
    
    if (selectedType && (selectedType.toUpperCase().includes("BAJU") || selectedType.toUpperCase().includes("UNIFORM"))) {
      const aIndex = CLOTHING_SIZE_ORDER.indexOf(aSize);
      const bIndex = CLOTHING_SIZE_ORDER.indexOf(bSize);
      
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
    }
    
    // Default: alphabetical
    return aSize.localeCompare(bSize);
  });

  // Get unique categories for filter
  const categories = Array.from(new Set(recommendations.map((r) => r.category))).filter(Boolean);

  // Get unique types for filter
  const types = Array.from(new Set(recommendations.map((r) => r.type))).filter(Boolean);

          // Get max value for graph scaling
          const maxStock = graphData.length > 0
            ? Math.max(...graphData.map(d => d.recommendedStock), 0)
            : 100;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Forecasting</h1>
          <p className="text-gray-600 mt-2">
            View forecasted demand and recommended stock levels generated using historical data analysis.
          </p>
        </div>
        <button
          onClick={handleRunForecast}
          disabled={forecastLoading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md"
        >
          <ChartBarIcon className="w-5 h-5" />
          {forecastLoading ? "Generating..." : "Forecast Uniform Demand"}
        </button>
      </div>

      {/* Info Banner */}
      {recommendations.length === 0 && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            📊 No recommended stock data available. Click <strong>"Forecast Uniform Demand"</strong> above to generate recommendations using the pre-trained ML model.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6">
        <div className="flex justify-end gap-2">
          <button
            onClick={handleDownloadExcel}
            disabled={filteredRecommendations.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Download Excel
          </button>
          <button
            onClick={fetchRecommendations}
            disabled={loading}
            className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Type Selection Buttons for Graph - Always visible */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Item Type to View Graph
        </label>
        {types.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {types.map((type) => (
              <button
                key={type}
                onClick={() => handleTypeSelect(type)}
                className={`px-4 py-2 rounded-lg transition font-medium ${
                  selectedType === type
                    ? "bg-blue-700 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {transformTypeForDisplay(type)}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No types available. Import recommended stock data first.</p>
        )}
      </div>

      {/* Graph Display */}
      {selectedCategory && selectedType && graphData.length > 0 && (
        <div ref={graphContainerRef} data-graph-container className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {transformTypeForDisplay(selectedType)}
              </h2>
              <p className="text-sm text-gray-600">Recommended Stock by Size</p>
            </div>
            <button
              onClick={async () => {
                if (!selectedType || graphData.length === 0) return;
                
                try {
                  const date = new Date().toISOString().split("T")[0];
                  const graphFilename = `Forecast_Graph_${transformTypeForDisplay(selectedType).replace(/[^a-zA-Z0-9]/g, '_')}_${date}.png`;
                  
                  // Create a canvas element to draw the graph
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  
                  if (!ctx) {
                    throw new Error("Could not get canvas context");
                  }
                  
                  // Canvas dimensions
                  const padding = 60;
                  const barWidth = 40;
                  const barSpacing = 10;
                  const chartWidth = Math.max(800, graphData.length * (barWidth + barSpacing) + padding * 2);
                  const chartHeight = 500;
                  
                  canvas.width = chartWidth;
                  canvas.height = chartHeight;
                  
                  // Fill white background
                  ctx.fillStyle = '#ffffff';
                  ctx.fillRect(0, 0, chartWidth, chartHeight);
                  
                  // Draw title
                  ctx.fillStyle = '#111827';
                  ctx.font = 'bold 20px Arial';
                  ctx.textAlign = 'center';
                  ctx.fillText(transformTypeForDisplay(selectedType), chartWidth / 2, 30);
                  ctx.font = '14px Arial';
                  ctx.fillText('Recommended Stock by Size', chartWidth / 2, 50);
                  
                  // Calculate chart area (with space for labels)
                  const chartAreaX = padding + 35; // Extra space for Y-axis label
                  const chartAreaY = 80;
                  const chartAreaWidth = chartWidth - padding * 2 - 35;
                  const chartAreaHeight = chartHeight - chartAreaY - padding - 30; // Extra space for X-axis label
                  
                  // Find max value for scaling
                  const maxValue = Math.max(...graphData.map(d => d.recommendedStock), 1);
                  
                  // Draw Y-axis
                  ctx.strokeStyle = '#fb923c';
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.moveTo(chartAreaX, chartAreaY);
                  ctx.lineTo(chartAreaX, chartAreaY + chartAreaHeight);
                  ctx.stroke();
                  
                  // Draw X-axis
                  ctx.beginPath();
                  ctx.moveTo(chartAreaX, chartAreaY + chartAreaHeight);
                  ctx.lineTo(chartAreaX + chartAreaWidth, chartAreaY + chartAreaHeight);
                  ctx.stroke();
                  
                  // Draw Y-axis label
                  ctx.save();
                  ctx.fillStyle = '#2563eb';
                  ctx.font = 'bold 12px Arial';
                  ctx.textAlign = 'center';
                  ctx.translate(20, chartAreaY + chartAreaHeight / 2);
                  ctx.rotate(-Math.PI / 2);
                  ctx.fillText('Quantity', 0, 0);
                  ctx.restore();
                  
                  // Draw Y-axis labels
                  ctx.fillStyle = '#2563eb';
                  ctx.font = '12px Arial';
                  ctx.textAlign = 'right';
                  for (let i = 0; i <= 4; i++) {
                    const value = Math.round((maxValue / 4) * (4 - i));
                    const y = chartAreaY + (chartAreaHeight / 4) * i;
                    ctx.fillText(value.toString(), chartAreaX - 10, y + 4);
                    // Draw grid line
                    ctx.strokeStyle = '#e5e7eb';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(chartAreaX, y);
                    ctx.lineTo(chartAreaX + chartAreaWidth, y);
                    ctx.stroke();
                  }
                  
                  // Draw bars
                  const barXStart = chartAreaX + 20;
                  graphData.forEach((item, index) => {
                    const x = barXStart + index * (barWidth + barSpacing);
                    const height = (item.recommendedStock / maxValue) * chartAreaHeight;
                    const y = chartAreaY + chartAreaHeight - height;
                    
                    // Determine bar color based on recommended stock percentage
                    const percentage = (item.recommendedStock / maxValue) * 100;
                    let barColor = '#eab308'; // yellow (low)
                    if (percentage > 75) {
                      barColor = '#16a34a'; // green (high)
                    } else if (percentage > 40) {
                      barColor = '#2563eb'; // blue (medium)
                    }
                    
                    // Draw bar
                    ctx.fillStyle = barColor;
                    ctx.fillRect(x, y, barWidth, height);
                    
                    // Draw border
                    ctx.strokeStyle = '#1f2937';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, barWidth, height);
                    
                    // Draw Recommended Stock value on top (color based on bar color)
                    ctx.fillStyle = barColor === '#16a34a' ? '#15803d' : barColor === '#2563eb' ? '#1e40af' : '#ca8a04';
                    ctx.font = 'bold 11px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(item.recommendedStock.toString(), x + barWidth / 2, Math.max(y - 5, chartAreaY - 10));
                    
                    // Draw size label below
                    ctx.fillStyle = '#ea580c';
                    ctx.font = '10px Arial';
                    ctx.fillText(item.size || 'N/A', x + barWidth / 2, chartAreaY + chartAreaHeight + 15);
                    
                    // Draw forecasted demand if available (as text, not bar)
                    if (item.forecastedDemand !== undefined) {
                      ctx.fillStyle = '#6b7280';
                      ctx.font = '9px Arial';
                      ctx.fillText(`(${item.forecastedDemand})`, x + barWidth / 2, chartAreaY + chartAreaHeight + 27);
                    }
                  });
                  
                  // Draw X-axis label
                  ctx.fillStyle = '#ea580c';
                  ctx.font = 'bold 12px Arial';
                  ctx.textAlign = 'center';
                  ctx.fillText('Size', chartWidth / 2, chartHeight - 10);
                  
                  // Try to download as PNG first, then PDF as fallback
                  try {
                    // Try PNG download
                    const pngBlob = await new Promise<Blob | null>((resolve) => {
                      canvas.toBlob((blob) => {
                        resolve(blob);
                      }, 'image/png');
                    });
                    
                    if (pngBlob) {
                      // Download PNG
                      const url = URL.createObjectURL(pngBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = graphFilename;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                      
                      Swal.fire({
                        icon: "success",
                        title: "Graph Downloaded!",
                        text: `Graph saved as ${graphFilename}`,
                        timer: 2000,
                        timerProgressBar: true,
                      });
                    } else {
                      throw new Error("PNG blob creation failed");
                    }
                  } catch (pngError) {
                    // Fallback to PDF
                    try {
                      const pdfFilename = graphFilename.replace('.png', '.pdf');
                      const pdf = new jsPDF('landscape', 'mm', 'a4');
                      
                      const imgData = canvas.toDataURL('image/png');
                      
                      const pdfWidth = pdf.internal.pageSize.getWidth();
                      const pdfHeight = pdf.internal.pageSize.getHeight();
                      const margin = 10;
                      
                      const imgAspectRatio = canvas.width / canvas.height;
                      const pdfAspectRatio = pdfWidth / pdfHeight;
                      
                      let finalWidth: number;
                      let finalHeight: number;
                      
                      if (imgAspectRatio > pdfAspectRatio) {
                        finalWidth = pdfWidth - (margin * 2);
                        finalHeight = finalWidth / imgAspectRatio;
                      } else {
                        finalHeight = pdfHeight - (margin * 2);
                        finalWidth = finalHeight * imgAspectRatio;
                      }
                      
                      const xOffset = (pdfWidth - finalWidth) / 2;
                      const yOffset = (pdfHeight - finalHeight) / 2;
                      
                      pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
                      pdf.save(pdfFilename);
                      
                      Swal.fire({
                        icon: "success",
                        title: "Graph Downloaded!",
                        text: `Graph saved as ${pdfFilename} (PDF)`,
                        timer: 2000,
                        timerProgressBar: true,
                      });
                    } catch (pdfError) {
                      // Last resort: try direct data URL download
                      try {
                        const dataUrl = canvas.toDataURL('image/png');
                        const link = document.createElement('a');
                        link.href = dataUrl;
                        link.download = graphFilename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        Swal.fire({
                          icon: "success",
                          title: "Graph Downloaded!",
                          text: `Graph saved as ${graphFilename}`,
                          timer: 2000,
                          timerProgressBar: true,
                        });
                      } catch (finalError) {
                        Swal.fire({
                          icon: "error",
                          title: "Download Failed",
                          text: "Could not download the graph. Please try again.",
                        });
                      }
                    }
                  }
                } catch (error: any) {
                  console.error("Error downloading graph:", error);
                  Swal.fire({
                    icon: "error",
                    title: "Download Failed",
                    text: error.message || "An error occurred while downloading the graph.",
                  });
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Download Graph
            </button>
          </div>

          {/* Enhanced Bar Chart - Compact for many sizes */}
          <div className="mt-6 overflow-x-auto">
            {/* Y-axis labels */}
            <div className="flex items-end gap-1 h-64 relative" style={{ minWidth: `${Math.max(graphData.length * 50, 600)}px` }}>
              {/* Y-axis scale */}
              <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-blue-600 font-medium pr-2 z-10 bg-white" style={{ width: '40px' }}>
                {[100, 75, 50, 25, 0].map((percent) => (
                  <span key={percent} className="text-right">
                    {Math.round((percent / 100) * maxStock)}
                  </span>
                ))}
              </div>
              
              {/* Y-axis label */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold text-blue-600 whitespace-nowrap" style={{ transformOrigin: 'center' }}>
                Quantity
              </div>
              
              {/* Chart area - scrollable */}
              <div className="flex items-end gap-1 flex-1 ml-12 border-b-2 border-l-2" style={{ height: '240px', minWidth: `${Math.max(graphData.length * 50, 600)}px`, borderColor: '#fb923c' }}>
                {graphData.map((item, index) => {
                  const height = maxStock > 0 ? (item.recommendedStock / maxStock) * 100 : 0;
                  // Simple solid colors based on value (no gradients to avoid lab() color function issues)
                  const isHigh = height > 75;
                  const isMedium = height > 40;
                  // Use simple hex colors directly in inline styles
                  const barColorHex = isHigh 
                    ? "#16a34a"  // green
                    : isMedium 
                    ? "#2563eb"  // blue
                    : "#eab308"; // yellow
                  
                  // Calculate bar width based on number of items - more compact for many sizes
                  const barWidth = graphData.length > 20 ? '35px' : graphData.length > 15 ? '40px' : graphData.length > 10 ? '45px' : '50px';
                  
                  return (
                    <div key={index} className="flex flex-col items-center h-full flex-shrink-0" style={{ width: barWidth }}>
                      <div className="w-full flex flex-col items-center justify-end h-full">
                        <div
                          className="w-full hover:opacity-80 transition rounded-t shadow-md"
                          style={{ 
                            height: `${height}%`, 
                            minHeight: '4px',
                            backgroundColor: barColorHex,
                            backgroundImage: 'none' // No gradients
                          }}
                          title={`Size: ${item.size || 'N/A'}, Recommended: ${item.recommendedStock}, Forecasted: ${item.forecastedDemand || 'N/A'}`}
                        />
                        <div className="mt-1 text-[10px] text-center min-h-[32px] leading-tight">
                          <div className="font-bold" style={{ color: '#111827' }}>{item.recommendedStock}</div>
                          <div className="font-medium mt-0.5 text-[9px]" style={{ color: '#ea580c' }}>{item.size || 'N/A'}</div>
                          {item.forecastedDemand !== undefined && (
                            <div className="text-[8px] mt-0.5" style={{ color: '#6b7280' }}>
                              ({item.forecastedDemand})
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* X-axis label */}
            <div className="flex justify-center mt-4">
              <span className="text-xs font-bold text-orange-600">Size</span>
            </div>
            
            {/* Axis labels */}
            <div className="flex justify-between mt-4 text-xs font-medium">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#2563eb' }}></div>
                <span className="text-blue-600">Recommended Stock</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fb923c' }}></div>
                <span className="text-orange-600">Size</span>
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex flex-col items-center gap-2 mt-4">
              <div className="flex justify-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#16a34a' }}></div>
                  <span className="text-gray-600">High (&gt;75%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#2563eb' }}></div>
                  <span className="text-gray-600">Medium (40-75%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#eab308' }}></div>
                  <span className="text-gray-600">Low (&lt;40%)</span>
                </div>
              </div>
            
            </div>
          </div>
        </div>
      )}

      {/* Recommendations Table */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-blue-700">
              <tr>
                {!selectedType && (
                  <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                    Type
                  </th>
                )}
                <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                  Forecasted Demand
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                  Recommended Stock
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedRecommendations.length === 0 ? (
                <tr>
                  <td colSpan={selectedType ? 3 : 4} className="px-6 py-8 text-center text-gray-500">
                    {recommendations.length === 0
                      ? "No recommended stock data available. Click 'Forecast Uniform Demand' above to generate recommendations."
                      : selectedType
                      ? `No recommendations found for ${transformTypeForDisplay(selectedType)}.`
                      : "No recommendations match your search criteria."}
                  </td>
                </tr>
              ) : (
                sortedRecommendations.map((rec, index) => (
                  <tr 
                    key={index} 
                    className="hover:bg-gray-50"
                  >
                    {!selectedType && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                        {transformTypeForDisplay(rec.type)}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {rec.size || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {rec.forecastedDemand || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                      {rec.recommendedStock}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
