"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Swal from "sweetalert2";
import { PencilIcon, MagnifyingGlassIcon, ChartBarIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

interface UniformNo3Data {
  clothNo3: string; // XS - 3XL
  pantsNo3: string; // XS - 3XL
  pvcShoes: string; // UK 4-12
  beret: string; // Specific sizes
  nametag: string; // Text input
  accessories: {
    apulet: boolean;
    integrityBadge: boolean;
    shoulderBadge: boolean;
    celBar: boolean;
    beretLogoPin: boolean;
    beltNo3: boolean; // Only for boys
  };
}

interface UniformNo4Data {
  clothNo4: string; // XS - 3XL
  pantsNo4: string; // XS - 3XL
  boot: string; // UK 2-12
  nametag: string; // Text input
  accessories: {
    apmTag: boolean;
    beltNo4: boolean;
  };
}

interface TShirtData {
  digitalShirt: string; // XS - 3XL
  innerApmShirt: string; // XS - 3XL
  companyShirt: string; // XS - 3XL
}

interface UniformItem {
  id: string;
  name: string;
  type: string;
  category: string;
  image: string;
  size?: string;
  status: "Available" | "Missing";
  price?: number; // Price in RM (only for shirts, will be updated by admin)
  sizeChart?: string; // URL to size chart image
}

export default function UniformPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uniformNo3, setUniformNo3] = useState<UniformNo3Data | null>(null);
  const [uniformNo4, setUniformNo4] = useState<UniformNo4Data | null>(null);
  const [tShirt, setTShirt] = useState<TShirtData | null>(null);
  const [showUniformNo3Modal, setShowUniformNo3Modal] = useState(false);
  const [showUniformNo4Modal, setShowUniformNo4Modal] = useState(false);
  const [showTShirtModal, setShowTShirtModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sizeChartModal, setSizeChartModal] = useState<{ isOpen: boolean; itemName: string; sizeChartUrl: string }>({
    isOpen: false,
    itemName: "",
    sizeChartUrl: "",
  });
  
  // Shirt prices - fetched from API response (backend includes price in each shirt item)
  // Fallback to localStorage if API doesn't have prices
  const [shirtPrices, setShirtPrices] = useState<{
    digitalShirt: number | null;
    companyShirt: number | null;
    innerApmShirt: number | null;
  }>({
    digitalShirt: null,
    companyShirt: null,
    innerApmShirt: null,
  });
  
  // Track if prices failed to load
  const [priceLoadError, setPriceLoadError] = useState<boolean>(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState<boolean>(false);
  
  // Store original API items with prices for reference
  const [apiItemsWithPrices, setApiItemsWithPrices] = useState<any[]>([]);

  // Status tracking for items with sizes (independent of size - for "no planning" indication)
  // Status can be "Available", "Missing", or "Not Available" regardless of size
  const [itemStatus, setItemStatus] = useState<Record<string, "Available" | "Missing" | "Not Available">>({});
  
  // Store missingCount for each item (keyed by category|type|size, e.g. "Accessories No 3|Belt No 3|N/A")
  const [itemMissingCount, setItemMissingCount] = useState<Record<string, number>>({});

  // Helper to build missingCount key (category + type + size)
  const getMissingKey = (category: string, type: string, size?: string | null) => {
    return `${category}|${type}|${size ?? "N/A"}`;
  };
  
  const [formDataNo3, setFormDataNo3] = useState<UniformNo3Data>({
    clothNo3: "",
    pantsNo3: "",
    pvcShoes: "",
    beret: "",
    nametag: "",
    accessories: {
      apulet: false,
      integrityBadge: false,
      shoulderBadge: false,
      celBar: false,
      beretLogoPin: false,
      beltNo3: false,
    },
  });

  const [formDataNo4, setFormDataNo4] = useState<UniformNo4Data>({
    clothNo4: "",
    pantsNo4: "",
    boot: "",
    nametag: "",
    accessories: {
      apmTag: false,
      beltNo4: false,
    },
  });

  const [formDataTShirt, setFormDataTShirt] = useState<TShirtData>({
    digitalShirt: "",
    innerApmShirt: "",
    companyShirt: "",
  });

  // Size options
  const clothSizes = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
  const shoeSizes = ["4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const bootSizes = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const beretSizes = [
    "6 1/2",
    "6 5/8",
    "6 3/4",
    "6 7/8",
    "7",
    "7 1/8",
    "7 1/4",
    "7 3/8",
    "7 1/2",
    "7 5/8",
    "7 3/4",
    "7 7/8",
    "8",
    "8 1/8",
    "8 1/4",
    "8 3/8",
  ];

  // State to store size chart URLs (fetched from inventory)
  const [sizeCharts, setSizeCharts] = useState<Record<string, string>>({});
  
  // State to store inventory items (for quantity checking and dynamic item list)
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  // Helper function to get size chart URL for an item
  // Priority: 1) Inventory API (admin-uploaded), 2) Local fallback images
  const getSizeChartUrl = (category: string, type: string): string | undefined => {
    const typeLower = (type || "").toLowerCase().trim();
    const categoryLower = (category || "").toLowerCase().trim();
    
    // FIRST: Check if we have a size chart from inventory API (admin-uploaded)
    // This allows admin-uploaded size charts to override local images
    const key = `${category}-${type}`;
    if (sizeCharts[key] && sizeCharts[key].trim() !== "") {
      return sizeCharts[key];
    }
    
    // SECOND: Fallback to local images for specific items
    // CRITICAL: For Uniform No 3 Male/Female, always use local images to ensure correct mapping
    // Check for "female" FIRST before "male" to avoid false matches
    if (typeLower === "uniform no 3 female" || 
        (typeLower.includes("uniform no 3") && typeLower.includes("female")) || 
        typeLower === "pants no 3" ||
        typeLower.includes("pants no 3") ||
        (typeLower.includes("pants") && typeLower.includes("no 3") && !typeLower.includes("male"))) {
      return "/NO3_FEMALE_SIZECHART.png";
    }
    if (typeLower === "uniform no 3 male" || 
        (typeLower.includes("uniform no 3") && typeLower.includes("male")) ||
        typeLower === "cloth no 3" ||
        (typeLower.includes("cloth no 3") && !typeLower.includes("female"))) {
      return "/NO3_MALE_SIZECHART.png";
    }
    
    // Other items - local fallback
    if (typeLower === "pvc shoes" || typeLower.includes("pvc shoes")) {
      return "/SHOES_SIZECHART.webp";
    }
    if (typeLower === "boot" || typeLower.includes("boot")) {
      return "/SHOES_SIZECHART.webp";
    }
    if (typeLower === "beret" || typeLower.includes("beret")) {
      return "/BERET_SIZECHART.webp";
    }
    if (typeLower === "uniform no 4" || (typeLower.includes("uniform no 4") && !typeLower.includes("boot"))) {
      return "/NO4_SIZECHART.png";
    }
    // All shirt types use the same size chart (local fallback)
    if (typeLower === "digital shirt" || typeLower.includes("digital shirt") ||
        typeLower === "company shirt" || typeLower.includes("company shirt") ||
        typeLower === "inner apm shirt" || typeLower.includes("inner apm shirt")) {
      return "/SHIRT_SIZECHART.jpg";
    }
    
    return undefined;
  };
  
  // Helper function to get inventory quantity for an item
  const getInventoryQuantity = (category: string, type: string, size: string | null): number => {
    // Normalize size (remove "UK " prefix if present for matching)
    const normalizeSize = (s: string | null): string | null => {
      if (!s) return null;
      return s.replace(/^UK\s*/i, "").trim() || null;
    };
    
    const normalizedSize = normalizeSize(size);
    
    // Find matching inventory item
    // Match by category, type, and size (normalized)
    const item = inventoryItems.find(inv => {
      const invCategory = inv.category?.toLowerCase() || "";
      const invType = inv.type?.toLowerCase() || "";
      const invSize = normalizeSize(inv.size);
      
      const matchCategory = invCategory === category.toLowerCase();
      const matchType = invType === type.toLowerCase();
      const matchSize = (invSize === normalizedSize) || (invSize === null && normalizedSize === null);
      
      return matchCategory && matchType && matchSize;
    });
    
    return item?.quantity ?? 0;
  };

  // Fetch inventory items and size charts from inventory API
  const fetchInventory = async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsRefreshingPrices(true);
      }
      const token = localStorage.getItem("token");
      if (!token) {
        if (showLoading) setIsRefreshingPrices(false);
        return;
      }

      // Fetch inventory to get items, size chart URLs, and quantities
      const res = await fetch('http://localhost:5000/api/inventory', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        
        // DEBUG: Log raw API response structure
        console.log("🔍 DEBUG: Raw inventory API response structure:", {
          hasData: !!data,
          hasSuccess: !!data.success,
          hasInventory: !!data.inventory,
          inventoryLength: data.inventory?.length,
          firstItem: data.inventory?.[0] ? {
            keys: Object.keys(data.inventory[0]),
            category: data.inventory[0].category,
            type: data.inventory[0].type,
            hasPrice: 'price' in data.inventory[0],
            price: data.inventory[0].price,
            priceType: typeof data.inventory[0].price
          } : null
        });
        
        if (data.success && data.inventory) {
          // Store all inventory items
          setInventoryItems(data.inventory || []);
          
          // DEBUG: Log shirt items specifically
          const shirtItemsInResponse = data.inventory.filter((item: any) => {
            const category = item.category?.toLowerCase() || "";
            return category === "shirt" || category === "t-shirt";
          });
          
          if (shirtItemsInResponse.length > 0) {
            console.log("🔍 DEBUG: Shirt items from API response:", shirtItemsInResponse.map((item: any) => ({
              category: item.category,
              type: item.type,
              size: item.size,
              price: item.price,
              priceType: typeof item.price,
              hasPriceField: 'price' in item,
              allKeys: Object.keys(item)
            })));
          } else {
            console.warn("⚠️ No shirt items found in inventory API response");
          }
          
          // Extract shirt prices from inventory (price is stored directly in UniformInventory)
          // Price is per shirt type (same for all sizes of the same type)
          const extractedPrices: {
            digitalShirt: number | null;
            companyShirt: number | null;
            innerApmShirt: number | null;
          } = {
            digitalShirt: null,
            companyShirt: null,
            innerApmShirt: null,
          };
          
          // Extract prices from inventory items (price is already in item.price field)
          data.inventory.forEach((item: any) => {
            const category = item.category?.toLowerCase() || "";
            const type = item.type?.toLowerCase() || "";
            
            // Check if this is a shirt item
            if (category === "shirt" || category === "t-shirt") {
              // DEBUG: Log each shirt item to see if price exists
              if (item.price === undefined || item.price === null) {
                console.warn(`⚠️ Shirt item found but price is missing:`, {
                  category: item.category,
                  type: item.type,
                  size: item.size,
                  hasPriceField: 'price' in item,
                  priceValue: item.price,
                  allFields: Object.keys(item)
                });
              }
              
              // Check if this is a shirt item and has a price
              if (item.price !== undefined && item.price !== null) {
                // Price is stored directly in UniformInventory.price
                // Same price for all sizes of the same type, so we can take any size
                if (type === "digital shirt" && extractedPrices.digitalShirt === null) {
                  extractedPrices.digitalShirt = item.price;
                  console.log(`✅ Found price for Digital Shirt: ${item.price}`);
                } else if (type === "company shirt" && extractedPrices.companyShirt === null) {
                  extractedPrices.companyShirt = item.price;
                  console.log(`✅ Found price for Company Shirt: ${item.price}`);
                } else if (type === "inner apm shirt" && extractedPrices.innerApmShirt === null) {
                  extractedPrices.innerApmShirt = item.price;
                  console.log(`✅ Found price for Inner APM Shirt: ${item.price}`);
                }
              }
            }
          });
          
          // Update shirt prices from inventory (only if prices are found)
          if (extractedPrices.digitalShirt !== null || extractedPrices.companyShirt !== null || extractedPrices.innerApmShirt !== null) {
            setShirtPrices(prev => ({
              digitalShirt: extractedPrices.digitalShirt !== null ? extractedPrices.digitalShirt : prev.digitalShirt,
              companyShirt: extractedPrices.companyShirt !== null ? extractedPrices.companyShirt : prev.companyShirt,
              innerApmShirt: extractedPrices.innerApmShirt !== null ? extractedPrices.innerApmShirt : prev.innerApmShirt,
            }));
            setPriceLoadError(false); // Clear error if prices found
            console.log("💰 Shirt prices fetched from inventory (UniformInventory.price):", extractedPrices);
          } else {
            // Check if there are shirt items but no prices
            const hasShirtItems = shirtItemsInResponse.length > 0;
            if (hasShirtItems) {
              setPriceLoadError(true); // Set error flag if shirt items exist but no prices
              console.error("❌ CRITICAL: No shirt prices found in inventory API response!");
              console.error("   This means the backend is NOT including the 'price' field in GET /api/inventory");
              console.error("   Please check BACKEND_INVENTORY_INCLUDE_SHIRT_PRICES.md for backend implementation");
              console.error("   Backend must:");
              console.error("   1. Ensure 'price' field exists in UniformInventory model/schema");
              console.error("   2. Include 'price' in database query (MongoDB: .select('+price'), SQL: include in SELECT)");
              console.error("   3. Include 'price' field in API response for ALL items");
              console.error("   4. For shirt items: actual price value");
              console.error("   5. For non-shirt items: null");
            } else {
              setPriceLoadError(false); // No error if no shirt items exist
            }
          }
          
          // Group by category-type and get size chart URL
          const chartMap: Record<string, string> = {};
          data.inventory.forEach((item: any) => {
            if (item.sizeChart) {
              const key = `${item.category}-${item.type}`;
              if (!chartMap[key]) {
                chartMap[key] = item.sizeChart;
              }
            }
          });
          setSizeCharts(chartMap);
        }
      } else {
        console.error("Failed to fetch inventory:", res.status, res.statusText);
        if (showLoading) {
          setPriceLoadError(true);
        }
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
      if (showLoading) {
        setPriceLoadError(true);
      }
      // Silently fail - inventory is optional for backward compatibility
    } finally {
      if (showLoading) {
        setIsRefreshingPrices(false);
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchInventory(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUniform();
    // Load shirt prices from localStorage (set by admin)
    const savedPrices = localStorage.getItem("shirtPrices");
    if (savedPrices) {
      try {
        const prices = JSON.parse(savedPrices);
        setShirtPrices({
          digitalShirt: prices.digitalShirt || null,
          companyShirt: prices.companyShirt || null,
          innerApmShirt: prices.innerApmShirt || null,
        });
      } catch (error) {
        console.error("Error loading shirt prices:", error);
      }
    }
  }, [user]);

  const fetchUniform = async () => {
    if (!user?.sispaId || user.sispaId.trim() === '') {
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const url = 'http://localhost:5000/api/uniforms/my-uniform';
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Check HTTP status first
      if (!res.ok) {
        // 404 means no uniform data exists - this is a valid state, not an error
        if (res.status === 404) {
          // This is expected for first-time users - no uniform data exists yet
          console.log("ℹ️ No uniform data found (404) - this is normal for first-time users");
          setLoading(false);
          return;
        }
        // For other errors, try to parse and log
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await res.json();
            console.error("❌ HTTP Error fetching uniform:", res.status, errorData);
          } catch (parseError) {
            console.error("❌ HTTP Error fetching uniform:", res.status, res.statusText);
          }
        } else {
          console.error("❌ HTTP Error fetching uniform:", res.status, res.statusText);
        }
        setLoading(false);
        return;
      }
      
      // Parse successful response
      const contentType = res.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch (parseError) {
          console.error("❌ JSON parse error:", parseError, "Status:", res.status);
          setLoading(false);
          return;
        }
      } else {
        console.error("❌ Non-JSON response received");
        setLoading(false);
        return;
      }
      
      if (data.success && data.uniform && data.uniform.items) {
        const items = data.uniform.items || [];
        
        // Store API items with prices for reference
        setApiItemsWithPrices(items);
        
        // Extract shirt prices from API response (backend now includes price in each shirt item)
        const extractedPrices: {
          digitalShirt: number | null;
          companyShirt: number | null;
          innerApmShirt: number | null;
        } = {
          digitalShirt: null,
          companyShirt: null,
          innerApmShirt: null,
        };
        
        items.forEach((item: any) => {
          if (item.category === "Shirt" && item.price !== undefined && item.price !== null) {
            const type = item.type?.toLowerCase() || "";
            if (type === "digital shirt") {
              extractedPrices.digitalShirt = item.price;
            } else if (type === "company shirt") {
              extractedPrices.companyShirt = item.price;
            } else if (type === "inner apm shirt") {
              extractedPrices.innerApmShirt = item.price;
            }
          }
        });
        
        // Update shirt prices from API response (only if prices are found)
        // If API has prices, use them; otherwise keep existing prices (from localStorage or previous fetch)
        if (extractedPrices.digitalShirt !== null || extractedPrices.companyShirt !== null || extractedPrices.innerApmShirt !== null) {
          setShirtPrices(prev => ({
            digitalShirt: extractedPrices.digitalShirt !== null ? extractedPrices.digitalShirt : prev.digitalShirt,
            companyShirt: extractedPrices.companyShirt !== null ? extractedPrices.companyShirt : prev.companyShirt,
            innerApmShirt: extractedPrices.innerApmShirt !== null ? extractedPrices.innerApmShirt : prev.innerApmShirt,
          }));
          console.log("💰 Shirt prices fetched from API:", extractedPrices);
        }
        
        const uniformNo3Data = parseUniformNo3FromItems(items);
        const uniformNo4Data = parseUniformNo4FromItems(items);
        const tShirtData = parseTShirtFromItems(items);
        
        // Initialize itemStatus from API data (for items with status field)
        const initialStatus: Record<string, "Available" | "Missing" | "Not Available"> = {};
        const initialMissingCount: Record<string, number> = {};
        items.forEach((item: any) => {
          if (item.status) {
            const category = item.category || "";
            const type = item.type || "";
           
            const statusKey = `${category}-${type}`; // KEEP for itemStatus (status is independent of size)
            initialStatus[statusKey] = item.status;

            // FIX: missingCount MUST use category|type|size key
            const sizeValue = item.size ?? "N/A";
            const missingKey = getMissingKey(category, type, sizeValue);

            if (item.status === "Missing") {
              if (item.missingCount !== undefined && item.missingCount !== null) {
               initialMissingCount[missingKey] = item.missingCount;
               console.log(`📋 Loaded missingCount for ${type} [${sizeValue}]: ${item.missingCount}`);
             } else {
               const previousCount = itemMissingCount[missingKey];
               if (previousCount !== undefined && previousCount !== null) {
               initialMissingCount[missingKey] = previousCount;
                console.log(`📋 Preserved previous missingCount for ${type} [${sizeValue}]: ${previousCount}`);
                }
              }
             } else if (item.status === "Available") {
                // Optional: preserve for future Missing display
                if (item.missingCount !== undefined && item.missingCount !== null) {
                initialMissingCount[missingKey] = item.missingCount;
                }
              }
           }
        });
        setItemStatus(initialStatus);
        setItemMissingCount(initialMissingCount);
        
        if (uniformNo3Data) {
          setUniformNo3(uniformNo3Data);
        }
        if (uniformNo4Data) {
          setUniformNo4(uniformNo4Data);
        }
        if (tShirtData) {
          setTShirt(tShirtData);
        }
      }
    } catch (error) {
      console.error("Error fetching uniform:", error);
    } finally {
      setLoading(false);
    }
  };

  // Parse functions for each uniform type
  const parseUniformNo3FromItems = (items: any[]): UniformNo3Data | null => {
    const data: Partial<UniformNo3Data> = {
      accessories: {
        apulet: false,
        integrityBadge: false,
        shoulderBadge: false,
        celBar: false,
        beretLogoPin: false,
        beltNo3: false,
      },
    };

    items.forEach((item: any) => {
      const category = item.category?.toLowerCase() || "";
      const type = item.type?.toLowerCase() || "";
      const size = item.size || "";

      // Handle both "Uniform No 3" and "Accessories No 3" categories for backward compatibility
      if (category === "uniform no 3" || category === "accessories no 3") {
        // Main items only in "Uniform No 3" category
        if (category === "uniform no 3") {
          // Handle both old and new type names for backward compatibility
          // Supports migration: "Cloth No 3" → "Uniform No 3 Male", "Pants No 3" → "Uniform No 3 Female"
          if (type === "cloth no 3" || type === "uniform no 3 male" || type.includes("uniform no 3") && type.includes("male")) data.clothNo3 = size.replace("UK ", "");
          if (type === "pants no 3" || type === "uniform no 3 female" || type.includes("uniform no 3") && type.includes("female")) data.pantsNo3 = size.replace("UK ", "");
          if (type === "pvc shoes") data.pvcShoes = size.replace("UK ", "");
          if (type === "beret") data.beret = size;
        }
        
        // Accessories can be in either "Uniform No 3" (old) or "Accessories No 3" (new) category
        // CRITICAL: Only parse nametag if it's "Nametag No 3" or "Name Tag No 3" (not No 4)
        if ((type === "nametag" || type.includes("nametag no 3") || type.includes("name tag no 3")) && 
            !type.includes("no 4")) {
          data.nametag = item.notes || "";
        }
        // CRITICAL: Set accessory booleans based on status, not just existence
        // If status is "Available", set to true; if "Missing" or "Not Available", set to false
        if (type === "apulet" || type === "aplet") {
          data.accessories!.apulet = item.status === "Available";
        }
        if (type === "integrity badge") {
          data.accessories!.integrityBadge = item.status === "Available";
        }
        if (type === "shoulder badge") {
          data.accessories!.shoulderBadge = item.status === "Available";
        }
        if (type === "cel bar") {
          data.accessories!.celBar = item.status === "Available";
        }
        if (type === "beret logo pin") {
          data.accessories!.beretLogoPin = item.status === "Available";
        }
        if (type === "belt no 3") {
          data.accessories!.beltNo3 = item.status === "Available";
        }
      }
    });

    if (data.clothNo3 || data.pantsNo3 || data.pvcShoes || data.beret || data.nametag) {
      return data as UniformNo3Data;
    }
    return null;
  };

  const parseUniformNo4FromItems = (items: any[]): UniformNo4Data | null => {
    const data: Partial<UniformNo4Data> = {
      accessories: {
        apmTag: false,
        beltNo4: false,
      },
    };

    items.forEach((item: any) => {
      const category = item.category?.toLowerCase() || "";
      const type = item.type?.toLowerCase() || "";
      const size = item.size || "";

      // Handle both "Uniform No 4" and "Accessories No 4" categories for backward compatibility
      if (category === "uniform no 4" || category === "accessories no 4") {
        // Main items only in "Uniform No 4" category
        if (category === "uniform no 4") {
          // Handle both old and new type names for backward compatibility
          // "Cloth No 4", "Pants No 4", and "Uniform No 4" all map to the same size
          // Since they come as a pair, use the same size for both fields
          if (type === "cloth no 4" || type === "pants no 4" || type === "uniform no 4" || 
              (type.includes("uniform no 4") && !type.includes("accessories"))) {
            // Set both clothNo4 and pantsNo4 to the same value since they come as a pair
            data.clothNo4 = size.replace("UK ", "");
            data.pantsNo4 = size.replace("UK ", "");
          }
          if (type === "boot") data.boot = size.replace("UK ", "");
        }
        
        // Accessories can be in either "Uniform No 4" (old) or "Accessories No 4" (new) category
        // CRITICAL: Only parse nametag if it's "Nametag No 4" or "Name Tag No 4" (not No 3)
        if ((type === "nametag" || type.includes("nametag no 4") || type.includes("name tag no 4")) && 
            !type.includes("no 3")) {
          data.nametag = item.notes || "";
        }
        // CRITICAL: Set accessory booleans based on status, not just existence
        // If status is "Available", set to true; if "Missing" or "Not Available", set to false
        if (type === "apm tag") {
          data.accessories!.apmTag = item.status === "Available";
        }
        if (type === "belt no 4") {
          data.accessories!.beltNo4 = item.status === "Available";
        }
      }
    });

    if (data.clothNo4 || data.pantsNo4 || data.boot || data.nametag) {
      return data as UniformNo4Data;
    }
    return null;
  };

  const parseTShirtFromItems = (items: any[]): TShirtData | null => {
    const data: Partial<TShirtData> = {};

    items.forEach((item: any) => {
      const category = item.category?.toLowerCase() || "";
      const type = item.type?.toLowerCase() || "";
      const size = item.size || "";

      // Handle both "T-Shirt" (old) and "Shirt" (new) categories for backward compatibility
      if (category === "t-shirt" || category === "tshirt" || category === "shirt") {
        if (type === "digital shirt") data.digitalShirt = size;
        if (type === "inner apm shirt") data.innerApmShirt = size;
        if (type === "company shirt") data.companyShirt = size;
      }
    });

    if (data.digitalShirt || data.innerApmShirt || data.companyShirt) {
      return data as TShirtData;
    }
    return null;
  };

  // Convert functions for backend
  const convertNo3ToBackendItems = (data: UniformNo3Data): any[] => {
    const items: any[] = [];
    if (data.clothNo3) {
      // CRITICAL: Get status from itemStatus state - default to "Available" if size is selected
      const statusKey = `Uniform No 3-Uniform No 3 Male`;
      const status = itemStatus[statusKey] || (data.clothNo3 ? "Available" : "Missing");
      items.push({ 
        category: "Uniform No 3", 
        type: "Uniform No 3 Male", 
        size: data.clothNo3, 
        quantity: 1,
        status: status  // CRITICAL: Backend only deducts when status is "Available"
      });
    }
    if (data.pantsNo3) {
      const statusKey = `Uniform No 3-Uniform No 3 Female`;
      const status = itemStatus[statusKey] || (data.pantsNo3 ? "Available" : "Missing");
      items.push({ 
        category: "Uniform No 3", 
        type: "Uniform No 3 Female", 
        size: data.pantsNo3, 
        quantity: 1,
        status: status
      });
    }
    if (data.pvcShoes) {
      const statusKey = `Uniform No 3-PVC Shoes`;
      const status = itemStatus[statusKey] || (data.pvcShoes ? "Available" : "Missing");
      items.push({ 
        category: "Uniform No 3", 
        type: "PVC Shoes", 
        size: `${data.pvcShoes}`, 
        quantity: 1,
        status: status
      });
    }
    if (data.beret) {
      const statusKey = `Uniform No 3-Beret`;
      const status = itemStatus[statusKey] || (data.beret ? "Available" : "Missing");
      items.push({ 
        category: "Uniform No 3", 
        type: "Beret", 
        size: data.beret, 
        quantity: 1,
        status: status
      });
    }
    // CRITICAL: Accessories don't have sizes, use null to match database
    // Backend accepts null, "", or "N/A" for accessories and normalizes all to null
    // Database stores size: null for accessories
    const accessorySize = null;
    
    if (data.nametag) {
      items.push({ category: "Accessories No 3", type: "Nametag No 3", size: accessorySize, quantity: 1, notes: data.nametag });
    }
    // Accessories use null for size (matches database storage)
    // FIX: Include accessories if boolean is true (user owns it) OR if itemStatus has status (user changed status)
    // This ensures items with status "Missing" are sent to backend even if boolean is false
    const apuletStatusKey = `Accessories No 3-Apulet`;
    if (data.accessories.apulet || itemStatus[apuletStatusKey]) {
      const status = itemStatus[apuletStatusKey] || "Available";
      items.push({ 
        category: "Accessories No 3", 
        type: "Apulet", 
        size: accessorySize, 
        quantity: 1,
        status: status
      });
    }
    const integrityBadgeStatusKey = `Accessories No 3-Integrity Badge`;
    if (data.accessories.integrityBadge || itemStatus[integrityBadgeStatusKey]) {
      const status = itemStatus[integrityBadgeStatusKey] || "Available";
      items.push({ 
        category: "Accessories No 3", 
        type: "Integrity Badge", 
        size: accessorySize, 
        quantity: 1,
        status: status
      });
    }
    const shoulderBadgeStatusKey = `Accessories No 3-Shoulder Badge`;
    if (data.accessories.shoulderBadge || itemStatus[shoulderBadgeStatusKey]) {
      const status = itemStatus[shoulderBadgeStatusKey] || "Available";
      items.push({ 
        category: "Accessories No 3", 
        type: "Shoulder Badge", 
        size: accessorySize, 
        quantity: 1,
        status: status
      });
    }
    const celBarStatusKey = `Accessories No 3-Cel Bar`;
    if (data.accessories.celBar || itemStatus[celBarStatusKey]) {
      const status = itemStatus[celBarStatusKey] || "Available";
      items.push({ 
        category: "Accessories No 3", 
        type: "Cel Bar", 
        size: accessorySize, 
        quantity: 1,
        status: status
      });
    }
    const beretLogoPinStatusKey = `Accessories No 3-Beret Logo Pin`;
    if (data.accessories.beretLogoPin || itemStatus[beretLogoPinStatusKey]) {
      const status = itemStatus[beretLogoPinStatusKey] || "Available";
      items.push({ 
        category: "Accessories No 3", 
        type: "Beret Logo Pin", 
        size: accessorySize, 
        quantity: 1,
        status: status
      });
    }
    const beltNo3StatusKey = `Accessories No 3-Belt No 3`;
    if (data.accessories.beltNo3 || itemStatus[beltNo3StatusKey]) {
      const status = itemStatus[beltNo3StatusKey] || "Available";
      items.push({ 
        category: "Accessories No 3", 
        type: "Belt No 3", 
        size: accessorySize, 
        quantity: 1,
        status: status
      });
    }
    return items;
  };

  const convertNo4ToBackendItems = (data: UniformNo4Data): any[] => {
    const items: any[] = [];
    // Merged: "Cloth No 4" and "Pants No 4" are now a single "Uniform No 4" type
    // Use clothNo4 if available, otherwise use pantsNo4 (they should be the same since they come as a pair)
    const uniformNo4Size = data.clothNo4 || data.pantsNo4;
    if (uniformNo4Size) {
      // CRITICAL: Get status from itemStatus state - default to "Available" if size is selected
      // Try multiple key formats to ensure we find the status
      const statusKey1 = `Uniform No 4-Uniform No 4`;
      const statusKey2 = `Uniform No 4-Cloth No 4`;
      const statusKey3 = `Uniform No 4-Pants No 4`;
      const statusFromState = itemStatus[statusKey1] || itemStatus[statusKey2] || itemStatus[statusKey3];
      
      // CRITICAL: If size is selected, status MUST be "Available" for inventory deduction
      // Only use "Not Available" or "Missing" if explicitly set by user
      const status = statusFromState === "Not Available" || statusFromState === "Missing" 
        ? statusFromState 
        : "Available";  // Default to "Available" when size is selected
      
      // DEBUG: Log the status being sent
      console.log("🔍 Uniform No 4 - Status check:", {
        statusKey1,
        statusKey2,
        statusKey3,
        statusFromState,
        finalStatus: status,
        size: uniformNo4Size,
        hasSize: !!uniformNo4Size,
        itemStatusKeys: Object.keys(itemStatus).filter(k => k.includes("Uniform No 4"))
      });
      
      items.push({ 
        category: "Uniform No 4", 
        type: "Uniform No 4", 
        size: uniformNo4Size, 
        quantity: 1,
        status: status  // CRITICAL: Backend only deducts when status is "Available"
      });
    }
    if (data.boot) {
      // CRITICAL: Get status from itemStatus state - default to "Available" if boot is selected
      const statusKey = `Uniform No 4-Boot`;
      const status = itemStatus[statusKey] || (data.boot ? "Available" : "Missing");
      items.push({ 
        category: "Uniform No 4", 
        type: "Boot", 
        size: `${data.boot}`, 
        quantity: 1,
        status: status  // CRITICAL: Backend only deducts when status is "Available"
      });
    }
    // CRITICAL: Accessories don't have sizes, use null to match database
    // Backend accepts null, "", or "N/A" for accessories and normalizes all to null
    // Database stores size: null for accessories
    const accessorySize = null;
    
    if (data.nametag) {
      // CRITICAL: Get status from itemStatus state - default to "Available" if nametag is provided
      const statusKey = `Accessories No 4-Nametag No 4`;
      const status = itemStatus[statusKey] || "Available";
      items.push({ 
        category: "Accessories No 4", 
        type: "Nametag No 4", 
        size: accessorySize, 
        quantity: 1, 
        notes: data.nametag,
        status: status  // CRITICAL: Backend only deducts when status is "Available"
      });
    }
    // Accessories use null for size (matches database storage)
    // FIX: Include accessories if boolean is true (user owns it) OR if itemStatus has status (user changed status)
    // This ensures items with status "Missing" are sent to backend even if boolean is false
    const apmTagStatusKey = `Accessories No 4-APM Tag`;
    if (data.accessories.apmTag || itemStatus[apmTagStatusKey]) {
      const status = itemStatus[apmTagStatusKey] || "Available";
      items.push({ 
        category: "Accessories No 4", 
        type: "APM Tag", 
        size: accessorySize, 
        quantity: 1,
        status: status
      });
    }
    const beltNo4StatusKey = `Accessories No 4-Belt No 4`;
    if (data.accessories.beltNo4 || itemStatus[beltNo4StatusKey]) {
      const status = itemStatus[beltNo4StatusKey] || "Available";
      items.push({ 
        category: "Accessories No 4", 
        type: "Belt No 4", 
        size: accessorySize, 
        quantity: 1,
        status: status
      });
    }
    return items;
  };

  const convertTShirtToBackendItems = (data: TShirtData): any[] => {
    const items: any[] = [];
    if (data.digitalShirt) {
      // CRITICAL: Get status from itemStatus state - default to "Available" if size is selected
      const statusKey = `Shirt-Digital Shirt`;
      const status = itemStatus[statusKey] || "Available";
      items.push({ 
        category: "Shirt", 
        type: "Digital Shirt", 
        size: data.digitalShirt, 
        quantity: 1,
        status: status  // CRITICAL: Backend only deducts when status is "Available"
      });
    }
    if (data.innerApmShirt) {
      // CRITICAL: Get status from itemStatus state - default to "Available" if size is selected
      const statusKey = `Shirt-Inner APM Shirt`;
      const status = itemStatus[statusKey] || "Available";
      items.push({ 
        category: "Shirt", 
        type: "Inner APM Shirt", 
        size: data.innerApmShirt, 
        quantity: 1,
        status: status  // CRITICAL: Backend only deducts when status is "Available"
      });
    }
    if (data.companyShirt) {
      // CRITICAL: Get status from itemStatus state - default to "Available" if size is selected
      const statusKey = `Shirt-Company Shirt`;
      const status = itemStatus[statusKey] || "Available";
      items.push({ 
        category: "Shirt", 
        type: "Company Shirt", 
        size: data.companyShirt, 
        quantity: 1,
        status: status  // CRITICAL: Backend only deducts when status is "Available"
      });
    }
    return items;
  };

  // Submit handlers
  const handleSubmitUniform = async (
    itemsToSend: any[],
    uniformType: string,
    hasExisting: boolean,
    categoryToUpdate?: string // Category being updated (e.g., "Uniform No 3", "Uniform No 4", "Shirt", "Accessories No 3", "Accessories No 4")
  ) => {
    if (!user?.sispaId || user.sispaId.trim() === '') {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "User information not found. Please log in again.",
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }

    if (itemsToSend.length === 0) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Please fill in at least one field.",
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      
      // Use new 5-category structure directly - no normalization
      // Backend must support: "Uniform No 3", "Uniform No 4", "Accessories No 3", "Accessories No 4", "Shirt"
      // Ensure sizes are properly formatted: empty string for accessories, actual size for main items
      const formattedItemsToSend = itemsToSend.map(item => {
        // Define main items that always have sizes (NOT accessories)
        const mainItemTypes = [
          "Uniform No 3 Male", "Uniform No 3 Female", "Uniform No 4",
          "PVC Shoes", "Beret", "Boot",
          "Digital Shirt", "Company Shirt", "Inner APM Shirt"
        ];
        const isMainItem = mainItemTypes.some(type => 
          item.type?.toLowerCase().includes(type.toLowerCase())
        );
        
        // For main items, normalize size BEFORE sending to match inventory format
        // For accessories, use null (backend might expect null instead of empty string)
        let normalizedSize = item.size;
        if (isMainItem) {
          const raw = String(item.size ?? "").trim();

          // Shoes/Boot: remove "UK" prefix so it matches inventory saved as "7"
          if (item.type === "PVC Shoes" || item.type === "Boot") {
            normalizedSize = raw.replace(/^uk\s*/i, "").trim();
          }
          // Beret: keep exact spacing/fractions (do NOT remove spaces)
          else if (item.type === "Beret") {
            normalizedSize = raw;
          }
          // Clothing/shirt/uniform: just trim
          else {
            normalizedSize = raw;
          }

          if (!normalizedSize) {
            console.warn(`Main item ${item.type} has empty size`);
          }
        } else {
          // Accessories: Use null to match database storage
          // Backend accepts null, "", or "N/A" for accessories and normalizes all to null
          // Database stores size: null for accessories
          normalizedSize =
             (!item.size || item.size === "" || item.size === null || item.size === "N/A")
               ? null  // Send null for accessories (backend accepts and stores as null)
               : item.size;
        }
        
        // CRITICAL: Always include status field, but NEVER include missingCount
        // Backend fixes:
        // - When status changes TO "Missing": backend always increments, ignoring frontend's missingCount
        // - When status changes FROM "Missing" to "Available": backend preserves missingCount
        // - Never send missingCount: 0 to prevent resetting the count
        // - Backend handles all missingCount calculations based on status changes
        const itemToSend: any = {
          ...item,
          category: item.category,
          size: normalizedSize, // Can be null for accessories
          // Always include status field (backend needs this to detect status changes)
          // Default to "Available" if not provided
          status: item.status || "Available",
        };
        
        // CRITICAL: Remove missingCount if present - backend will calculate it
        // Backend fix: Don't allow frontend to reset missingCount to 0 by sending missingCount: 0
        // Backend ignores frontend's missingCount when status is changing TO "Missing"
        // Only backend calculates missingCount based on status transitions
        if ('missingCount' in itemToSend) {
          delete itemToSend.missingCount;
        }
        
        return itemToSend;
      });

      const isSingleItemSave = formattedItemsToSend.length === 1;

      // Determine URL and method based on scenario:
      // - Single item + no existing data: POST /my-uniform/item (add single item)
      // - Single item + existing data: PUT /api/members/uniform (merge with existing)
      // - Multiple items + no existing data: POST /my-uniform (add multiple items)
      // - Multiple items + existing data: PUT /api/members/uniform (merge/replace)
      let url: string;
      let method: string;
      
      if (isSingleItemSave && !hasExisting) {
        // Single item, no existing data - use POST /my-uniform/item
        url = 'http://localhost:5000/api/uniforms/my-uniform/item';
        method = 'POST';
      } else if (!hasExisting) {
        // Multiple items, no existing data - use POST /my-uniform
        url = 'http://localhost:5000/api/uniforms/my-uniform';
        method = 'POST';
      } else {
        // Has existing data (single or multiple items) - use PUT /api/members/uniform (merge/replace)
        url = 'http://localhost:5000/api/members/uniform';
        method = 'PUT';
      }

      // If updating (PUT), we need to merge with existing items from other categories
      let finalItemsToSend = formattedItemsToSend;
      // Store old items from the category being updated for inventory restoration
      let oldCategoryItems: any[] = [];
      // Store existing data for status lookup
      let existingData: any = null;
      
      if (hasExisting && categoryToUpdate) {

        // Fetch existing uniform data first (use /my-uniform endpoint for fetching)
        try {
          const existingRes = await fetch('http://localhost:5000/api/uniforms/my-uniform', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (existingRes.ok) {
            existingData = await existingRes.json();
            if (existingData.success && existingData.uniform && existingData.uniform.items) {
              const existingItems = existingData.uniform.items || [];
              
              // Use direct category matching with new 5-category structure
              const updateCategoryLower = categoryToUpdate.toLowerCase();
              
              // Get the type(s) being updated from formattedItemsToSend
              const updatedTypes = formattedItemsToSend.map((item: any) => item.type?.toLowerCase() || "");
              
              // First, extract old items from the category being updated (for inventory restoration)
              // Only get old items that match the types being updated
              oldCategoryItems = existingItems.filter((item: any) => {
                const itemCategory = item.category?.toLowerCase() || "";
                const itemType = item.type?.toLowerCase() || "";
                if (itemCategory === updateCategoryLower) {
                  // Only include if it's the same type being updated
                  return updatedTypes.some(updatedType => itemType === updatedType || itemType.includes(updatedType) || updatedType.includes(itemType));
                }
                return false;
              });
              
              // Also handle backward compatibility for old items
              if (updateCategoryLower === "accessories no 3" || updateCategoryLower === "accessories no 4") {
                const accessoryCategoryMatch = updateCategoryLower === "accessories no 3" ? "uniform no 3" : "uniform no 4";
                const accessoryTypes = updateCategoryLower === "accessories no 3" 
                  ? ["apulet", "integrity badge", "shoulder badge", "cel bar", "beret logo pin", "belt no 3", "nametag"]
                  : ["apm tag", "belt no 4", "nametag"];
                
                existingItems.forEach((item: any) => {
                  const itemCategory = item.category?.toLowerCase() || "";
                  if (itemCategory === accessoryCategoryMatch) {
                    const typeLower = item.type?.toLowerCase() || "";
                    // Check if this accessory type matches what we're updating
                    const isMatchingAccessory = accessoryTypes.some(acc => typeLower.includes(acc));
                    const isUpdatedType = updatedTypes.some(updatedType => typeLower.includes(updatedType) || updatedType.includes(typeLower));
                    if (isMatchingAccessory && isUpdatedType) {
                      oldCategoryItems.push(item);
                    }
                  }
                });
              }
              if (updateCategoryLower === "shirt") {
                existingItems.forEach((item: any) => {
                  const itemCategory = item.category?.toLowerCase() || "";
                  if (itemCategory === "t-shirt" || itemCategory === "tshirt") {
                    const itemType = item.type?.toLowerCase() || "";
                    const isUpdatedType = updatedTypes.some(updatedType => itemType.includes(updatedType) || updatedType.includes(itemType));
                    if (isUpdatedType) {
                      oldCategoryItems.push(item);
                    }
                  }
                });
              }
              
              // For individual item saves: keep ALL existing items, only replace items with matching type
              // For category-wide saves (modal forms): replace all items in the category
              const isIndividualItemSave = isSingleItemSave;
              
              if (isIndividualItemSave) {
                // Individual item save: keep all existing items, replace only matching type
                const itemsToKeep = existingItems.filter((item: any) => {
                  const itemCategory = item.category?.toLowerCase() || "";
                  const itemType = item.type?.toLowerCase() || "";
                  
                  // Keep items from other categories
                  if (itemCategory !== updateCategoryLower) {
                    // Handle backward compatibility
                    if (updateCategoryLower === "accessories no 3" && itemCategory === "uniform no 3") {
                      const typeLower = item.type?.toLowerCase() || "";
                      const accessoryTypes = ["apulet", "integrity badge", "shoulder badge", "cel bar", "beret logo pin", "belt no 3", "nametag"];
                      if (accessoryTypes.some(acc => typeLower.includes(acc))) {
                        return false; // This is an accessory, exclude it
                      }
                    }
                    if (updateCategoryLower === "accessories no 4" && itemCategory === "uniform no 4") {
                      const typeLower = item.type?.toLowerCase() || "";
                      const accessoryTypes = ["apm tag", "belt no 4", "nametag"];
                      if (accessoryTypes.some(acc => typeLower.includes(acc))) {
                        return false; // This is an accessory, exclude it
                      }
                    }
                    if (updateCategoryLower === "shirt" && (itemCategory === "t-shirt" || itemCategory === "tshirt")) {
                      return false;
                    }
                    return true; // Keep items from other categories
                  }
                  
                  // For same category: keep items with DIFFERENT types, exclude items with SAME type
                  const isSameType = updatedTypes.some(updatedType => 
                    itemType === updatedType || itemType.includes(updatedType) || updatedType.includes(itemType)
                  );
                  return !isSameType; // Keep if different type, exclude if same type
                });
                
                // Merge: keep all existing items (except same type) + add new items
                finalItemsToSend = [...itemsToKeep, ...formattedItemsToSend];
                
                console.log(`Individual item save: Keeping ${itemsToKeep.length} existing items, replacing/adding ${formattedItemsToSend.length} item(s) of type(s): ${updatedTypes.join(", ")}`);
              } else {
                // Category-wide save (modal form): replace all items in the category
                const otherCategoryItems = existingItems.filter((item: any) => {
                  const itemCategory = item.category?.toLowerCase() || "";
                  // Direct category match - exclude items from the category being updated
                  if (itemCategory === updateCategoryLower) {
                    return false;
                  }
                  
                  // Also handle backward compatibility: if backend returns old category names,
                  // we need to map them to new categories for filtering
                  // If updating "Accessories No 3", also exclude accessories from "Uniform No 3"
                  if (updateCategoryLower === "accessories no 3" && itemCategory === "uniform no 3") {
                    const typeLower = item.type?.toLowerCase() || "";
                    const accessoryTypes = ["apulet", "integrity badge", "shoulder badge", "cel bar", "beret logo pin", "belt no 3", "nametag"];
                    if (accessoryTypes.some(acc => typeLower.includes(acc))) {
                      return false; // Exclude this accessory item
                    }
                  }
                  // If updating "Accessories No 4", also exclude accessories from "Uniform No 4"
                  if (updateCategoryLower === "accessories no 4" && itemCategory === "uniform no 4") {
                    const typeLower = item.type?.toLowerCase() || "";
                    const accessoryTypes = ["apm tag", "belt no 4", "nametag"];
                    if (accessoryTypes.some(acc => typeLower.includes(acc))) {
                      return false; // Exclude this accessory item
                    }
                  }
                  // If updating "Shirt", also exclude items from "T-Shirt" (backward compatibility)
                  if (updateCategoryLower === "shirt" && (itemCategory === "t-shirt" || itemCategory === "tshirt")) {
                    return false;
                  }
                  
                  return true; // Keep items from other categories
                });
                
                // Merge: keep items from other categories + add new items from this category
                finalItemsToSend = [...otherCategoryItems, ...formattedItemsToSend];
                
                console.log(`Category-wide save: Keeping ${otherCategoryItems.length} items from other categories, replacing all items in ${categoryToUpdate}`);
              }
              
              console.log(`Old category items (for inventory restoration):`, oldCategoryItems);
            }
          }
        } catch (fetchError) {
          console.error("Error fetching existing uniforms for merge:", fetchError);
          // Continue with just the new items if fetch fails
        }
      }

      // Build a lookup from the latest uniform data we already have in state
      // so we can preserve status if it gets dropped during mapping.
      const normalize = (v: any) => String(v ?? "").trim().toLowerCase();
      const normalizeSize = (v: any) => {
        const s = String(v ?? "").trim();
        return s === "" ? "NO_SIZE" : s.toLowerCase();
      };

      const makeKey = (it: any) =>
        `${normalize(it.category)}|${normalize(it.type)}|${normalizeSize(it.size)}`;

      // Use existingData from API if available, otherwise empty array
      const prevItems = (existingData?.uniform?.items ?? []).filter(Boolean);

      const prevStatusMap = new Map<string, string>();
      for (const it of prevItems) {
        if (it?.category && it?.type && it?.status) {
          prevStatusMap.set(makeKey(it), it.status);
        }
      }

      const cleanedItemsToSend = finalItemsToSend.map((item: any) => {
        const cleanedItem = { ...item };
      
        // ✅ Never send missingCount (backend controls it)
        if ("missingCount" in cleanedItem) {
          delete cleanedItem.missingCount;
        }
      
        // Normalize size (important: avoid null vs "" mismatches)
        if (cleanedItem.size === null || cleanedItem.size === undefined) {
          cleanedItem.size = "";
        }
      
        // ✅ Fix: don't default to Available blindly.
        // If status is missing, try to recover it from:
        // 1) itemStatus (your UI state), else
        // 2) previous status from backend (prevStatusMap), else
        // 3) fallback to "Available"
        const statusKey = `${cleanedItem.category}-${cleanedItem.type}`; // matches your itemStatus key pattern
        const prevKey = makeKey(cleanedItem);
      
        if (!cleanedItem.status) {
          cleanedItem.status =
            itemStatus?.[statusKey] ||
            prevStatusMap.get(prevKey) ||
            "Available";
        }
      
        return cleanedItem;
      });
      
      console.log("✅ CLEANED payload items status preview:",
        cleanedItemsToSend.map((x: any) => ({
          category: x.category,
          type: x.type,
          size: x.size,
          status: x.status
        }))
      );
      

      console.log("Sending request to:", url);
      console.log("Method:", method);
      console.log("Items to send:", JSON.stringify(cleanedItemsToSend, null, 2));
      
      // DEBUG: Verify status field is included and missingCount is NOT included
      console.log("🔍 Frontend MissingCount Check - Request Payload Verification:");
      cleanedItemsToSend.forEach((item: any, index: number) => {
        const hasStatus = !!item.status;
        const hasMissingCount = 'missingCount' in item;
        const statusValue = item.status;
        
        console.log(`📤 Item ${index + 1} (${item.type}):`, {
          category: item.category,
          type: item.type,
          size: item.size,
          quantity: item.quantity,
          status: statusValue, // ✅ Should always be present
          hasStatus: hasStatus, // ✅ Should be true
          hasMissingCount: hasMissingCount, // ❌ Should be false
          missingCount: item.missingCount // Should be undefined
        });
        
        // Special logging for Missing status items
        if (statusValue === "Missing") {
          console.log(`   ✅ Status is "Missing" - backend should increment missingCount`);
          if (hasMissingCount) {
            console.error(`   ❌ ERROR: missingCount field is present! This will prevent backend from incrementing!`);
          } else {
            console.log(`   ✅ missingCount field is NOT present - backend will calculate it correctly`);
          }
        }
        
        if (!item.status) {
          console.error(`⚠️ ERROR: Item ${item.type} is missing status field! Backend cannot detect status changes!`);
        }
        if (hasMissingCount) {
          console.error(`⚠️ ERROR: Item ${item.type} includes missingCount - this will override backend calculation!`);
        }
      });
      
      // Summary log
      const missingStatusItems = cleanedItemsToSend.filter((item: any) => item.status === "Missing");
      if (missingStatusItems.length > 0) {
        console.log(`📋 Summary: ${missingStatusItems.length} item(s) with status="Missing" being sent`);
        missingStatusItems.forEach((item: any) => {
          const hasMissingCount = 'missingCount' in item;
          console.log(`   - ${item.type}: status="Missing"${hasMissingCount ? ' ❌ HAS missingCount (WRONG!)' : ' ✅ NO missingCount (CORRECT!)'}`);
        });
      }
      
      // DEBUG: Check Uniform No 4 items specifically
      const uniformNo4Items = cleanedItemsToSend.filter((item: any) => 
        item.category === "Uniform No 4" && item.type === "Uniform No 4"
      );
      if (uniformNo4Items.length > 0) {
        console.log("🔍 Uniform No 4 items being sent:", uniformNo4Items);
        uniformNo4Items.forEach((item: any) => {
          console.log(`   - Category: "${item.category}", Type: "${item.type}", Size: "${item.size}", Status: "${item.status}"`);
          if (!item.status || item.status !== "Available") {
            console.error("❌ WARNING: Uniform No 4 item missing status or status is not 'Available'!");
          }
        });
      }
      // Debug: Check if Beret is being sent correctly
      const beretItems = cleanedItemsToSend.filter((item: any) => item.type?.toLowerCase().includes("beret"));
      if (beretItems.length > 0) {
        console.log("Beret items being sent:", beretItems);
        beretItems.forEach((item: any) => {
          console.log(`Beret item - Category: "${item.category}", Type: "${item.type}", Size: "${item.size}"`);
        });
      }
      
      // Prepare request body based on endpoint
      let requestBody: any;
      if (method === 'POST' && url.includes('/item')) {
        // POST /my-uniform/item expects a single item (not wrapped in items array)
        // Ensure size field is always present (even if null for accessories)
        requestBody = {
          ...cleanedItemsToSend[0],
          size: cleanedItemsToSend[0].size !== undefined ? cleanedItemsToSend[0].size : null
        };
        console.log("📤 Single item request body:", JSON.stringify(requestBody, null, 2));
      } else if (method === 'POST') {
        // POST /my-uniform expects items array
        // Ensure size field is always present for each item (even if null for accessories)
        requestBody = {
          items: cleanedItemsToSend.map((item: any) => ({
            ...item,
            size: item.size !== undefined ? item.size : null
          }))
        };
        console.log("📤 Multiple items request body:", JSON.stringify(requestBody, null, 2));
      } else {
        // PUT /api/members/uniform expects items array (no updateMode)
        // Ensure size field is empty string for accessories, actual size for uniforms
        requestBody = {
          items: cleanedItemsToSend.map((item: any) => ({
            ...item,
            size: item.size !== undefined && item.size !== null ? item.size : "" // Empty string for accessories, not null
          }))
        };
        console.log("📤 PUT request body:", JSON.stringify(requestBody, null, 2));
      }
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log("Response status:", res.status, res.statusText);

      const contentType = res.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await res.json();
          console.log("Response data:", JSON.stringify(data, null, 2));
        } catch (parseError) {
          console.error("Failed to parse JSON response:", parseError);
          const text = await res.text();
          console.error("Raw response text:", text);
          Swal.fire({
            icon: "error",
            title: "Server Error",
            text: `Invalid JSON response: ${res.status} ${res.statusText}. Response: ${text.substring(0, 200)}`,
            confirmButtonColor: "#1d4ed8",
          });
          return;
        }
      } else {
        const text = await res.text();
        console.error("Non-JSON response:", text);
        Swal.fire({
          icon: "error",
          title: "Server Error",
          text: text || `HTTP ${res.status}: ${res.statusText}`,
          confirmButtonColor: "#1d4ed8",
        });
        return;
      }

      // Check HTTP status first (handles 400, 401, 403, 500, etc.)
      if (!res.ok) {
        console.error("HTTP Error:", res.status);
        console.error("Error response data:", JSON.stringify(data, null, 2));
        console.error("Error details:", data);
        
        // Extract more detailed error information
        const errorMessage = data?.message || data?.error || data?.details || `Server returned error: ${res.statusText}`;
        const errorStack = data?.stack || "";
        
        Swal.fire({
          icon: "error",
          title: `Error ${res.status}`,
          html: `
            <div style="text-align: left;">
              <p><strong>${errorMessage}</strong></p>
              ${errorStack ? `<details style="margin-top: 10px;"><summary style="cursor: pointer; color: #666;">Technical Details</summary><pre style="font-size: 10px; overflow: auto; max-height: 200px;">${errorStack}</pre></details>` : ''}
            </div>
          `,
          confirmButtonColor: "#1d4ed8",
          width: '600px',
        });
        return false;
      }

      if (data.success) {
        // DEBUG: Verify response contains updated missingCount
        if (data.uniform && data.uniform.items) {
          console.log("📥 Frontend MissingCount Check - Response Verification:");
          // Process ALL items to update missingCount (not just missing ones)
          // This preserves missingCount for items that changed from Missing to Available
          const updatedMissingCount: Record<string, number> = {};
          const allItems = data.uniform.items || [];
          
          // First, process items with status "Missing"
          const missingItems = allItems.filter((item: any) => item.status === "Missing");
          if (missingItems.length > 0) {
            console.log(`   Found ${missingItems.length} item(s) with status="Missing" in response:`);
            missingItems.forEach((item: any) => {
              const category = item.category || "";
              const type = item.type || "";
              const sizeValue = item.size ?? "N/A";
              // ✅ CRITICAL: Use missingKey (category|type|size) NOT statusKey (category-type)
              const missingKey = getMissingKey(category, type, sizeValue);
              console.log(`   - ${item.type} [${sizeValue}]: status="${item.status}", missingCount=${item.missingCount !== undefined ? item.missingCount : 'undefined'}`);
              
              // Backend fix: missingCount now defaults to 0 instead of undefined
              // 0 is a valid value (first time Missing, backend will increment it)
              if (item.missingCount === undefined || item.missingCount === null) {
                console.warn(`     ⚠️ WARNING: missingCount is ${item.missingCount} - backend may not have included it in response`);
                console.log(`     🔄 WORKAROUND: Fetching fresh data to get missingCount from database...`);
                
                // WORKAROUND: If missingCount is not in response, fetch fresh data after a short delay
                // This ensures we get the updated missingCount from the database
                setTimeout(async () => {
                  try {
                    const token = localStorage.getItem("token");
                    const freshRes = await fetch("http://localhost:5000/api/uniforms/my-uniform", {
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    });
                    
                    if (freshRes.ok) {
                      const freshData = await freshRes.json();
                      if (freshData.success && freshData.uniform && freshData.uniform.items) {
                        const freshItem = freshData.uniform.items.find((i: any) => {
                          const freshSize = i.size ?? "N/A";
                          return i.category === category && i.type === type && freshSize === sizeValue && i.status === "Missing";
                        });
                        // Backend fix: Accept 0 as a valid value (default, backend will increment)
                        if (freshItem && freshItem.missingCount !== undefined && freshItem.missingCount !== null) {
                          console.log(`     ✅ Fetched missingCount from database: ${freshItem.missingCount}`);
                          // ✅ CRITICAL: Use missingKey NOT statusKey
                          setItemMissingCount(prev => ({ ...prev, [missingKey]: freshItem.missingCount }));
                        }
                      }
                    }
                  } catch (error) {
                    console.error("Error fetching fresh data for missingCount:", error);
                  }
                }, 500); // Wait 500ms for backend to save
              } else {
                // Backend should increment missingCount every time status is "Missing"
                // If missingCount is 0, backend may not have incremented yet or there's an issue
                if (item.missingCount === 0) {
                  console.warn(`     ⚠️ WARNING: missingCount is 0 - backend should increment it when status is "Missing"`);
                  console.warn(`     ⚠️ Backend should read existing count from DB and increment it, not reset to 0`);
                } else {
                  console.log(`     ✅ missingCount is ${item.missingCount} - backend incremented correctly`);
                }
                // Update missingCount state for UI display (but won't show 0 in UI)
                // ✅ CRITICAL: Use missingKey NOT statusKey
                updatedMissingCount[missingKey] = item.missingCount ?? 1;
              }
            });
          } else {
            console.log("   No items with status='Missing' in response");
          }
          
          // Also process items with status "Available" that have missingCount (preserve it)
          // This handles cases where item changed from Missing to Available but we want to keep the count
          allItems.forEach((item: any) => {
            if (item.status === "Available" && item.missingCount !== undefined && item.missingCount !== null) {
              const category = item.category || "";
              const type = item.type || "";
              const sizeValue = item.size ?? "N/A";
              // ✅ CRITICAL: Use missingKey (category|type|size) NOT statusKey (category-type)
              const missingKey = getMissingKey(category, type, sizeValue);
              // Preserve missingCount even when status is Available
              updatedMissingCount[missingKey] = item.missingCount;
            }
          });
          
          // Update missingCount state with new values from response
          if (Object.keys(updatedMissingCount).length > 0) {
            setItemMissingCount(prev => ({ ...prev, ...updatedMissingCount }));
          }
        }

        // ✅ Inventory deduction logic:
        // 1. Deduct only when status === "Available"
        // 2. Restore old items when status changes from "Available" to "Missing" or "Not Available"
        // 3. Restore old size + deduct new size only when status is Available (size change)
        // 
        // Backend fix: Deduct endpoint now allows empty items array when oldItems is provided
        // This enables restore operations when status changes from "Available" to "Missing"/"Not Available"
        // 
        // NOTE: Backend handles type name mapping automatically (e.g., "Uniform No 3 Female" → searches for 
        // ["Uniform No 3 Female", "Pants No 3", "Pants No. 3", ...]), so we send type names as-is.
        
        const itemsToDeduct = formattedItemsToSend.filter((item: any) => item.status === "Available");
        
        // Restore old items ONLY when:
        // 1. Old item had status === "Available"
        // 2. New item also has status === "Available" (size change scenario)
        // 3. Size actually changed (old size !== new size)
        // 
        // NO restore for status changes to "Missing" or "Not Available"
        const oldItemsToRestore = oldCategoryItems.filter((oldItem: any) => {
          // Only restore if old item had status "Available"
          if (oldItem.status !== "Available") {
            return false;
          }
          
          // Find corresponding new item
          const newItem = formattedItemsToSend.find((item: any) => 
            item.category === oldItem.category && 
            item.type === oldItem.type
          );
          
          // Only restore if:
          // 1. New item exists AND has status "Available" (size change scenario)
          // 2. Size actually changed
          if (newItem && newItem.status === "Available") {
            // Check if size changed (for items with sizes)
            if (oldItem.size && newItem.size) {
              // Size changed - restore old size, deduct new size
              return oldItem.size !== newItem.size;
            }
            // For items without sizes (accessories), no restore needed (no size to change)
            return false;
          }
          
          // Status changed to "Missing" or "Not Available" - NO restore
          return false;
        });
        
        // DEBUG: Log deduction details
        console.log("🔍 Inventory Deduction Debug:", {
          itemsToDeductCount: itemsToDeduct.length,
          oldItemsToRestoreCount: oldItemsToRestore.length,
          itemsToDeduct: itemsToDeduct.map((item: any) => ({
            category: item.category,
            type: item.type, // Backend will map this to inventory type names
            size: item.size,
            status: item.status,
            quantity: item.quantity
          })),
          oldItemsToRestore: oldItemsToRestore.map((item: any) => ({
            category: item.category,
            type: item.type, // Backend will map this to inventory type names
            size: item.size,
            status: item.status
          })),
          note: "Backend handles type name mapping (e.g., 'Uniform No 3 Female' → searches for ['Uniform No 3 Female', 'Pants No 3', ...])"
        });
        
        // Only call deduction API if there are items to deduct or restore
        // Backend fix: Allows empty items array when oldItems is provided (for restore operations)
        // This handles cases where status changes from "Available" to "Missing"/"Not Available"
        // (itemsToDeduct will be empty, but oldItemsToRestore will have items to restore)
        if (itemsToDeduct.length > 0 || oldItemsToRestore.length > 0) {
          const deductionPayload = { 
            items: itemsToDeduct, // Only deduct items with status === "Available" (can be empty for restore-only operations)
            oldItems: oldItemsToRestore // Restore old items that had status === "Available"
          };
          
          console.log("📤 Sending deduction request to: http://localhost:5000/api/inventory/deduct");
          console.log("📤 Deduction payload:", JSON.stringify(deductionPayload, null, 2));
          
          try {
            const deductRes = await fetch("http://localhost:5000/api/inventory/deduct", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(deductionPayload),
            });
            
            console.log("📥 Deduction response status:", deductRes.status, deductRes.statusText);
            
            const deductContentType = deductRes.headers.get("content-type");
            if (deductContentType && deductContentType.includes("application/json")) {
              const deductData = await deductRes.json();
              console.log("📥 Deduction response data:", JSON.stringify(deductData, null, 2));
              
              if (!deductRes.ok) {
                // Only log error, don't show to user if it's just a restore operation (no items to deduct)
                // This happens when status changes to "Not Available" or "Missing" - we're only restoring
                if (itemsToDeduct.length === 0 && oldItemsToRestore.length > 0) {
                  console.log("ℹ️ Restore operation completed (status changed away from Available)");
                  // Backend might return error if items don't exist to restore, but that's okay
                  if (deductData.message) {
                    console.log("ℹ️ Backend message:", deductData.message);
                  }
                } else {
                  console.error("❌ Deduction API error:", deductData);
                }
              } else {
                // Check if items were actually deducted
                const deductedCount = deductData.deducted?.length || 0;
                const requestedCount = itemsToDeduct.length;
                const restoredCount = deductData.restored?.length || 0;
                const requestedRestoreCount = oldItemsToRestore.length;
                
                // Log restore results
                if (requestedRestoreCount > 0) {
                  if (restoredCount === 0 && requestedRestoreCount > 0) {
                    console.log("ℹ️ No items restored (may not exist in inventory or already restored)");
                  } else {
                    console.log(`✅ Inventory restore successful - ${restoredCount} item(s) restored`);
                  }
                }
                
                // Log deduction results
                if (deductedCount === 0 && requestedCount > 0) {
                  console.warn("⚠️ WARNING: Deduction API returned success but NO items were deducted!");
                  console.warn("⚠️ This usually means backend couldn't find matching inventory items.");
                  console.warn("⚠️ Check for mismatches in:");
                  console.warn("   - Type names (e.g., 'Uniform No 3 Female' vs 'Cloth No 3')");
                  console.warn("   - Size formats (e.g., '8' vs 'UK 8')");
                  console.warn("   - Category names");
                  console.warn("⚠️ Items sent:", itemsToDeduct.map((item: any) => ({
                    category: item.category,
                    type: item.type,
                    size: item.size,
                    status: item.status
                  })));
                } else if (deductedCount < requestedCount) {
                  console.warn(`⚠️ WARNING: Only ${deductedCount} of ${requestedCount} items were deducted`);
                } else if (deductedCount > 0) {
                  console.log(`✅ Inventory deduction successful - ${deductedCount} item(s) deducted`);
                }
              }
            } else {
              const deductText = await deductRes.text();
              console.log("📥 Deduction response (non-JSON):", deductText);
              if (!deductRes.ok) {
                // Only log error, don't show to user if it's just a restore operation
                if (itemsToDeduct.length === 0 && oldItemsToRestore.length > 0) {
                  console.log("ℹ️ Restore operation (status changed away from Available) - backend may return error if items don't exist");
                } else {
                  console.error("❌ Deduction API error (non-JSON):", deductRes.status, deductText);
                }
              }
            }
          } catch (deductError: any) {
            // Only log error, don't show to user if it's just a restore operation
            if (itemsToDeduct.length === 0 && oldItemsToRestore.length > 0) {
              console.log("ℹ️ Restore operation error (non-critical):", deductError.message);
            } else {
              console.error("❌ Deduction API request failed:", deductError);
              console.error("Error details:", {
                message: deductError.message,
                stack: deductError.stack
              });
            }
            // Don't block the success flow if deduction fails - just log it
          }
        } else {
          console.log("⏭️ Skipping deduction - no items to deduct or restore");
          console.log("   Items to deduct:", itemsToDeduct.length);
          console.log("   Old items to restore:", oldItemsToRestore.length);
        }
       

        await Swal.fire({
          icon: "success",
          title: hasExisting ? "Uniform Updated!" : "Uniform Added!",
          text: hasExisting
            ? `Your ${uniformType} information has been updated.`
            : `Your ${uniformType} information has been added successfully.`,
          confirmButtonColor: "#1d4ed8",
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: true,
        });
        
        fetchUniform();
        return true;
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message || "Failed to save uniform information",
          confirmButtonColor: "#1d4ed8",
        });
        return false;
      }
    } catch (error: any) {
      console.error("Uniform save error:", error);
      Swal.fire({
        icon: "error",
        title: "Network Error",
        text: error.message || "Failed to connect to server. Please check your connection.",
        confirmButtonColor: "#1d4ed8",
      });
      return false;
    }
  };

  const handleSubmitUniformNo3 = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemsToSend = convertNo3ToBackendItems(formDataNo3);
    const success = await handleSubmitUniform(itemsToSend, "Uniform No 3", !!uniformNo3, "Uniform No 3");
    if (success) {
      setShowUniformNo3Modal(false);
    }
  };

  const handleSubmitUniformNo4 = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemsToSend = convertNo4ToBackendItems(formDataNo4);
    const success = await handleSubmitUniform(itemsToSend, "Uniform No 4", !!uniformNo4, "Uniform No 4");
    if (success) {
      setShowUniformNo4Modal(false);
    }
  };

  const handleSubmitTShirt = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemsToSend = convertTShirtToBackendItems(formDataTShirt);
    const success = await handleSubmitUniform(itemsToSend, "T-Shirt", !!tShirt, "T-Shirt");
    if (success) {
      setShowTShirtModal(false);
    }
  };

  // Helper function to get image path for an item type
  // Maps item types to their corresponding image files in public folder
  const getItemImagePath = (itemType: string): string => {
    const typeLower = itemType.toLowerCase().trim();
    
    // Map item types to image filenames (matching files in public folder)
    const imageMap: Record<string, string> = {
      // Uniform No 3 items
      "nametag no 3": "/nametagno3.png",
      "nametagno3": "/nametagno3.png",
      "nametag": "/nametagno3.png", // Default nametag for No 3
      "pvc shoes": "/pvcshoes.png",
      "pvcshoes": "/pvcshoes.png",
      "beret": "/beret.jpg",
      "beret logo pin": "/beretlogopin.jpg",
      "beretlogopin": "/beretlogopin.jpg",
      
      // Uniform No 4 items
      "boot": "/boot.jpg",
      "nametag no 4": "/nametagno4.png",
      "nametagno4": "/nametagno4.png",
      
      // Accessories No 3
      "belt no 3": "/beltno3.jpg",
      "beltno3": "/beltno3.jpg",
      "cel bar": "/celbar.jpg",
      "celbar": "/celbar.jpg",
      "shoulder badge": "/shoulderbadge.png",
      "shoulderbadge": "/shoulderbadge.png",
      "integrity badge": "/integritybadge.jpg",
      "integritybadge": "/integritybadge.jpg",
      "apulet": "/apulet.jpg",
      
      // Accessories No 4
      "belt no 4": "/beltno4.png",
      "beltno4": "/beltno4.png",
      "apm tag": "/apmtag.png",
      "apmtag": "/apmtag.png",
      
      // Shirt items (if needed)
      "digital shirt": "/digital.png",
      "company shirt": "/company.png",
      "inner apm shirt": "/innerapm.png",
    };
    
    // Check for exact match first
    if (imageMap[typeLower]) {
      return imageMap[typeLower];
    }
    
    // Check for partial matches
    for (const [key, value] of Object.entries(imageMap)) {
      if (typeLower.includes(key) || key.includes(typeLower)) {
        return value;
      }
    }
    
    // Default fallback based on common patterns
    if (typeLower.includes("nametag") && typeLower.includes("no 4")) {
      return "/nametagno4.png";
    }
    if (typeLower.includes("nametag") && (typeLower.includes("no 3") || !typeLower.includes("no 4"))) {
      return "/nametagno3.png";
    }
    if (typeLower.includes("belt") && typeLower.includes("no 4")) {
      return "/beltno4.png";
    }
    if (typeLower.includes("belt") && (typeLower.includes("no 3") || !typeLower.includes("no 4"))) {
      return "/beltno3.jpg";
    }
    
    // Return null to use the defaultImage fallback
    return "";
  };

  // Helper function to generate items dynamically from inventory
  // This ensures ALL items in admin inventory appear in user UI, even newly added ones
  const generateItemsFromInventory = (category: string, defaultImage: string): UniformItem[] => {
    // Get unique type names from inventory for this category
    // Handle both exact category match and case-insensitive match
    const categoryInventory = inventoryItems.filter(inv => {
      const invCategory = inv.category?.toLowerCase() || "";
      const targetCategory = category.toLowerCase();
      return invCategory === targetCategory;
    });
    
    const uniqueTypes = new Map<string, any>();
    
    categoryInventory.forEach(inv => {
      // Normalize type names - map old names to new names for display
      let normalizedType = inv.type;
      let normalizedName = inv.name || inv.type;
      
      // Map old type names to new standardized names
      // Check both type and name fields for old naming patterns
      const typeLower = (inv.type || "").toLowerCase().trim();
      const nameLower = (inv.name || "").toLowerCase().trim();
      
      if (category === "Uniform No 3") {
        // Priority 1: Check if already in new format
        if (typeLower === "uniform no 3 male" || typeLower.includes("uniform no 3") && typeLower.includes("male")) {
          normalizedType = "Uniform No 3 Male";
          normalizedName = "Uniform No 3 Male";
        }
        else if (typeLower === "uniform no 3 female" || (typeLower.includes("uniform no 3") && typeLower.includes("female"))) {
          normalizedType = "Uniform No 3 Female";
          normalizedName = "Uniform No 3 Female";
        }
        // Priority 2: Check for "Cloth No 3" patterns (old name for Male)
        else if (typeLower === "cloth no 3" || 
                 typeLower.includes("cloth no 3") ||
                 nameLower === "cloth no 3" ||
                 nameLower.includes("cloth no 3") ||
                 (typeLower.includes("cloth") && typeLower.includes("no 3") && !typeLower.includes("pants") && !typeLower.includes("female"))) {
          normalizedType = "Uniform No 3 Male";
          normalizedName = "Uniform No 3 Male";
        } 
        // Priority 3: Check for "Pants No 3" patterns (old name for Female)
        else if (typeLower === "pants no 3" || 
                 typeLower.includes("pants no 3") ||
                 nameLower === "pants no 3" ||
                 nameLower.includes("pants no 3") ||
                 (typeLower.includes("pants") && typeLower.includes("no 3")) ||
                 (typeLower.includes("female") && typeLower.includes("no 3"))) {
          normalizedType = "Uniform No 3 Female";
          normalizedName = "Uniform No 3 Female";
        }
      }
      
      // Use normalized type as key to avoid duplicates
      const typeKey = normalizedType;
      if (!uniqueTypes.has(typeKey)) {
        // Use image from inventory if available, otherwise use mapped image or defaultImage
        // Check for various possible field names: image, imageUrl, picture, photo
        const inventoryImage = inv.image || inv.imageUrl || inv.picture || inv.photo;
        // If no inventory image, try to get mapped image based on normalized item type
        const mappedImage = getItemImagePath(normalizedType);
        const itemImage = inventoryImage || mappedImage || defaultImage;
        
        uniqueTypes.set(typeKey, {
          type: normalizedType,
          name: normalizedName, // Use normalized name for display
          category: inv.category,
          image: itemImage,
          sizeChart: inv.sizeChart || getSizeChartUrl(category, normalizedType),
        });
      }
    });
    
    // Convert to UniformItem array
    return Array.from(uniqueTypes.values()).map((itemInfo, index) => {
      // Determine current size and status from user's uniform data
      let currentSize: string | undefined = undefined;
      let currentStatus: "Available" | "Missing" = "Missing";
      
      // Try to find size from user's uniform data based on type
      if (category === "Uniform No 3" && uniformNo3) {
        if (itemInfo.type === "Uniform No 3 Male" || itemInfo.type.includes("Male")) {
          currentSize = uniformNo3.clothNo3;
          currentStatus = uniformNo3.clothNo3 ? "Available" : "Missing";
        } else if (itemInfo.type === "Uniform No 3 Female" || itemInfo.type.includes("Female")) {
          currentSize = uniformNo3.pantsNo3;
          currentStatus = uniformNo3.pantsNo3 ? "Available" : "Missing";
        } else if (itemInfo.type === "PVC Shoes") {
          currentSize = uniformNo3.pvcShoes ? `UK ${uniformNo3.pvcShoes}` : undefined;
          currentStatus = uniformNo3.pvcShoes ? "Available" : "Missing";
        } else if (itemInfo.type === "Beret") {
          currentSize = uniformNo3.beret;
          currentStatus = uniformNo3.beret ? "Available" : "Missing";
        }
      } else if (category === "Uniform No 4" && uniformNo4) {
        if (itemInfo.type === "Uniform No 4") {
          currentSize = uniformNo4.clothNo4 || uniformNo4.pantsNo4;
          currentStatus = (uniformNo4.clothNo4 || uniformNo4.pantsNo4) ? "Available" : "Missing";
        } else if (itemInfo.type === "Boot") {
          currentSize = uniformNo4.boot ? `UK ${uniformNo4.boot}` : undefined;
          currentStatus = uniformNo4.boot ? "Available" : "Missing";
        }
      } else if (category === "Shirt" && tShirt) {
        if (itemInfo.type === "Digital Shirt") {
          currentSize = tShirt.digitalShirt;
          currentStatus = tShirt.digitalShirt ? "Available" : "Missing";
        } else if (itemInfo.type === "Company Shirt") {
          currentSize = tShirt.companyShirt;
          currentStatus = tShirt.companyShirt ? "Available" : "Missing";
        } else if (itemInfo.type === "Inner APM Shirt") {
          currentSize = tShirt.innerApmShirt;
          currentStatus = tShirt.innerApmShirt ? "Available" : "Missing";
        }
      }
      // Note: Accessories (Accessories No 3 and Accessories No 4) don't have sizes,
      // so currentSize remains undefined, which is correct
      
      // Always use normalized type as display name to ensure consistency
      // This ensures "Uniform No 3 Male" and "Uniform No 3 Female" are always displayed correctly
      const displayName = itemInfo.type; // Use normalized type as display name
      
      return {
        id: `${itemInfo.type.toLowerCase().replace(/\s+/g, '-')}-${index}`,
        name: displayName, // Always use normalized type name for display
        type: itemInfo.type, // Use normalized type
        category: itemInfo.category,
        image: itemInfo.image,
        size: currentSize,
        status: currentStatus,
        sizeChart: itemInfo.sizeChart || getSizeChartUrl(itemInfo.category, itemInfo.type),
      };
    });
  };

  // Generate items for each category
  // NOTE: After migration, backend returns "Uniform No 3 Male" and "Uniform No 3 Female"
  // instead of "Cloth No 3" and "Pants No 3". This function displays items with new names.
  // CRITICAL: Items are now generated dynamically from inventory, but fallback to hardcoded for backward compatibility
  const getUniformNo3Items = (): UniformItem[] => {
    // If inventory is loaded, generate items dynamically from inventory
    if (inventoryItems.length > 0) {
      const dynamicItems = generateItemsFromInventory("Uniform No 3", "/no3.png");
      
      // CRITICAL: Always ensure "Uniform No 3 Male" and "Uniform No 3 Female" are included
      // These are core items that should always be visible, even if not in inventory yet
      const requiredItems: UniformItem[] = [];
      
      // Check if "Uniform No 3 Male" exists in dynamic items
      const hasMale = dynamicItems.some(item => 
        item.type === "Uniform No 3 Male" || 
        item.type.toLowerCase().includes("uniform no 3 male") ||
        item.type.toLowerCase().includes("cloth no 3")
      );
      
      // Check if "Uniform No 3 Female" exists in dynamic items
      const hasFemale = dynamicItems.some(item => 
        item.type === "Uniform No 3 Female" || 
        item.type.toLowerCase().includes("uniform no 3 female") ||
        item.type.toLowerCase().includes("pants no 3")
      );
      
      // If not found in dynamic items, add them as hardcoded fallback
      if (!hasMale) {
        requiredItems.push({
          id: "uniform-no-3-male-required",
          name: "Uniform No 3 Male",
          type: "Uniform No 3 Male",
          category: "Uniform No 3",
          image: getItemImagePath("Uniform No 3 Male") || "/no3.png",
          size: uniformNo3?.clothNo3 || undefined,
          status: uniformNo3?.clothNo3 ? "Available" : "Missing",
          sizeChart: getSizeChartUrl("Uniform No 3", "Uniform No 3 Male"),
        });
      }
      
      if (!hasFemale) {
        requiredItems.push({
          id: "uniform-no-3-female-required",
          name: "Uniform No 3 Female",
          type: "Uniform No 3 Female",
          category: "Uniform No 3",
          image: getItemImagePath("Uniform No 3 Female") || "/no3.png",
          size: uniformNo3?.pantsNo3 || undefined,
          status: uniformNo3?.pantsNo3 ? "Available" : "Missing",
          sizeChart: getSizeChartUrl("Uniform No 3", "Uniform No 3 Female"),
        });
      }
      
      // Filter dynamic items to only include items with sizes (main items, not accessories)
      const filteredDynamicItems = dynamicItems.filter(item => {
        // Always include "Uniform No 3 Male" and "Uniform No 3 Female" if they exist
        const itemTypeLower = (item.type || "").toLowerCase();
        if (itemTypeLower === "uniform no 3 male" || itemTypeLower === "uniform no 3 female") {
          return true; // Always include these core items
        }
        
        // For other items, check if they have sizes in inventory
        const hasSizes = inventoryItems.some(inv => {
          if (inv.category !== "Uniform No 3" || inv.size === null) return false;
          
          const invTypeLower = (inv.type || "").toLowerCase();
          
          // Direct match
          if (invTypeLower === itemTypeLower) return true;
          
          // Check for normalized matches (old names → new names)
          if (itemTypeLower === "uniform no 3 male") {
            return invTypeLower.includes("cloth no 3") || 
                   (invTypeLower.includes("cloth") && invTypeLower.includes("no 3") && !invTypeLower.includes("pants") && !invTypeLower.includes("female"));
          }
          if (itemTypeLower === "uniform no 3 female") {
            return invTypeLower.includes("pants no 3") || 
                   (invTypeLower.includes("pants") && invTypeLower.includes("no 3")) ||
                   invTypeLower.includes("female");
          }
          
          return false;
        });
        return hasSizes;
      });
      
      // Merge required items with filtered dynamic items, removing duplicates
      const allItems = [...requiredItems, ...filteredDynamicItems];
      // Remove duplicates based on type
      const uniqueItems = allItems.filter((item, index, self) =>
        index === self.findIndex(i => i.type === item.type)
      );
      
      // CRITICAL: Sort items in specific order for Uniform No 3
      // Order: 1. Uniform No 3 Male, 2. Uniform No 3 Female, 3. PVC Shoes, 4. Beret
      const getUniformNo3ItemOrder = (itemType: string): number => {
        const typeLower = itemType.toLowerCase();
        if (typeLower.includes("uniform no 3 male") || typeLower.includes("cloth no 3")) return 1;
        if (typeLower.includes("uniform no 3 female") || typeLower.includes("pants no 3")) return 2;
        if (typeLower.includes("pvc shoes") || typeLower === "pvc shoes") return 3;
        if (typeLower.includes("beret") && !typeLower.includes("logo pin") && !typeLower.includes("pin")) return 4;
        return 999; // Other items appear last
      };
      
      uniqueItems.sort((a, b) => {
        const orderA = getUniformNo3ItemOrder(a.type);
        const orderB = getUniformNo3ItemOrder(b.type);
        return orderA - orderB;
      });
      
      return uniqueItems;
    }
    
    // Fallback to hardcoded items for backward compatibility
    return [
      {
        id: "cloth-no-3",
        name: "Uniform No 3 Male",
        type: "Uniform No 3 Male", // Updated: was "Cloth No 3"
        category: "Uniform No 3",
        image: getItemImagePath("Uniform No 3 Male") || "/no3.png",
        size: uniformNo3?.clothNo3 || undefined,
        status: uniformNo3?.clothNo3 ? "Available" : "Missing",
        sizeChart: getSizeChartUrl("Uniform No 3", "Uniform No 3 Male"),
      },
      {
        id: "pant-no-3",
        name: "Uniform No 3 Female",
        type: "Uniform No 3 Female", // Updated: was "Pants No 3"
        category: "Uniform No 3",
        image: getItemImagePath("Uniform No 3 Female") || "/no3.png",
        size: uniformNo3?.pantsNo3 || undefined,
        status: uniformNo3?.pantsNo3 ? "Available" : "Missing",
        sizeChart: getSizeChartUrl("Uniform No 3", "Uniform No 3 Female"),
      },
      {
        id: "pvc-shoes",
        name: "PVC Shoes",
        type: "PVC Shoes",
        category: "Uniform No 3",
        image: getItemImagePath("PVC Shoes") || "/no3.png",
        size: uniformNo3?.pvcShoes ? `UK ${uniformNo3?.pvcShoes}` : undefined,
        status: uniformNo3?.pvcShoes ? "Available" : "Missing",
        sizeChart: getSizeChartUrl("Uniform No 3", "PVC Shoes"),
      },
      {
        id: "beret",
        name: "Beret",
        type: "Beret",
        category: "Uniform No 3",
        image: getItemImagePath("Beret") || "/no3.png",
        size: uniformNo3?.beret || undefined,
        status: uniformNo3?.beret ? "Available" : "Missing",
        sizeChart: getSizeChartUrl("Uniform No 3", "Beret"),
      },
    ];
  };

  const getUniformNo4Items = (): UniformItem[] => {
    // If inventory is loaded, generate items dynamically from inventory
    if (inventoryItems.length > 0) {
      const dynamicItems = generateItemsFromInventory("Uniform No 4", "/no4.png");
      // Only return items that have sizes (main items, not accessories)
      const filteredItems = dynamicItems.filter(item => {
        // Normalize inventory item types for comparison (handle old names)
        const hasSizes = inventoryItems.some(inv => {
          if (inv.category !== "Uniform No 4" || inv.size === null) return false;
          
          const invTypeLower = (inv.type || "").toLowerCase();
          const itemTypeLower = (item.type || "").toLowerCase();
          
          // Direct match
          if (invTypeLower === itemTypeLower) return true;
          
          // Check for normalized matches (old names → new names)
          if (itemTypeLower === "uniform no 4") {
            return invTypeLower.includes("uniform no 4") || 
                   invTypeLower.includes("cloth no 4") ||
                   invTypeLower.includes("pants no 4");
          }
          
          return false;
        });
        return hasSizes;
      });
      
      // CRITICAL: Sort items in specific order for Uniform No 4
      // Order: 1. Uniform No 4, 2. Boot
      const getUniformNo4ItemOrder = (itemType: string): number => {
        const typeLower = itemType.toLowerCase();
        if (typeLower.includes("uniform no 4") && !typeLower.includes("boot")) return 1;
        if (typeLower.includes("boot") || typeLower === "boot") return 2;
        return 999; // Other items appear last
      };
      
      filteredItems.sort((a, b) => {
        const orderA = getUniformNo4ItemOrder(a.type);
        const orderB = getUniformNo4ItemOrder(b.type);
        return orderA - orderB;
      });
      
      return filteredItems;
    }
    
    // Fallback to hardcoded items for backward compatibility
    // Merged: "Cloth No 4" and "Pants No 4" are now a single "Uniform No 4" type
    // Use clothNo4 if available, otherwise use pantsNo4 (they should be the same since they come as a pair)
    const uniformNo4Size = uniformNo4?.clothNo4 || uniformNo4?.pantsNo4;
    return [
      {
        id: "uniform-no-4",
        name: "Uniform No 4",
        type: "Uniform No 4", // Merged: replaces "Cloth No 4" and "Pants No 4"
        category: "Uniform No 4",
        image: getItemImagePath("Uniform No 4") || "/no4.png",
        size: uniformNo4Size || undefined,
        status: uniformNo4Size ? "Available" : "Missing",
        sizeChart: getSizeChartUrl("Uniform No 4", "Uniform No 4"),
      },
      {
        id: "boot",
        name: "Boot",
        type: "Boot",
        category: "Uniform No 4",
        image: getItemImagePath("Boot") || "/no4.png",
        size: uniformNo4?.boot ? `UK ${uniformNo4.boot}` : undefined,
        status: uniformNo4?.boot ? "Available" : "Missing",
        sizeChart: getSizeChartUrl("Uniform No 4", "Boot"),
      },
    ];
  };

  const getAccessoriesNo3Items = (): UniformItem[] => {
    // Always include hardcoded nametag item to ensure it's visible
    const hardcodedNametag: UniformItem = {
      id: "nametag-no-3",
      name: "Nametag",
      type: "Nametag",
      category: "Accessories No 3",
      image: getItemImagePath("Nametag No 3") || "/no3.png",
      status: uniformNo3?.nametag ? "Available" : "Missing",
    };
    
    // If inventory is loaded, generate items dynamically from inventory
    if (inventoryItems.length > 0) {
      const dynamicItems = generateItemsFromInventory("Accessories No 3", "/no3.png");
      // Only return items that don't have sizes (accessories)
      // CRITICAL: Also handle nametag with different type names (Nametag No 3, Name Tag No 3, Nametag)
      const filteredItems = dynamicItems.filter(item => {
        const itemTypeLower = item.type?.toLowerCase() || "";
        const isNametag = itemTypeLower.includes("nametag") || itemTypeLower.includes("name tag");
        
        // For nametag, check if it exists in inventory for Accessories No 3
        if (isNametag) {
          return inventoryItems.some(inv => {
            const invCategory = inv.category?.toLowerCase() || "";
            const invType = inv.type?.toLowerCase() || "";
            return invCategory === "accessories no 3" && 
                   (invType.includes("nametag no 3") || invType.includes("name tag no 3") || 
                    (invType.includes("nametag") && !invType.includes("no 4"))) &&
                   inv.size === null;
          });
        }
        
        // For other accessories, check if they have no sizes
        const hasNoSizes = inventoryItems.some(inv => {
          const invCategory = inv.category?.toLowerCase() || "";
          const invType = inv.type?.toLowerCase() || "";
          const itemTypeLower = item.type?.toLowerCase() || "";
          return invCategory === "accessories no 3" && 
                 invType === itemTypeLower && 
                 inv.size === null;
        });
        return hasNoSizes;
      }).map(item => {
        // For accessories, determine status from uniform data
        let accessoryStatus: "Available" | "Missing" = "Missing";
        if (uniformNo3) {
          const itemTypeLower = item.type?.toLowerCase() || "";
          if (itemTypeLower === "apulet") accessoryStatus = uniformNo3.accessories.apulet ? "Available" : "Missing";
          else if (itemTypeLower.includes("integrity badge")) accessoryStatus = uniformNo3.accessories.integrityBadge ? "Available" : "Missing";
          else if (itemTypeLower.includes("shoulder badge")) accessoryStatus = uniformNo3.accessories.shoulderBadge ? "Available" : "Missing";
          else if (itemTypeLower.includes("cel bar")) accessoryStatus = uniformNo3.accessories.celBar ? "Available" : "Missing";
          else if (itemTypeLower.includes("beret logo pin")) accessoryStatus = uniformNo3.accessories.beretLogoPin ? "Available" : "Missing";
          else if (itemTypeLower.includes("belt no 3")) accessoryStatus = uniformNo3.accessories.beltNo3 ? "Available" : "Missing";
          else if (itemTypeLower.includes("nametag") || itemTypeLower.includes("name tag")) {
            // Check if it's Nametag No 3 (not No 4)
            if (itemTypeLower.includes("no 3") || (!itemTypeLower.includes("no 4"))) {
              accessoryStatus = uniformNo3.nametag ? "Available" : "Missing";
            }
          }
        }
        return { ...item, status: accessoryStatus };
      });
      
      // Check if nametag is already in filtered items
      const hasNametag = filteredItems.some(item => {
        const itemTypeLower = item.type?.toLowerCase() || "";
        return itemTypeLower.includes("nametag") || itemTypeLower.includes("name tag");
      });
      
      // If nametag is not in filtered items, add the hardcoded one
      if (!hasNametag) {
        filteredItems.push(hardcodedNametag);
      }
      
      return filteredItems;
    }
    
    // Fallback to hardcoded items for backward compatibility
    return [
      {
        id: "apulet",
        name: "Apulet",
        type: "Apulet",
        category: "Accessories No 3",
        image: getItemImagePath("Apulet") || "/no3.png",
        status: uniformNo3?.accessories.apulet ? "Available" : "Missing",
      },
      {
        id: "integrity-badge",
        name: "Integrity Badge",
        type: "Integrity Badge",
        category: "Accessories No 3",
        image: getItemImagePath("Integrity Badge") || "/no3.png",
        status: uniformNo3?.accessories.integrityBadge ? "Available" : "Missing",
      },
      {
        id: "shoulder-badge",
        name: "Shoulder Badge",
        type: "Shoulder Badge",
        category: "Accessories No 3",
        image: getItemImagePath("Shoulder Badge") || "/no3.png",
        status: uniformNo3?.accessories.shoulderBadge ? "Available" : "Missing",
      },
      {
        id: "cel-bar",
        name: "Cel Bar",
        type: "Cel Bar",
        category: "Accessories No 3",
        image: getItemImagePath("Cel Bar") || "/no3.png",
        status: uniformNo3?.accessories.celBar ? "Available" : "Missing",
      },
      {
        id: "beret-logo-pin",
        name: "Beret Logo Pin",
        type: "Beret Logo Pin",
        category: "Accessories No 3",
        image: getItemImagePath("Beret Logo Pin") || "/no3.png",
        status: uniformNo3?.accessories.beretLogoPin ? "Available" : "Missing",
      },
      {
        id: "belt-no-3",
        name: "Belt No 3",
        type: "Belt No 3",
        category: "Accessories No 3",
        image: getItemImagePath("Belt No 3") || "/no3.png",
        status: uniformNo3?.accessories.beltNo3 ? "Available" : "Missing",
      },
      {
        id: "nametag-no-3",
        name: "Nametag",
        type: "Nametag",
        category: "Accessories No 3",
        image: getItemImagePath("Nametag No 3") || "/no3.png",
        status: uniformNo3?.nametag ? "Available" : "Missing",
      },
    ];
  };

  const getAccessoriesNo4Items = (): UniformItem[] => {
    // Always include hardcoded nametag item to ensure it's visible
    const hardcodedNametag: UniformItem = {
      id: "nametag-no-4",
      name: "Nametag",
      type: "Nametag",
      category: "Accessories No 4",
      image: getItemImagePath("Nametag No 4") || "/no4.png",
      status: uniformNo4?.nametag ? "Available" : "Missing",
    };
    
    // If inventory is loaded, generate items dynamically from inventory
    if (inventoryItems.length > 0) {
      const dynamicItems = generateItemsFromInventory("Accessories No 4", "/no4.png");
      // Only return items that don't have sizes (accessories)
      // CRITICAL: Also handle nametag with different type names (Nametag No 4, Name Tag No 4, Nametag)
      const filteredItems = dynamicItems.filter(item => {
        const itemTypeLower = item.type?.toLowerCase() || "";
        const isNametag = itemTypeLower.includes("nametag") || itemTypeLower.includes("name tag");
        
        // For nametag, check if it exists in inventory for Accessories No 4
        if (isNametag) {
          return inventoryItems.some(inv => {
            const invCategory = inv.category?.toLowerCase() || "";
            const invType = inv.type?.toLowerCase() || "";
            return invCategory === "accessories no 4" && 
                   (invType.includes("nametag no 4") || invType.includes("name tag no 4") || 
                    (invType.includes("nametag") && !invType.includes("no 3"))) &&
                   inv.size === null;
          });
        }
        
        // For other accessories, check if they have no sizes
        const hasNoSizes = inventoryItems.some(inv => {
          const invCategory = inv.category?.toLowerCase() || "";
          const invType = inv.type?.toLowerCase() || "";
          const itemTypeLower = item.type?.toLowerCase() || "";
          return invCategory === "accessories no 4" && 
                 invType === itemTypeLower && 
                 inv.size === null;
        });
        return hasNoSizes;
      }).map(item => {
        // For accessories, determine status from uniform data
        let accessoryStatus: "Available" | "Missing" = "Missing";
        if (uniformNo4) {
          const itemTypeLower = item.type?.toLowerCase() || "";
          if (itemTypeLower.includes("apm tag")) accessoryStatus = uniformNo4.accessories.apmTag ? "Available" : "Missing";
          else if (itemTypeLower.includes("belt no 4")) accessoryStatus = uniformNo4.accessories.beltNo4 ? "Available" : "Missing";
          else if (itemTypeLower.includes("nametag") || itemTypeLower.includes("name tag")) {
            // Check if it's Nametag No 4 (not No 3)
            if (itemTypeLower.includes("no 4") || (!itemTypeLower.includes("no 3"))) {
              accessoryStatus = uniformNo4.nametag ? "Available" : "Missing";
            }
          }
        }
        return { ...item, status: accessoryStatus };
      });
      
      // Check if nametag is already in filtered items
      const hasNametag = filteredItems.some(item => {
        const itemTypeLower = item.type?.toLowerCase() || "";
        return itemTypeLower.includes("nametag") || itemTypeLower.includes("name tag");
      });
      
      // If nametag is not in filtered items, add the hardcoded one
      if (!hasNametag) {
        filteredItems.push(hardcodedNametag);
      }
      
      return filteredItems;
    }
    
    // Fallback to hardcoded items for backward compatibility
    return [
      {
        id: "apm-tag",
        name: "APM Tag",
        type: "APM Tag",
        category: "Accessories No 4",
        image: getItemImagePath("APM Tag") || "/no4.png",
        status: uniformNo4?.accessories.apmTag ? "Available" : "Missing",
      },
      {
        id: "belt-no-4",
        name: "Belt No 4",
        type: "Belt No 4",
        category: "Accessories No 4",
        image: getItemImagePath("Belt No 4") || "/no4.png",
        status: uniformNo4?.accessories.beltNo4 ? "Available" : "Missing",
      },
      {
        id: "nametag-no-4",
        name: "Nametag",
        type: "Nametag",
        category: "Accessories No 4",
        image: getItemImagePath("Nametag No 4") || "/no4.png",
        status: uniformNo4?.nametag ? "Available" : "Missing",
      },
    ];
  };

  const getShirtItems = (): UniformItem[] => {
    // Helper function to get price from multiple sources (priority order)
    // Price is stored directly in UniformInventory.price (per shirt type, same for all sizes)
    const getShirtPrice = (shirtType: string): number | undefined => {
      // Priority 1: Get price from API response items (user's saved uniform data - most up-to-date)
      const apiItem = apiItemsWithPrices.find((item: any) => 
        item.category === "Shirt" && 
        item.type?.toLowerCase() === shirtType.toLowerCase() &&
        item.price !== undefined && 
        item.price !== null
      );
      
      if (apiItem && apiItem.price !== null && apiItem.price !== undefined) {
        return apiItem.price;
      }
      
      // Priority 2: Get price from inventory items (UniformInventory.price - always available)
      // Price is stored directly in item.price field from GET /api/inventory
      const inventoryItem = inventoryItems.find((item: any) => {
        const category = item.category?.toLowerCase() || "";
        const type = item.type?.toLowerCase() || "";
        return (category === "shirt" || category === "t-shirt") &&
               type === shirtType.toLowerCase() &&
               item.price !== undefined && 
               item.price !== null;
      });
      
      if (inventoryItem && inventoryItem.price !== null && inventoryItem.price !== undefined) {
        console.log(`💰 Found price from UniformInventory for ${shirtType}:`, inventoryItem.price);
        return inventoryItem.price;
      } else {
        // Debug: Log if inventory item found but price is missing
        const itemWithoutPrice = inventoryItems.find((item: any) => {
          const category = item.category?.toLowerCase() || "";
          const type = item.type?.toLowerCase() || "";
          return (category === "shirt" || category === "t-shirt") &&
                 type === shirtType.toLowerCase();
        });
        if (itemWithoutPrice) {
          console.warn(`⚠️ Inventory item found for ${shirtType} but price is missing:`, {
            category: itemWithoutPrice.category,
            type: itemWithoutPrice.type,
            hasPrice: itemWithoutPrice.price !== undefined,
            priceValue: itemWithoutPrice.price,
            allFields: Object.keys(itemWithoutPrice)
          });
        } else {
          console.warn(`⚠️ No inventory item found for ${shirtType}`);
        }
      }
      
      // Priority 3: Fallback to shirtPrices state (from previous fetch or localStorage)
      if (shirtType === "Digital Shirt") {
        return shirtPrices.digitalShirt !== null ? shirtPrices.digitalShirt : undefined;
      } else if (shirtType === "Company Shirt") {
        return shirtPrices.companyShirt !== null ? shirtPrices.companyShirt : undefined;
      } else if (shirtType === "Inner APM Shirt") {
        return shirtPrices.innerApmShirt !== null ? shirtPrices.innerApmShirt : undefined;
      }
      
      return undefined;
    };
    
    // If inventory is loaded, generate items dynamically from inventory
    if (inventoryItems.length > 0) {
      const dynamicItems = generateItemsFromInventory("Shirt", "/digital.png");
      // Only return items that have sizes
      return dynamicItems.filter(item => {
        const hasSizes = inventoryItems.some(inv =>
          (inv.category === "Shirt" || inv.category === "T-Shirt") &&
          inv.type === item.type &&
          inv.size !== null
        );
        return hasSizes;
      }).map(item => {
        // Determine status and price
        let shirtStatus: "Available" | "Missing" = "Missing";
        if (item.type === "Digital Shirt") {
          shirtStatus = tShirt?.digitalShirt ? "Available" : "Missing";
        } else if (item.type === "Company Shirt") {
          shirtStatus = tShirt?.companyShirt ? "Available" : "Missing";
        } else if (item.type === "Inner APM Shirt") {
          shirtStatus = tShirt?.innerApmShirt ? "Available" : "Missing";
        }
        
        // Get price from API response or state
        const shirtPrice = getShirtPrice(item.type);
        
        return { ...item, status: shirtStatus, price: shirtPrice };
      });
    }
    
    // Fallback to hardcoded items for backward compatibility
    return [
      {
        id: "digital-shirt",
        name: "Digital",
        type: "Digital Shirt",
        category: "Shirt",
        image: "/digital.png",
        size: tShirt?.digitalShirt || undefined,
        status: tShirt?.digitalShirt ? "Available" : "Missing",
        price: getShirtPrice("Digital Shirt"),
        sizeChart: getSizeChartUrl("T-Shirt", "Digital Shirt"),
      },
      {
        id: "company-shirt",
        name: "Company",
        type: "Company Shirt",
        category: "Shirt",
        image: "/company.png",
        size: tShirt?.companyShirt || undefined,
        status: tShirt?.companyShirt ? "Available" : "Missing",
        price: getShirtPrice("Company Shirt"),
        sizeChart: getSizeChartUrl("T-Shirt", "Company Shirt"),
      },
      {
        id: "inner-shirt",
        name: "Inner",
        type: "Inner APM Shirt",
        category: "Shirt",
        image: "/innerapm.png",
        size: tShirt?.innerApmShirt || undefined,
        status: tShirt?.innerApmShirt ? "Available" : "Missing",
        price: getShirtPrice("Inner APM Shirt"),
        sizeChart: getSizeChartUrl("T-Shirt", "Inner APM Shirt"),
      },
    ];
  };

  // Get items based on selected category
  const getItemsForCategory = (category: string): UniformItem[] => {
    switch (category) {
      case "Uniform No 3":
        return getUniformNo3Items();
      case "Uniform No 4":
        return getUniformNo4Items();
      case "Accessories No 3":
        return getAccessoriesNo3Items();
      case "Accessories No 4":
        return getAccessoriesNo4Items();
      case "Shirt":
        return getShirtItems();
      default:
        return [];
    }
  };

  // Initialize formData when uniform data is loaded
  useEffect(() => {
    // Initialize all formData to ensure search results can be edited
    if (uniformNo3) {
      setFormDataNo3(uniformNo3);
    }

    if (uniformNo4) {
      setFormDataNo4(uniformNo4);
    }

    if (tShirt) {
      setFormDataTShirt(tShirt);
    }
  }, [uniformNo3, uniformNo4, tShirt]);

  // Get all items from all categories
  const getAllItems = (): UniformItem[] => {
    return [
      ...getUniformNo3Items(),
      ...getUniformNo4Items(),
      ...getAccessoriesNo3Items(),
      ...getAccessoriesNo4Items(),
      ...getShirtItems(),
    ];
  };

  // Filter items: if searching, search across all categories; otherwise filter by selected category
  // Search by: name, SISPA ID, item type, or size
  const displayedItems = searchTerm
    ? getAllItems().filter((item) => {
        const searchLower = searchTerm.toLowerCase().trim();
        if (!searchLower) return true;
        
        // Search in item name
        const matchesName = item.name.toLowerCase().includes(searchLower);
        
        // Search in item type
        const matchesType = item.type.toLowerCase().includes(searchLower);
        
        // Search in SISPA ID (if user has one)
        const matchesSispaId = user?.sispaId?.toLowerCase().includes(searchLower) || false;
        
        // Search in item size (if available)
        const matchesSize = item.size?.toLowerCase().includes(searchLower) || false;
        
        // Also search in current size values from form data
        let matchesFormSize = false;
        if (item.category === "Uniform No 3") {
          if (item.type === "Uniform No 3 Male" || item.type === "Cloth No 3") {
            matchesFormSize = (formDataNo3?.clothNo3 || uniformNo3?.clothNo3 || "").toLowerCase().includes(searchLower);
          } else if (item.type === "Uniform No 3 Female" || item.type === "Pants No 3") {
            matchesFormSize = (formDataNo3?.pantsNo3 || uniformNo3?.pantsNo3 || "").toLowerCase().includes(searchLower);
          } else if (item.type === "PVC Shoes") {
            matchesFormSize = (formDataNo3?.pvcShoes || uniformNo3?.pvcShoes || "").toLowerCase().includes(searchLower);
          } else if (item.type === "Beret") {
            matchesFormSize = (formDataNo3?.beret || uniformNo3?.beret || "").toLowerCase().includes(searchLower);
          }
        } else if (item.category === "Uniform No 4") {
          if (item.type === "Uniform No 4" || item.type === "Cloth No 4" || item.type === "Pants No 4") {
            matchesFormSize = (formDataNo4?.clothNo4 || formDataNo4?.pantsNo4 || uniformNo4?.clothNo4 || uniformNo4?.pantsNo4 || "").toLowerCase().includes(searchLower);
          } else if (item.type === "Boot") {
            matchesFormSize = (formDataNo4?.boot || uniformNo4?.boot || "").toLowerCase().includes(searchLower);
          }
        } else if (item.category === "Shirt") {
          if (item.type === "Digital Shirt") {
            matchesFormSize = (formDataTShirt?.digitalShirt || tShirt?.digitalShirt || "").toLowerCase().includes(searchLower);
          } else if (item.type === "Inner APM Shirt") {
            matchesFormSize = (formDataTShirt?.innerApmShirt || tShirt?.innerApmShirt || "").toLowerCase().includes(searchLower);
          } else if (item.type === "Company Shirt") {
            matchesFormSize = (formDataTShirt?.companyShirt || tShirt?.companyShirt || "").toLowerCase().includes(searchLower);
          }
        }
        
        return matchesName || matchesType || matchesSispaId || matchesSize || matchesFormSize;
      })
    : selectedCategory
    ? getItemsForCategory(selectedCategory)
    : [];

  const categories = [
    "Uniform No 3",
    "Uniform No 4",
    "Accessories No 3",
    "Accessories No 4",
    "Shirt",
  ];

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        {selectedCategory && (
          <button
            onClick={() => setSelectedCategory("")}
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-all duration-300 hover:scale-110 border-2 border-blue-700"
            title="Back to Categories"
          >
            <ArrowLeftIcon className="w-6 h-6" strokeWidth={2.5} />
          </button>
        )}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 drop-shadow-md" style={{ textShadow: '0 2px 4px rgba(255,255,255,0.8)' }}>My Uniform</h1>
          <p className="text-gray-700 mt-2 font-medium drop-shadow-sm" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
            {selectedCategory ? `Viewing: ${selectedCategory}` : "Search or select a category to view your uniform items"}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, SISPA ID, item type, or size..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-6">
        {categories.map((category) => {
          const categoryImages: Record<string, string> = {
            "Uniform No 3": "/no3.png",
            "Uniform No 4": "/no4.png",
            "Accessories No 3": "/no3.png",
            "Accessories No 4": "/no4.png",
            "Shirt": "/digital.png",
          };
          const categoryImage = categoryImages[category] || "/no3.png";
          
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`bg-white/95 backdrop-blur-sm rounded-lg shadow-md border-2 p-6 hover:shadow-lg transition-all duration-300 hover:scale-105 text-left ${
                selectedCategory === category
                  ? "border-orange-500 shadow-lg scale-105"
                  : "border-orange-300"
              }`}
            >
              {/* Category Image */}
              <div className="mb-4 flex justify-center items-center bg-gray-50 rounded-lg border-2 border-orange-200" style={{ height: '160px' }}>
                <img
                  src={categoryImage}
                  alt={category}
                  className="max-w-full max-h-full object-contain p-2"
                />
              </div>

              {/* Category Name */}
              <h2 className="text-xl font-bold text-gray-900 text-center">{category}</h2>
            </button>
          );
        })}
      </div>

      {/* Items Display - Editable Cards */}
      {(selectedCategory || searchTerm) && displayedItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {searchTerm ? `Search Results for "${searchTerm}"` : selectedCategory}
            </h2>
            {/* Price Error Warning & Refresh Button */}
            {priceLoadError && (selectedCategory === "Shirt" || selectedCategory === "T-Shirt" || displayedItems.some(item => item.category === "Shirt")) && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm text-amber-800">Prices not available</span>
                </div>
                <button
                  onClick={() => fetchInventory(true)}
                  disabled={isRefreshingPrices}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  title="Refresh prices from inventory"
                >
                  <svg 
                    className={`w-4 h-4 ${isRefreshingPrices ? 'animate-spin' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isRefreshingPrices ? 'Refreshing...' : 'Refresh Prices'}
                </button>
              </div>
            )}
          </div>

          {displayedItems.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No items found. {searchTerm && "Try a different search term."}
            </p>
          ) : (
            <div className="space-y-4">
              {displayedItems.map((item) => {
                // Get current value for this item - use item.category to determine which data to use
                // Priority: formData (current editing state) > database values
                const getCurrentValue = () => {
                  const category = item.category;
                  
                  if (category === "Uniform No 3") {
                    if (item.type === "Uniform No 3 Male" || item.type === "Cloth No 3") return formDataNo3?.clothNo3 || uniformNo3?.clothNo3 || "";
                    if (item.type === "Uniform No 3 Female" || item.type === "Pants No 3") return formDataNo3?.pantsNo3 || uniformNo3?.pantsNo3 || "";
                    if (item.type === "PVC Shoes") return formDataNo3?.pvcShoes || uniformNo3?.pvcShoes || "";
                    if (item.type === "Beret") return formDataNo3?.beret || uniformNo3?.beret || "";
                    if (item.type === "Apulet") {
                      const value = formDataNo3?.accessories?.apulet ?? uniformNo3?.accessories?.apulet;
                      return value ? "Available" : "Missing";
                    }
                    if (item.type === "Integrity Badge") {
                      const value = formDataNo3?.accessories?.integrityBadge ?? uniformNo3?.accessories?.integrityBadge;
                      return value ? "Available" : "Missing";
                    }
                    if (item.type === "Shoulder Badge") {
                      const value = formDataNo3?.accessories?.shoulderBadge ?? uniformNo3?.accessories?.shoulderBadge;
                      return value ? "Available" : "Missing";
                    }
                    if (item.type === "Cel Bar") {
                      const value = formDataNo3?.accessories?.celBar ?? uniformNo3?.accessories?.celBar;
                      return value ? "Available" : "Missing";
                    }
                    if (item.type === "Beret Logo Pin") {
                      const value = formDataNo3?.accessories?.beretLogoPin ?? uniformNo3?.accessories?.beretLogoPin;
                      return value ? "Available" : "Missing";
                    }
                    if (item.type === "Belt No 3") {
                      const value = formDataNo3?.accessories?.beltNo3 ?? uniformNo3?.accessories?.beltNo3;
                      return value ? "Available" : "Missing";
                    }
                    if (item.type === "Nametag") {
                      const nametagValue = formDataNo3?.nametag || uniformNo3?.nametag || "";
                      return nametagValue && nametagValue.trim() !== "" ? "Available" : "Missing";
                    }
                  } else if (category === "Uniform No 4") {
                    // Merged: "Cloth No 4" and "Pants No 4" are now "Uniform No 4"
                    if (item.type === "Uniform No 4" || item.type === "Cloth No 4" || item.type === "Pants No 4") {
                      return formDataNo4?.clothNo4 || formDataNo4?.pantsNo4 || uniformNo4?.clothNo4 || uniformNo4?.pantsNo4 || "";
                    }
                    if (item.type === "Boot") return formDataNo4?.boot || uniformNo4?.boot || "";
                    if (item.type === "APM Tag") {
                      const value = formDataNo4?.accessories?.apmTag ?? uniformNo4?.accessories?.apmTag;
                      return value ? "Available" : "Missing";
                    }
                    if (item.type === "Belt No 4") {
                      const value = formDataNo4?.accessories?.beltNo4 ?? uniformNo4?.accessories?.beltNo4;
                      return value ? "Available" : "Missing";
                    }
                    if (item.type === "Nametag") {
                      const nametagValue = formDataNo4?.nametag || uniformNo4?.nametag || "";
                      return nametagValue && nametagValue.trim() !== "" ? "Available" : "Missing";
                    }
                  } else if (category === "Shirt") {
                    if (item.type === "Digital Shirt") return formDataTShirt?.digitalShirt || tShirt?.digitalShirt || "";
                    if (item.type === "Company Shirt") return formDataTShirt?.companyShirt || tShirt?.companyShirt || "";
                    if (item.type === "Inner APM Shirt") return formDataTShirt?.innerApmShirt || tShirt?.innerApmShirt || "";
                  } else if (category === "Accessories No 3") {
                    if (item.type === "Apulet") {
                      const value = formDataNo3?.accessories?.apulet ?? uniformNo3?.accessories?.apulet;
                      return value ? "Available" : "Missing";
                    }
                    if (item.type === "Integrity Badge") {
                      const value = formDataNo3?.accessories?.integrityBadge ?? uniformNo3?.accessories?.integrityBadge;
                      return value ? "Available" : "Missing";
                    }
                    if (item.type === "Shoulder Badge") {
                      const value = formDataNo3?.accessories?.shoulderBadge ?? uniformNo3?.accessories?.shoulderBadge;
                      return value ? "Available" : "Missing";
                    }
                    if (item.type === "Cel Bar") {
                      const value = formDataNo3?.accessories?.celBar ?? uniformNo3?.accessories?.celBar;
                      return value ? "Available" : "Missing";
                    }
                    if (item.type === "Beret Logo Pin") {
                      const value = formDataNo3?.accessories?.beretLogoPin ?? uniformNo3?.accessories?.beretLogoPin;
                      return value ? "Available" : "Missing";
                    }
                    if (item.type === "Belt No 3") {
                      const value = formDataNo3?.accessories?.beltNo3 ?? uniformNo3?.accessories?.beltNo3;
                      return value ? "Available" : "Missing";
                    }
                    if (item.type === "Nametag") {
                      const nametagValue = formDataNo3?.nametag || uniformNo3?.nametag || "";
                      return nametagValue && nametagValue.trim() !== "" ? "Available" : "Missing";
                    }
                  } else if (category === "Accessories No 4") {
                    if (item.type === "APM Tag") {
                      const value = formDataNo4?.accessories?.apmTag ?? uniformNo4?.accessories?.apmTag;
                      return value ? "Available" : "Missing";
                    }
                    if (item.type === "Belt No 4") {
                      const value = formDataNo4?.accessories?.beltNo4 ?? uniformNo4?.accessories?.beltNo4;
                      return value ? "Available" : "Missing";
                    }
                    if (item.type === "Nametag") {
                      const nametagValue = formDataNo4?.nametag || uniformNo4?.nametag || "";
                      return nametagValue && nametagValue.trim() !== "" ? "Available" : "Missing";
                    }
                  }
                  return "";
                };

                const currentValue = getCurrentValue();
                const isAccessory = !item.size && (item.category.includes("Accessories") || item.type.includes("Badge") || item.type.includes("Tag") || item.type.includes("Belt") || item.type.includes("Apulet") || item.type.includes("Cel Bar") || item.type.includes("Pin"));
                const isNametag = item.type === "Nametag";

                // Get size options based on item type
                const getSizeOptions = () => {
                  if (item.type.includes("Shoe") || item.type === "PVC Shoes") return shoeSizes;
                  if (item.type === "Boot") return bootSizes;
                  if (item.type === "Beret") return beretSizes;
                  return clothSizes;
                };

                const handleSizeChange = (value: string) => {
                  const category = item.category;
                  // Remove "UK " prefix if present from the value
                  const cleanValue = value.replace(/^UK\s*/i, "").trim();
                  
                  if (category === "Uniform No 3") {
                    const updated = { ...formDataNo3 };
                    if (item.type === "Uniform No 3 Male" || item.type === "Cloth No 3") {
                      updated.clothNo3 = cleanValue;
                      // Auto-set status to "Available" when size is selected
                      setItemStatus(prev => ({ ...prev, [`${category}-${item.type}`]: "Available" }));
                    }
                    if (item.type === "Uniform No 3 Female" || item.type === "Pants No 3") {
                      updated.pantsNo3 = cleanValue;
                      setItemStatus(prev => ({ ...prev, [`${category}-${item.type}`]: "Available" }));
                    }
                    if (item.type === "PVC Shoes") {
                      updated.pvcShoes = cleanValue;
                      setItemStatus(prev => ({ ...prev, [`${category}-${item.type}`]: "Available" }));
                    }
                    if (item.type === "Beret") {
                      updated.beret = cleanValue;
                      setItemStatus(prev => ({ ...prev, [`${category}-${item.type}`]: "Available" }));
                    }
                    setFormDataNo3(updated);
                  } else if (category === "Uniform No 4") {
                    const updated = { ...formDataNo4 };
                    // Merged: "Uniform No 4" replaces "Cloth No 4" and "Pants No 4"
                    // Since they come as a pair, set both to the same value
                    if (item.type === "Uniform No 4" || item.type === "Cloth No 4" || item.type === "Pants No 4") {
                      updated.clothNo4 = cleanValue;
                      updated.pantsNo4 = cleanValue; // Same size for both since they come as a pair
                      setItemStatus(prev => ({ ...prev, [`${category}-${item.type}`]: "Available" }));
                    }
                    if (item.type === "Boot") {
                      updated.boot = cleanValue;
                      setItemStatus(prev => ({ ...prev, [`${category}-${item.type}`]: "Available" }));
                    }
                    setFormDataNo4(updated);
                  } else if (category === "Shirt") {
                    const updated = { ...formDataTShirt };
                    if (item.type === "Digital Shirt") {
                      updated.digitalShirt = cleanValue;
                      setItemStatus(prev => ({ ...prev, [`${category}-${item.type}`]: "Available" }));
                    }
                    if (item.type === "Company Shirt") {
                      updated.companyShirt = cleanValue;
                      setItemStatus(prev => ({ ...prev, [`${category}-${item.type}`]: "Available" }));
                    }
                    if (item.type === "Inner APM Shirt") {
                      updated.innerApmShirt = cleanValue;
                      setItemStatus(prev => ({ ...prev, [`${category}-${item.type}`]: "Available" }));
                    }
                    setFormDataTShirt(updated);
                  }
                };

                const handleStatusChange = (value: string) => {
                  const category = item.category;
                  const statusKey = `${category}-${item.type}`;

                  // If user selects placeholder (empty), clear stored status so dropdown goes back to "Select Status"
                  if (!value) {
                    setItemStatus(prev => {
                      const updated = { ...prev };
                      delete updated[statusKey];
                      return updated;
                    });
                    return;
                  }

                  const statusValue = value as "Available" | "Missing" | "Not Available";
                  
                  // Status is independent of size - user can set status to indicate "no planning"
                  // even if size is selected (like in Excel: ADA/TIADA independent of size)
                  
                  if (category === "Uniform No 3" || category === "Accessories No 3") {
                    const updated = { ...formDataNo3 };
                    
                    // Handle items with sizes - store status separately
                    if (item.type === "Uniform No 3 Male" || item.type === "Uniform No 3 Female" || item.type === "Cloth No 3" || item.type === "Pants No 3" || item.type === "PVC Shoes" || item.type === "Beret") {
                      // Store status independently - don't clear size
                      setItemStatus(prev => ({ ...prev, [`${category}-${item.type}`]: statusValue }));
                    }
                    
                    // Handle accessories (status stored in itemStatus only)
                    // FIX: Don't change boolean when status changes - boolean = ownership, not status
                    // Boolean should only change when item is added/removed, not when status changes
                    // This allows status to be "Missing" while boolean remains true (user owns it but it's missing)
                    const statusKey = `${category}-${item.type}`;
                    setItemStatus(prev => ({ ...prev, [statusKey]: statusValue }));
                    
                    // DO NOT update boolean flags when status changes
                    // Boolean represents ownership (user has the item), not current status
                    // Status is stored separately in itemStatus
                    
                    if (item.type === "Nametag") {
                      // For nametag, if status is "Not Available" or "Missing", clear the name
                      if (value === "Not Available" || value === "Missing") {
                        updated.nametag = "";
                      }
                    }
                    setFormDataNo3(updated);
                  } else if (category === "Uniform No 4" || category === "Accessories No 4") {
                    const updated = { ...formDataNo4 };
                    
                    // Handle items with sizes - store status separately
                    // Merged: "Cloth No 4" and "Pants No 4" are now "Uniform No 4"
                    if (item.type === "Uniform No 4" || item.type === "Cloth No 4" || item.type === "Pants No 4" || item.type === "Boot") {
                      // Store status independently - don't clear size
                      setItemStatus(prev => ({ ...prev, [`${category}-${item.type}`]: statusValue }));
                    }
                    
                    // Handle accessories (status stored in itemStatus only)
                    // FIX: Don't change boolean when status changes - boolean = ownership, not status
                    // Boolean should only change when item is added/removed, not when status changes
                    // This allows status to be "Missing" while boolean remains true (user owns it but it's missing)
                    const statusKey = `${category}-${item.type}`;
                    setItemStatus(prev => ({ ...prev, [statusKey]: statusValue }));
                    
                    // DO NOT update boolean flags when status changes
                    // Boolean represents ownership (user has the item), not current status
                    // Status is stored separately in itemStatus
                    
                    if (item.type === "Nametag") {
                      // For nametag, if status is "Not Available" or "Missing", clear the name
                      if (value === "Not Available" || value === "Missing") {
                        updated.nametag = "";
                      }
                    }
                    setFormDataNo4(updated);
                  } else if (category === "Shirt") {
                    const updated = { ...formDataTShirt };
                    
                    // Handle shirts with sizes - store status separately
                    if (item.type === "Digital Shirt" || item.type === "Company Shirt" || item.type === "Inner APM Shirt") {
                      // Store status independently - don't clear size
                      setItemStatus(prev => ({ ...prev, [`${category}-${item.type}`]: statusValue }));
                    }
                    setFormDataTShirt(updated);
                  }
                };

                const handleNametagChange = (value: string) => {
                  const category = item.category;
                  
                  if (category === "Accessories No 3") {
                    const updated = { ...formDataNo3 };
                    updated.nametag = value;
                    setFormDataNo3(updated);
                  } else if (category === "Accessories No 4") {
                    const updated = { ...formDataNo4 };
                    updated.nametag = value;
                    setFormDataNo4(updated);
                  }
                };

                // Get nametag value
                const getNametagValue = () => {
                  const category = item.category;
                  
                  if (category === "Accessories No 3") {
                    return formDataNo3?.nametag || "";
                  } else if (category === "Accessories No 4") {
                    return formDataNo4?.nametag || "";
                  }
                  return "";
                };

                // Get current status value
                // Status is independent of size - can be "Available", "Missing", or "Not Available"
                // even if size is selected (to indicate "no planning" like in Excel)
                const getCurrentStatus = () => {
                  if (isAccessory) {
                    // CRITICAL: For all accessories, check itemStatus first (from API or user selection)
                    const statusKey = `${item.category}-${item.type}`;
                    const storedStatus = itemStatus[statusKey];
                    if (storedStatus) {
                      return storedStatus;
                    }
                    
                    if (isNametag) {
                      // For nametag, determine from nametag value if status not set
                      const nametagValue = getNametagValue();
                      // If name exists, status is "Available"
                      if (nametagValue && nametagValue.trim() !== "") {
                        return "Available";
                      }
                      // No status chosen and no name yet → show placeholder
                      return "";
                    }

                    // For other accessories, use ownership flag to determine default:
                    // - If user doesn't own it yet → no status selected (show placeholder)
                    // - If user owns it and no status set yet → default to "Available"
                    let hasOwnership = false;
                    if (item.category === "Accessories No 3") {
                      if (item.type === "Apulet") {
                        hasOwnership = !!(formDataNo3?.accessories?.apulet ?? uniformNo3?.accessories?.apulet);
                      } else if (item.type.includes("Integrity Badge")) {
                        hasOwnership = !!(formDataNo3?.accessories?.integrityBadge ?? uniformNo3?.accessories?.integrityBadge);
                      } else if (item.type.includes("Shoulder Badge")) {
                        hasOwnership = !!(formDataNo3?.accessories?.shoulderBadge ?? uniformNo3?.accessories?.shoulderBadge);
                      } else if (item.type.includes("Cel Bar")) {
                        hasOwnership = !!(formDataNo3?.accessories?.celBar ?? uniformNo3?.accessories?.celBar);
                      } else if (item.type.includes("Beret Logo") || item.type.includes("Beret Logo Pin")) {
                        hasOwnership = !!(formDataNo3?.accessories?.beretLogoPin ?? uniformNo3?.accessories?.beretLogoPin);
                      } else if (item.type.includes("Belt No 3")) {
                        hasOwnership = !!(formDataNo3?.accessories?.beltNo3 ?? uniformNo3?.accessories?.beltNo3);
                      }
                    } else if (item.category === "Accessories No 4") {
                      if (item.type.includes("APM Tag")) {
                        hasOwnership = !!(formDataNo4?.accessories?.apmTag ?? uniformNo4?.accessories?.apmTag);
                      } else if (item.type.includes("Belt No 4")) {
                        hasOwnership = !!(formDataNo4?.accessories?.beltNo4 ?? uniformNo4?.accessories?.beltNo4);
                      }
                    }

                    if (!hasOwnership) {
                      // User hasn't indicated they own this accessory and hasn't set a status → placeholder
                      return "";
                    }

                    // User owns the accessory but no explicit status yet → default to "Available"
                    return "Available";
                  }
                  
                  // For items with sizes, check if status was manually set
                  const statusKey = `${item.category}-${item.type}`;
                  if (itemStatus[statusKey]) {
                    return itemStatus[statusKey];
                  }
                  
                  // Default behaviour when no explicit status is set for sized items:
                  // - If no size selected AND no status set yet -> return empty string so the dropdown
                  //   shows a "Select Status" placeholder.
                  // - If a size exists (currentValue not empty) and no status set -> default to "Available".
                  if (!currentValue || currentValue.trim() === "") {
                    return "";
                  }
                  
                  return "Available";
                };

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden w-full"
                  >
                    {/* Header */}
                    <div className="bg-gray-100 px-4 py-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">{item.name}</h3>
                        <div className="flex items-center gap-2">
                          {searchTerm && (
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                              {item.category}
                            </span>
                          )}
                          {/* Size Chart Button - Show for items that have size dropdowns (not accessories) */}
                          {!isAccessory && !isNametag && (
                            <button
                              type="button"
                              onClick={() => {
                                // Try to get size chart URL - first from item, then from getSizeChartUrl function
                                const sizeChartUrl = item.sizeChart || getSizeChartUrl(item.category, item.type);
                                
                                if (sizeChartUrl) {
                                  setSizeChartModal({
                                    isOpen: true,
                                    itemName: item.name,
                                    sizeChartUrl: sizeChartUrl,
                                  });
                                } else {
                                  // Show message if no size chart is available
                                  Swal.fire({
                                    icon: "info",
                                    title: "Size Chart Not Available",
                                    text: `Size chart for ${item.name} is not currently available. Please contact the logistics coordinator.`,
                                    confirmButtonColor: "#1d4ed8",
                                  });
                                }
                              }}
                              className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition flex items-center gap-1"
                              title="View Size Chart"
                            >
                              <ChartBarIcon className="w-4 h-4" />
                              Size Chart
                            </button>
                          )}
                          {/* Save Button */}
                          <button
                            onClick={async () => {
                              // Create item to save - read from currentValue which reflects latest formData state
                              let itemToSave: any = null;
                              const category = item.category;
                              
                              // Use currentValue which is computed from the latest formData state
                              const sizeValue = currentValue || "";
                              const statusValue = getCurrentStatus();
                              
                              console.log("Save clicked for:", item.name, "Size:", sizeValue, "Status:", statusValue);
                              console.log("Current formData:", { formDataNo3, formDataNo4, formDataTShirt });
                              
                              if (category === "Uniform No 3") {
                                // Handle hardcoded items first
                                if (item.type === "Uniform No 3 Male" || item.type === "Cloth No 3") {
                                  // Use the sizeValue from dropdown or fallback to formData
                                  const size = sizeValue && sizeValue !== "Select Size" ? sizeValue : (formDataNo3.clothNo3 || "");
                                  if (size && size !== "Select Size" && size.trim() !== "") {
                                    itemToSave = { 
                                      category: "Uniform No 3", 
                                      type: "Uniform No 3 Male", 
                                      size: size, 
                                      quantity: 1,
                                      status: statusValue || "Available"
                                    };
                                  }
                                } else if (item.type === "Uniform No 3 Female" || item.type === "Pants No 3") {
                                  const size = sizeValue && sizeValue !== "Select Size" ? sizeValue : (formDataNo3.pantsNo3 || "");
                                  if (size && size !== "Select Size" && size.trim() !== "") {
                                    itemToSave = { 
                                      category: "Uniform No 3", 
                                      type: "Uniform No 3 Female", 
                                      size: size, 
                                      quantity: 1,
                                      status: statusValue || "Available"
                                    };
                                  }
                                } else if (item.type === "PVC Shoes") {
                                  const size = sizeValue && sizeValue !== "Select Size" ? sizeValue : (formDataNo3.pvcShoes || "");
                                  if (size && size !== "Select Size" && size.trim() !== "") {
                                    const cleanSize = size.replace(/^UK\s*/i, "");
                                    itemToSave = { 
                                      category: "Uniform No 3", 
                                      type: "PVC Shoes", 
                                      size: cleanSize, 
                                      quantity: 1,
                                      status: statusValue || "Available"
                                    };
                                  }
                                } else if (item.type === "Beret") {
                                  const size = sizeValue && sizeValue !== "Select Size" ? sizeValue : (formDataNo3.beret || "");
                                  if (size && size !== "Select Size" && size.trim() !== "") {
                                    itemToSave = { 
                                      category: "Uniform No 3", 
                                      type: "Beret", 
                                      size: size, 
                                      quantity: 1,
                                      status: statusValue || "Available"
                                    };
                                  }
                                } else {
                                  // Handle new/dynamic items from inventory (items with sizes)
                                  const size = sizeValue && sizeValue !== "Select Size" ? sizeValue : "";
                                  if (size && size.trim() !== "") {
                                    // Check if this is a shoe/boot type that needs UK prefix removal
                                    const cleanSize = (item.type.toLowerCase().includes("shoe") || item.type.toLowerCase().includes("boot")) 
                                      ? size.replace(/^UK\s*/i, "") 
                                      : size;
                                    itemToSave = { 
                                      category: "Uniform No 3", 
                                      type: item.type, 
                                      size: cleanSize, 
                                      quantity: 1,
                                      status: statusValue || "Available"
                                    };
                                  }
                                }
                              } else if (category === "Uniform No 4") {
                                const uniformNo4Size = sizeValue && sizeValue !== "Select Size" ? sizeValue : (formDataNo4.clothNo4 || formDataNo4.pantsNo4 || "");
                                // Handle hardcoded items first
                                if ((item.type === "Uniform No 4" || item.type === "Cloth No 4" || item.type === "Pants No 4")) {
                                  if (uniformNo4Size && uniformNo4Size !== "Select Size" && uniformNo4Size.trim() !== "") {
                                    itemToSave = { 
                                      category: "Uniform No 4", 
                                      type: "Uniform No 4", 
                                      size: uniformNo4Size, 
                                      quantity: 1,
                                      status: statusValue || "Available"
                                    };
                                  }
                                } else if (item.type === "Boot") {
                                  const size = sizeValue && sizeValue !== "Select Size" ? sizeValue : (formDataNo4.boot || "");
                                  if (size && size !== "Select Size" && size.trim() !== "") {
                                    const cleanSize = size.replace(/^UK\s*/i, "");
                                    itemToSave = { 
                                      category: "Uniform No 4", 
                                      type: "Boot", 
                                      size: cleanSize, 
                                      quantity: 1,
                                      status: statusValue || "Available"
                                    };
                                  }
                                } else {
                                  // Handle new/dynamic items from inventory (items with sizes)
                                  const size = sizeValue && sizeValue !== "Select Size" ? sizeValue : "";
                                  if (size && size.trim() !== "") {
                                    // Check if this is a shoe/boot type that needs UK prefix removal
                                    const cleanSize = (item.type.toLowerCase().includes("shoe") || item.type.toLowerCase().includes("boot")) 
                                      ? size.replace(/^UK\s*/i, "") 
                                      : size;
                                    itemToSave = { 
                                      category: "Uniform No 4", 
                                      type: item.type, 
                                      size: cleanSize, 
                                      quantity: 1,
                                      status: statusValue || "Available"
                                    };
                                  }
                                }
                              } else if (category === "Shirt") {
                                // Handle hardcoded items first
                                if (item.type === "Digital Shirt") {
                                  const size = sizeValue && sizeValue !== "Select Size" ? sizeValue : (formDataTShirt.digitalShirt || "");
                                  if (size && size !== "Select Size" && size.trim() !== "") {
                                    itemToSave = { 
                                      category: "Shirt", 
                                      type: "Digital Shirt", 
                                      size: size, 
                                      quantity: 1,
                                      status: statusValue || "Available"
                                    };
                                  }
                                } else if (item.type === "Company Shirt") {
                                  const size = sizeValue && sizeValue !== "Select Size" ? sizeValue : (formDataTShirt.companyShirt || "");
                                  if (size && size !== "Select Size" && size.trim() !== "") {
                                    itemToSave = { 
                                      category: "Shirt", 
                                      type: "Company Shirt", 
                                      size: size, 
                                      quantity: 1,
                                      status: statusValue || "Available"
                                    };
                                  }
                                } else if (item.type === "Inner APM Shirt") {
                                  const size = sizeValue && sizeValue !== "Select Size" ? sizeValue : (formDataTShirt.innerApmShirt || "");
                                  if (size && size !== "Select Size" && size.trim() !== "") {
                                    itemToSave = { 
                                      category: "Shirt", 
                                      type: "Inner APM Shirt", 
                                      size: size, 
                                      quantity: 1,
                                      status: statusValue || "Available"
                                    };
                                  }
                                } else {
                                  // Handle new/dynamic items from inventory
                                  const size = sizeValue && sizeValue !== "Select Size" ? sizeValue : "";
                                  if (size && size.trim() !== "") {
                                    itemToSave = { 
                                      category: "Shirt", 
                                      type: item.type, 
                                      size: size, 
                                      quantity: 1,
                                      status: statusValue || "Available"
                                    };
                                  }
                                }
                              } else if (category === "Accessories No 3") {
                                // For accessories, send status to backend (Available, Missing, or Not Available)
                                // Backend now supports all status values
                                const validStatus = ["Available", "Missing", "Not Available"].includes(statusValue) 
                                  ? statusValue 
                                  : (statusValue === "Available" ? "Available" : "Missing");
                                
                                // CRITICAL: Accessories don't have sizes, use null to match database
                                // Backend accepts null, "", or "N/A" for accessories and normalizes all to null
                                // Database stores size: null for accessories
                                const accessorySize = null;
                                
                                // Handle hardcoded items first
                                if (item.type === "Apulet") {
                                  itemToSave = { 
                                    category: "Accessories No 3", 
                                    type: "Apulet", 
                                    size: accessorySize, 
                                    quantity: 1,
                                    status: validStatus
                                  };
                                } else if (item.type === "Integrity Badge") {
                                  itemToSave = { 
                                    category: "Accessories No 3", 
                                    type: "Integrity Badge", 
                                    size: accessorySize, 
                                    quantity: 1,
                                    status: validStatus
                                  };
                                } else if (item.type === "Shoulder Badge") {
                                  itemToSave = { 
                                    category: "Accessories No 3", 
                                    type: "Shoulder Badge", 
                                    size: accessorySize, 
                                    quantity: 1,
                                    status: validStatus
                                  };
                                } else if (item.type === "Cel Bar") {
                                  itemToSave = { 
                                    category: "Accessories No 3", 
                                    type: "Cel Bar", 
                                    size: accessorySize, 
                                    quantity: 1,
                                    status: validStatus
                                  };
                                } else if (item.type === "Beret Logo Pin") {
                                  itemToSave = { 
                                    category: "Accessories No 3", 
                                    type: "Beret Logo Pin", 
                                    size: accessorySize, 
                                    quantity: 1,
                                    status: validStatus
                                  };
                                } else if (item.type === "Belt No 3") {
                                  itemToSave = { 
                                    category: "Accessories No 3", 
                                    type: "Belt No 3", 
                                    size: accessorySize, 
                                    quantity: 1,
                                    status: validStatus
                                  };
                                } else if (item.type === "Nametag") {
                                  const nametagValue = getNametagValue() || "";
                                  // Save nametag even if value is empty, as long as status is set
                                  // This allows saving "Missing" or "Not Available" status
                                  // CRITICAL: Use "Nametag No 3" type name for Accessories No 3
                                  itemToSave = { 
                                    category: "Accessories No 3", 
                                    type: "Nametag No 3", 
                                    size: accessorySize, 
                                    quantity: 1, 
                                    notes: nametagValue,
                                    status: validStatus
                                  };
                                } else {
                                  // Handle new/dynamic items from inventory (e.g., "Gutter")
                                  // For any other item type in Accessories No 3, save it dynamically
                                  itemToSave = { 
                                    category: "Accessories No 3", 
                                    type: item.type, 
                                    size: accessorySize, 
                                    quantity: 1,
                                    status: validStatus
                                  };
                                }
                              } else if (category === "Accessories No 4") {
                                // For accessories, send status to backend (Available, Missing, or Not Available)
                                // Backend now supports all status values
                                const validStatus = ["Available", "Missing", "Not Available"].includes(statusValue) 
                                  ? statusValue 
                                  : (statusValue === "Available" ? "Available" : "Missing");
                                
                                // CRITICAL: Accessories don't have sizes, use null to match database
                                // Backend accepts null, "", or "N/A" for accessories and normalizes all to null
                                // Database stores size: null for accessories
                                const accessorySize = null;
                                
                                // Handle hardcoded items first
                                if (item.type === "APM Tag") {
                                  itemToSave = { 
                                    category: "Accessories No 4", 
                                    type: "APM Tag", 
                                    size: accessorySize, 
                                    quantity: 1,
                                    status: validStatus
                                  };
                                } else if (item.type === "Belt No 4") {
                                  itemToSave = { 
                                    category: "Accessories No 4", 
                                    type: "Belt No 4", 
                                    size: accessorySize, 
                                    quantity: 1,
                                    status: validStatus
                                  };
                                } else if (item.type === "Nametag") {
                                  const nametagValue = getNametagValue() || "";
                                  // Save nametag even if value is empty, as long as status is set
                                  // This allows saving "Missing" or "Not Available" status
                                  // CRITICAL: Use "Nametag No 4" type name for Accessories No 4
                                  itemToSave = { 
                                    category: "Accessories No 4", 
                                    type: "Nametag No 4", 
                                    size: accessorySize, 
                                    quantity: 1, 
                                    notes: nametagValue,
                                    status: validStatus
                                  };
                                } else {
                                  // Handle new/dynamic items from inventory (e.g., "Gutter")
                                  // For any other item type in Accessories No 4, save it dynamically
                                  itemToSave = { 
                                    category: "Accessories No 4", 
                                    type: item.type, 
                                    size: accessorySize, 
                                    quantity: 1,
                                    status: validStatus
                                  };
                                }
                              }
                              
                              if (itemToSave) {
                                // CRITICAL: Check inventory quantity before saving
                                // EXCEPTION: Nametag is custom by name and NOT managed in inventory
                                // Nametag should NOT be affected by inventory quantity checks
                                const isNametag = itemToSave.type?.toLowerCase().includes("nametag") || 
                                                  itemToSave.type?.toLowerCase().includes("name tag");
                                
                                // Skip inventory check for Nametag - it's custom by name, not stock-managed
                                let inventoryQty: number | null = null; // null means not checked (for nametag)
                                
                                if (!isNametag) {
                                  // Only check inventory for items with sizes (main items), not accessories
                                  // Accessories don't have sizes, so we check by category + type only
                                  const itemSize = itemToSave.size || null;
                                  inventoryQty = 0;
                                  
                                  // For items with sizes, check specific size quantity
                                  // For accessories (no size), check if any quantity exists for that type
                                  if (itemSize) {
                                    inventoryQty = getInventoryQuantity(
                                      itemToSave.category,
                                      itemToSave.type,
                                      itemSize
                                    );
                                  } else {
                                    // For accessories, check if any size variant exists with quantity > 0
                                    const accessoryItems = inventoryItems.filter(inv => 
                                      inv.category?.toLowerCase() === itemToSave.category.toLowerCase() &&
                                      inv.type?.toLowerCase() === itemToSave.type.toLowerCase() &&
                                      inv.size === null
                                    );
                                    inventoryQty = accessoryItems.length > 0 
                                      ? Math.max(...accessoryItems.map(inv => inv.quantity || 0))
                                      : 0;
                                  }
                                  
                                  // If quantity is 0, show popup and set status to "Not Available"
                                  if (inventoryQty === 0) {
                                    await Swal.fire({
                                      icon: "warning",
                                      title: "Item Not Available",
                                      html: `
                                        <p>The item <strong>${item.name}</strong>${itemSize ? ` (Size: ${itemSize})` : ''} is currently not available in inventory.</p>
                                        <p>Please contact the Logistics Coordinator for assistance.</p>
                                        <p><strong>Email:</strong> korsispa@upm.edu.my</p>
                                      `,
                                      confirmButtonText: "OK, Set Status to 'Not Available'",
                                      confirmButtonColor: "#1d4ed8",
                                    });
                                    
                                    // Set status to "Not Available" but still allow saving
                                    itemToSave.status = "Not Available";
                                    
                                    // Update itemStatus state to reflect "Not Available"
                                    const statusKey = `${item.category}-${item.type}`;
                                    setItemStatus(prev => ({ ...prev, [statusKey]: "Not Available" }));
                                  }
                                }
                                // Note: Nametag bypasses inventory check - it's custom by name, not stock-managed
                                
                                // Check if item already exists
                                const hasExisting = !!(category === "Uniform No 3" && uniformNo3) ||
                                                  !!(category === "Uniform No 4" && uniformNo4) ||
                                                  !!(category === "Shirt" && tShirt) ||
                                                  !!(category === "Accessories No 3" && uniformNo3) ||
                                                  !!(category === "Accessories No 4" && uniformNo4);
                                
                                console.log("Saving item:", itemToSave);
                                console.log("Has existing uniform:", hasExisting);
                                console.log("Inventory quantity:", inventoryQty !== null ? inventoryQty : "N/A (Nametag - not checked)");
                                const success = await handleSubmitUniform([itemToSave], category, hasExisting, category);
                                if (success) {
                                  console.log("Save successful, refreshing data...");
                                  // Refresh the data after successful save
                                  await fetchUniform();
                                  console.log("Data refreshed");
                                } else {
                                  console.error("Save failed");
                                }
                              } else {
                                console.warn("No item to save - missing size or status");
                                Swal.fire({
                                  icon: "warning",
                                  title: "No Data to Save",
                                  text: `Please select a size or set status to "Available" for ${item.name}.`,
                                  confirmButtonColor: "#1d4ed8",
                                });
                              }
                            }}
                            className="px-3 py-1.5 bg-blue-700 text-white text-xs font-medium rounded hover:bg-blue-800 transition"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Content */}
                    <div className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Picture */}
                        <div className="flex-shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-20 h-20 object-contain rounded bg-white border border-gray-200"
                          />
                </div>
                        {/* Size Dropdown */}
                        {!isAccessory && (
                          <div className="flex-1 min-w-[120px] max-w-[150px]">
                            <label className="block text-xs text-gray-600 mb-1">Size</label>
                            <select
                              value={currentValue || ""}
                              onChange={(e) => {
                                const selectedValue = e.target.value;
                                handleSizeChange(selectedValue);
                              }}
                              className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select Size</option>
                              {getSizeOptions().map((size) => (
                                <option key={size} value={size}>
                                  {item.type.includes("Shoe") || item.type === "PVC Shoes" || item.type === "Boot"
                                    ? `UK ${size}`
                                    : size}
                                </option>
                              ))}
                            </select>
              </div>
            )}
                        {/* Name Input for Nametag */}
                        {isNametag && (
                          <div className="flex-1 min-w-[200px] max-w-[250px]">
                            <label className="block text-xs text-gray-600 mb-1">Name</label>
                            <input
                              type="text"
                              value={getNametagValue()}
                              onChange={(e) => handleNametagChange(e.target.value)}
                              placeholder="Enter name for nametag"
                              className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
          </div>
                        )}
                        {/* Status Dropdown */}
                        <div className={!isAccessory ? "flex-1 min-w-[100px] max-w-[130px]" : "flex-1 min-w-[150px] max-w-[200px]"}>
                          <label className="block text-xs text-gray-600 mb-1">Status</label>
                          {(() => {
                            const currentStatus = getCurrentStatus();
                            const selectValue = currentStatus || "";
                            const missingKey = getMissingKey(item.category, item.type, item.size ?? "N/A");
                            const missingCount = itemMissingCount[missingKey];
                            // Backend fix: missingCount defaults to 0, which is valid but we don't display it
                            // Only show count when > 0 (after backend has incremented it)
                            // When missingCount is 0, backend will increment it when status changes to "Missing"
                            const displayMissing =
                              currentStatus === "Missing" &&
                              missingCount !== undefined &&
                              missingCount !== null &&
                              missingCount > 0
                                ? `Missing (${missingCount})`
                                : "Missing";

                            return (
                              <select
                                value={selectValue}
                                onChange={(e) => {
                                  handleStatusChange(e.target.value);
                                  // If status is set to "Not Available" or "Missing" for nametag, clear the name
                                  if (isNametag && (e.target.value === "Not Available" || e.target.value === "Missing")) {
                                    handleNametagChange("");
                                  }
                                }}
                                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                {/* Placeholder shown when no status has been chosen yet */}
                                <option value="">Select Status</option>
                                <option value="Missing">{displayMissing}</option>
                                <option value="Available">Available</option>
                                <option value="Not Available">Not Available</option>
                              </select>
                            );
                          })()}
                        </div>
                        {/* Price Display (only for shirts) */}
                        {item.category === "Shirt" && (
                          <div className="flex-1 min-w-[100px] max-w-[150px]">
                            <label className="block text-xs text-gray-600 mb-1">Price</label>
                            <div className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-gray-50">
                              {item.price !== undefined && item.price !== null ? (
                                <span className="text-gray-900 font-medium">RM {item.price.toFixed(2)}</span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="text-amber-600 italic">Not set</span>
                                  <span title="Price not available. Admin needs to set price in inventory.">
                                    <svg 
                                      className="w-4 h-4 text-amber-500" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {!selectedCategory && !searchTerm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-800">
            Please select a category above or search for items to view your uniform items.
          </p>
        </div>
      )}

      {(selectedCategory || searchTerm) && displayedItems.length === 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
          <p className="text-center text-gray-500 py-8">
            No items found. {searchTerm && "Try a different search term."}
          </p>
        </div>
      )}

      {/* Size Chart Modal */}
      {sizeChartModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-2xl font-bold text-gray-900">Size Chart - {sizeChartModal.itemName}</h2>
              <button
                onClick={() => setSizeChartModal({ isOpen: false, itemName: "", sizeChartUrl: "" })}
                className="text-gray-400 hover:text-gray-600 transition text-3xl font-bold leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center min-h-0">
              {sizeChartModal.sizeChartUrl ? (
                <img
                  src={sizeChartModal.sizeChartUrl}
                  alt={`Size chart for ${sizeChartModal.itemName}`}
                  className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg border border-gray-200"
                  style={{ maxHeight: 'calc(95vh - 180px)' }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    console.error("Failed to load size chart image:", sizeChartModal.sizeChartUrl);
                    target.style.display = 'none';
                    // Show error message
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'text-red-500 text-center p-4';
                    errorDiv.textContent = 'Size chart image not found. Please contact the logistics coordinator.';
                    target.parentElement?.appendChild(errorDiv);
                  }}
                />
              ) : (
                <div className="text-center p-8 text-gray-500">
                  <p>Size chart not available for this item.</p>
                  <p className="text-sm mt-2">Please contact the logistics coordinator.</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 text-center flex-shrink-0">
              <button
                onClick={() => setSizeChartModal({ isOpen: false, itemName: "", sizeChartUrl: "" })}
                className="px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uniform No 3 Modal */}
      {showUniformNo3Modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Uniform No 3</h2>
            <form onSubmit={handleSubmitUniformNo3}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Uniform No 3 Male</label>
                  <select
                    value={formDataNo3.clothNo3}
                    onChange={(e) => setFormDataNo3({ ...formDataNo3, clothNo3: e.target.value })}
                    className="w-full border rounded-md p-2"
                  >
                    <option value="">Select Size</option>
                    {clothSizes.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Uniform No 3 Female</label>
                  <select
                    value={formDataNo3.pantsNo3}
                    onChange={(e) => setFormDataNo3({ ...formDataNo3, pantsNo3: e.target.value })}
                    className="w-full border rounded-md p-2"
                  >
                    <option value="">Select Size</option>
                    {clothSizes.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PVC Shoes</label>
                  <select
                    value={formDataNo3.pvcShoes}
                    onChange={(e) => setFormDataNo3({ ...formDataNo3, pvcShoes: e.target.value })}
                    className="w-full border rounded-md p-2"
                  >
                    <option value="">Select Size (UK)</option>
                    {shoeSizes.map((size) => (
                      <option key={size} value={size}>UK {size}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Beret</label>
                  <select
                    value={formDataNo3.beret}
                    onChange={(e) => setFormDataNo3({ ...formDataNo3, beret: e.target.value })}
                    className="w-full border rounded-md p-2"
                  >
                    <option value="">Select Size</option>
                    {beretSizes.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nametag</label>
                  <input
                    type="text"
                    value={formDataNo3.nametag}
                    onChange={(e) => setFormDataNo3({ ...formDataNo3, nametag: e.target.value })}
                    placeholder="Enter name for nametag"
                    className="w-full border rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Accessories</label>
                  <div className="space-y-2">
                    {["apulet", "integrityBadge", "shoulderBadge", "celBar", "beretLogoPin", "beltNo3"].map((key) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formDataNo3.accessories[key as keyof typeof formDataNo3.accessories]}
                          onChange={(e) =>
                            setFormDataNo3({
                              ...formDataNo3,
                              accessories: {
                                ...formDataNo3.accessories,
                                [key]: e.target.checked,
                              },
                            })
                          }
                          className="mr-2 w-4 h-4"
                        />
                        <span className="text-gray-700">
                          {key === "apulet" ? "Apulet" :
                           key === "integrityBadge" ? "Integrity Badge" :
                           key === "shoulderBadge" ? "Shoulder Badge" :
                           key === "celBar" ? "Cel Bar" :
                           key === "beretLogoPin" ? "Beret Logo Pin" :
                           "Belt No 3 (Boys Only)"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUniformNo3Modal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800"
                >
                  {uniformNo3 ? "Update" : "Add"} Uniform No 3
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Uniform No 4 Modal */}
      {showUniformNo4Modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Uniform No 4</h2>
            <form onSubmit={handleSubmitUniformNo4}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Uniform No 4 (Cloth & Pants)</label>
                  <select
                    value={formDataNo4.clothNo4 || formDataNo4.pantsNo4 || ""}
                    onChange={(e) => {
                      const size = e.target.value;
                      // Set both to the same value since they come as a pair
                      setFormDataNo4({ ...formDataNo4, clothNo4: size, pantsNo4: size });
                    }}
                    className="w-full border rounded-md p-2"
                  >
                    <option value="">Select Size</option>
                    {clothSizes.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Note: Cloth and Pants come as a pair with the same size</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Boot</label>
                  <select
                    value={formDataNo4.boot}
                    onChange={(e) => setFormDataNo4({ ...formDataNo4, boot: e.target.value })}
                    className="w-full border rounded-md p-2"
                  >
                    <option value="">Select Size (UK)</option>
                    {bootSizes.map((size) => (
                      <option key={size} value={size}>UK {size}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nametag</label>
                  <input
                    type="text"
                    value={formDataNo4.nametag}
                    onChange={(e) => setFormDataNo4({ ...formDataNo4, nametag: e.target.value })}
                    placeholder="Enter name for nametag"
                    className="w-full border rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Accessories</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formDataNo4.accessories.apmTag}
                        onChange={(e) =>
                          setFormDataNo4({
                            ...formDataNo4,
                            accessories: { ...formDataNo4.accessories, apmTag: e.target.checked },
                          })
                        }
                        className="mr-2 w-4 h-4"
                      />
                      <span className="text-gray-700">APM Tag</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formDataNo4.accessories.beltNo4}
                        onChange={(e) =>
                          setFormDataNo4({
                            ...formDataNo4,
                            accessories: { ...formDataNo4.accessories, beltNo4: e.target.checked },
                          })
                        }
                        className="mr-2 w-4 h-4"
                      />
                      <span className="text-gray-700">Belt No 4</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUniformNo4Modal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800"
                >
                  {uniformNo4 ? "Update" : "Add"} Uniform No 4
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* T-Shirt Modal */}
      {showTShirtModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">T-Shirt</h2>
            <form onSubmit={handleSubmitTShirt}>
              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0">
                    <img 
                      src="/digital.png" 
                      alt="Digital Shirt" 
                      className="w-32 h-32 object-cover rounded-lg border"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Digital Shirt</label>
                    <select
                      value={formDataTShirt.digitalShirt}
                      onChange={(e) => setFormDataTShirt({ ...formDataTShirt, digitalShirt: e.target.value })}
                      className="w-full border rounded-md p-2"
                    >
                      <option value="">Select Size</option>
                      {clothSizes.map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0">
                    <img 
                      src="/innerapm.png" 
                      alt="Inner APM Shirt" 
                      className="w-32 h-32 object-cover rounded-lg border"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Inner APM Shirt</label>
                    <select
                      value={formDataTShirt.innerApmShirt}
                      onChange={(e) => setFormDataTShirt({ ...formDataTShirt, innerApmShirt: e.target.value })}
                      className="w-full border rounded-md p-2"
                    >
                      <option value="">Select Size</option>
                      {clothSizes.map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0">
                    <img 
                      src="/company.png" 
                      alt="Company Shirt" 
                      className="w-32 h-32 object-cover rounded-lg border"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Shirt</label>
                    <select
                      value={formDataTShirt.companyShirt}
                      onChange={(e) => setFormDataTShirt({ ...formDataTShirt, companyShirt: e.target.value })}
                      className="w-full border rounded-md p-2"
                    >
                      <option value="">Select Size</option>
                      {clothSizes.map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTShirtModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800"
                >
                  {tShirt ? "Update" : "Add"} T-Shirt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
