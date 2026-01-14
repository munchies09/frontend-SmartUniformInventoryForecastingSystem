"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import { PencilIcon, PlusIcon, MinusIcon, MagnifyingGlassIcon, XMarkIcon, TrashIcon, ChartBarIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

interface InventoryItem {
  id: string;
  category: string;
  type: string;
  size: string | null;
  quantity: number;
}

interface SizeQuantity {
  size: string;
  quantity: number;
  id?: string;
}

// Predefined uniform types (base types that always exist)
const predefinedUniformTypes = [
  // Uniform No 3
  { category: "Uniform No 3", type: "Uniform No 3 Male", sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"], image: "/no3.png" },
  { category: "Uniform No 3", type: "Uniform No 3 Female", sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"], image: "/no3.png" },
  { category: "Uniform No 3", type: "PVC Shoes", sizes: ["4", "5", "6", "7", "8", "9", "10", "11", "12"], image: "/pvcshoes.png" },
  { category: "Uniform No 3", type: "Beret", sizes: ["6 1/2", "6 5/8", "6 3/4", "6 7/8", "7", "7 1/8", "7 1/4", "7 3/8", "7 1/2", "7 5/8", "7 3/4", "7 7/8", "8", "8 1/8", "8 1/4", "8 3/8"], image: "/beret.jpg" },
  // Uniform No 4
  { category: "Uniform No 4", type: "Uniform No 4", sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"], image: "/no4.png" }, // Merged: replaces "Cloth No 4" and "Pants No 4"
  { category: "Uniform No 4", type: "Boot", sizes: ["2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"], image: "/boot.jpg" },
  // Accessories No 3 (no sizes) - Note: These should be in "Accessories No 3" category for consistency
  { category: "Accessories No 3", type: "Apulet", sizes: [], image: "/apulet.jpg" },
  { category: "Accessories No 3", type: "Integrity Badge", sizes: [], image: "/integritybadge.jpg" },
  { category: "Accessories No 3", type: "Shoulder Badge", sizes: [], image: "/shoulderbadge.png" },
  { category: "Accessories No 3", type: "Cel Bar", sizes: [], image: "/celbar.jpg" },
  { category: "Accessories No 3", type: "Beret Logo Pin", sizes: [], image: "/beretlogopin.jpg" },
  { category: "Accessories No 3", type: "Belt No 3", sizes: [], image: "/beltno3.jpg" },
  // NOTE: Nametag is NOT in inventory - it's custom by name, managed only in member uniform data
  // Accessories No 4 (no sizes) - Note: These should be in "Accessories No 4" category for consistency
  { category: "Accessories No 4", type: "APM Tag", sizes: [], image: "/apmtag.jpg" },
  { category: "Accessories No 4", type: "Belt No 4", sizes: [], image: "/beltno4.png" },
  // NOTE: Nametag is NOT in inventory - it's custom by name, managed only in member uniform data
  // Shirt category (renamed from T-Shirt for consistency)
  { category: "Shirt", type: "Digital Shirt", sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"], image: "/digital.png" },
  { category: "Shirt", type: "Company Shirt", sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"], image: "/company.png" },
  { category: "Shirt", type: "Inner APM Shirt", sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"], image: "/innerapm.png" },
];

interface UniformType {
  category: string;
  type: string;
  sizes: string[];
  image: string;
  sizeChart?: string;
}

export default function UniformInventoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get("category") || "";
  
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [uniformTypes, setUniformTypes] = useState<UniformType[]>(predefinedUniformTypes);
  const [selectedType, setSelectedType] = useState<string>("");
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingQuantities, setEditingQuantities] = useState<Record<string, number>>({});
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [newItem, setNewItem] = useState({
    category: "Uniform No 3",
    type: "",
    sizes: [] as string[],
    hasSizes: true,
    image: "",
    imageFile: null as File | null,
  });
  const [shirtPrices, setShirtPrices] = useState<{
    digitalShirt: number | null;
    companyShirt: number | null;
    innerApmShirt: number | null;
  }>({
    digitalShirt: null,
    companyShirt: null,
    innerApmShirt: null,
  });
  const [editingPrice, setEditingPrice] = useState<{
    type: string;
    price: number | null;
  } | null>(null);
  const [showAddSizeForm, setShowAddSizeForm] = useState(false);
  const [newSize, setNewSize] = useState({
    size: "",
    quantity: 0,
  });
  // Track deleted sizes so they don't reappear (only for sizes that had an ID and were deleted)
  const [deletedSizes, setDeletedSizes] = useState<Set<string>>(new Set());
  
  // Size chart functionality
  const [sizeCharts, setSizeCharts] = useState<Record<string, string>>({});
  const [sizeChartModal, setSizeChartModal] = useState<{ isOpen: boolean; itemName: string; sizeChartUrl: string }>({
    isOpen: false,
    itemName: "",
    sizeChartUrl: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingSizeChart, setUploadingSizeChart] = useState(false);

  useEffect(() => {
    fetchInventory();
    fetchSizeCharts();
    // Load shirt prices from localStorage
    const savedPrices = localStorage.getItem("shirtPrices");
    if (savedPrices) {
      try {
        setShirtPrices(JSON.parse(savedPrices));
      } catch (error) {
        console.error("Error loading shirt prices:", error);
      }
    }
  }, []);

  // Fetch size charts from inventory API
  const fetchSizeCharts = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch('http://localhost:5000/api/inventory', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.inventory) {
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
      }
    } catch (error) {
      console.error("Error fetching size charts:", error);
      // Silently fail - size charts are optional
    }
  };

  // Helper function to get size chart URL for an item
  const getSizeChartUrl = (category: string, type: string): string | undefined => {
    const key = `${category}-${type}`;
    return sizeCharts[key];
  };

  // Helper function to get image path for an item type (same as user uniform page)
  // Maps item types to their corresponding image files in public folder
  const getItemImagePath = (itemType: string): string => {
    const typeLower = itemType.toLowerCase().trim();
    
    // Map item types to image filenames (matching files in public folder)
    const imageMap: Record<string, string> = {
      // Uniform No 3 items
      "uniform no 3 male": "/no3.png",
      "uniform no 3 female": "/no3.png",
      "pvc shoes": "/pvcshoes.png",
      "pvcshoes": "/pvcshoes.png",
      "beret": "/beret.jpg",
      "beret logo pin": "/beretlogopin.jpg",
      "beretlogopin": "/beretlogopin.jpg",
      
      // Uniform No 4 items
      "uniform no 4": "/no4.png",
      "boot": "/boot.jpg",
      
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
      "apm tag": "/apmtag.jpg",
      "apmtag": "/apmtag.jpg",
      
      // Shirt items
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
    
    // Default fallback
    return "";
  };

  // Helper function to normalize category names
  const normalizeCategoryName = (category: string): string => {
    const categoryLower = category?.toLowerCase().trim() || "";
    
    // Normalize Shirt category variations (changed from T-Shirt to Shirt)
    if (categoryLower === "t-shirt" || categoryLower === "tshirt" || categoryLower === "t shirt" || categoryLower === "shirt") {
      return "Shirt";
    }
    
    // Normalize Uniform No 3 variations
    if (categoryLower === "uniform no 3" || categoryLower === "uniform no. 3" || categoryLower === "no 3") {
      return "Uniform No 3";
    }
    
    // Normalize Uniform No 4 variations
    if (categoryLower === "uniform no 4" || categoryLower === "uniform no. 4" || categoryLower === "no 4") {
      return "Uniform No 4";
    }
    
    // Return original if no normalization needed
    return category?.trim() || "";
  };

  // Helper function to determine the correct category for an item based on its type
  // This ensures accessories are properly categorized (matching user uniform structure)
  const getCorrectCategory = (itemType: string, currentCategory: string): string => {
    const typeLower = itemType?.toLowerCase().trim() || "";
    const categoryLower = currentCategory?.toLowerCase().trim() || "";
    
    // Accessories No 3 items - check "beret logo pin" first to avoid confusion with "beret"
    if (typeLower.includes("beret logo pin")) {
      return "Accessories No 3";
    }
    if (typeLower.includes("apulet") || typeLower.includes("integrity badge") || 
        typeLower.includes("shoulder badge") || typeLower.includes("cel bar") ||
        typeLower.includes("belt no 3")) {
      return "Accessories No 3";
    }
    
    // Nametag - check if it's for No 3 or No 4
    if (typeLower.includes("nametag")) {
      if (categoryLower.includes("uniform no 3")) {
        return "Accessories No 3";
      } else if (categoryLower.includes("uniform no 4")) {
        return "Accessories No 4";
      }
      // Default to Accessories No 3 if category unclear
      return "Accessories No 3";
    }
    
    // Accessories No 4 items
    if (typeLower.includes("apm tag") || typeLower.includes("belt no 4")) {
      return "Accessories No 4";
    }
    
    // Uniform No 3 items (only main items with sizes, not accessories)
    // Check exact "beret" match first to avoid confusion with "beret logo pin"
    if (typeLower === "beret" || typeLower === "pvc shoes" ||
        typeLower.includes("uniform no 3 male") || typeLower.includes("uniform no 3 female") ||
        typeLower.includes("cloth no 3") || typeLower.includes("pants no 3")) {
      return "Uniform No 3";
    }
    
    // Uniform No 4 items (only main items with sizes, not accessories)
    if (typeLower === "boot" || typeLower === "uniform no 4" ||
        typeLower.includes("uniform no 4") || typeLower.includes("cloth no 4") ||
        typeLower.includes("pants no 4")) {
      return "Uniform No 4";
    }
    
    // Shirt items
    if (typeLower.includes("digital shirt") || typeLower.includes("company shirt") ||
        typeLower.includes("inner apm shirt") || categoryLower.includes("t-shirt") ||
        categoryLower.includes("tshirt") || categoryLower.includes("shirt")) {
      return "Shirt";
    }
    
    // If no match, try to use normalized category
    return normalizeCategoryName(currentCategory);
  };

  // Helper function to normalize type names (map variations to predefined types)
  const normalizeTypeName = (category: string, type: string): string => {
    const categoryLower = category?.toLowerCase().trim() || "";
    const typeLower = type?.toLowerCase().trim() || "";
    
    // For Shirt category, normalize common variations
    if (categoryLower === "t-shirt" || categoryLower === "tshirt" || categoryLower === "t shirt" || categoryLower === "shirt") {
      // Map variations to predefined type names
      if (typeLower === "digital" || typeLower === "digital shirt") {
        return "Digital Shirt";
      }
      if (typeLower === "company" || typeLower === "company shirt") {
        return "Company Shirt";
      }
      if (typeLower === "inner apm" || typeLower === "inner apm shirt" || typeLower === "innerapm" || typeLower === "innerapm shirt" || typeLower === "inner apm shirt") {
        return "Inner APM Shirt";
      }
    }
    
    // Return original type if no normalization needed
    return type?.trim() || "";
  };

  // Initialize editing quantities when type is selected or inventory changes
  useEffect(() => {
    if (selectedType && inventory.length >= 0) {
      const sizeQuantities = getSizeQuantities();
      const initialQuantities: Record<string, number> = {};
      sizeQuantities.forEach(sq => {
        initialQuantities[sq.size] = sq.quantity;
      });
      setEditingQuantities(initialQuantities);
    }
  }, [selectedType, inventory]);

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/inventory", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      if (data.success) {
        setInventory(data.inventory || []);
        
        // Update size charts from inventory data
        const chartMap: Record<string, string> = {};
        // Build dynamic uniform types from inventory (for custom items)
        const inventoryItems = data.inventory || [];
        const typeMap = new Map<string, UniformType>();
        
        // Add predefined types first
        predefinedUniformTypes.forEach(type => {
          const key = `${type.category}-${type.type}`;
          typeMap.set(key, { ...type });
        });
        
        // Extract custom types from inventory data
        // First, collect all unique category-type combinations
        const uniqueTypes = new Map<string, { category: string; type: string; sizes: Set<string>; image?: string; sizeChart?: string }>();
        
        inventoryItems.forEach((item: any) => {
          // Skip "Gold Badge" - it should not appear in the UI
          if (item.type && item.type.toLowerCase() === "gold badge") {
            return;
          }
          
          // Skip "Nametag" - it's custom by name, not managed in inventory
          // Nametag should only appear in member uniform data, not inventory
          const itemTypeLower = (item.type || "").toLowerCase();
          if (itemTypeLower.includes("nametag") || itemTypeLower.includes("name tag")) {
            return;
          }
          
          // First normalize the category and type names
          let normalizedCategory = normalizeCategoryName(item.category || "");
          let normalizedType = normalizeTypeName(normalizedCategory, item.type || "");
          
          // Skip if category or type is empty after normalization
          if (!normalizedCategory || !normalizedType) {
            return;
          }
          
          // Also skip if normalized type is "Gold Badge" or "Nametag"
          const normalizedTypeLower = normalizedType.toLowerCase();
          if (normalizedTypeLower === "gold badge" || normalizedTypeLower.includes("nametag") || normalizedTypeLower.includes("name tag")) {
            return;
          }
          
          // Re-categorize items to match user uniform structure (accessories should not be in Uniform No 3/No 4)
          const correctCategory = getCorrectCategory(normalizedType, normalizedCategory);
          normalizedCategory = correctCategory;
          
          // Update size charts (use normalized names)
          if (item.sizeChart) {
            const chartKey = `${normalizedCategory}-${normalizedType}`;
            if (!chartMap[chartKey]) {
              chartMap[chartKey] = item.sizeChart;
            }
          }
          
          // Build unique types map using normalized names (this prevents duplicates)
          const typeKey = `${normalizedCategory}-${normalizedType}`;
          if (!uniqueTypes.has(typeKey)) {
            uniqueTypes.set(typeKey, {
              category: normalizedCategory,
              type: normalizedType,
              sizes: new Set<string>(),
              image: item.image,
              sizeChart: item.sizeChart,
            });
          }
          
          // Add size if it exists (merge sizes for same type)
          if (item.size && item.size !== "N/A") {
            uniqueTypes.get(typeKey)!.sizes.add(item.size);
          }
        });
        
        // Process unique types and add to typeMap
        uniqueTypes.forEach((typeData, typeKey) => {
          if (!typeMap.has(typeKey)) {
            // This is a custom type not in predefined list
            const sizes = Array.from(typeData.sizes).sort();
            // Use inventory image if available, otherwise use local image path
            const inventoryImage = typeData.image && typeData.image.trim() !== "" && !typeData.image.includes("placeholder")
              ? typeData.image
              : null;
            const localImagePath = getItemImagePath(typeData.type);
            const finalImage = inventoryImage || localImagePath || "/placeholder.png";
            
            typeMap.set(typeKey, {
              category: typeData.category,
              type: typeData.type,
              sizes: sizes,
              image: finalImage,
              sizeChart: typeData.sizeChart,
            });
          } else {
            // Update sizes for predefined types from inventory (merge sizes)
            const existingType = typeMap.get(typeKey)!;
            typeData.sizes.forEach(size => {
              if (!existingType.sizes.includes(size)) {
                existingType.sizes.push(size);
              }
            });
            existingType.sizes.sort();
            
            // Update image if inventory has one (prefer inventory image for predefined types)
            // If no inventory image, keep the predefined local image path
            if (typeData.image && typeData.image.trim() !== "" && !typeData.image.includes("placeholder")) {
              existingType.image = typeData.image;
            } else if (!existingType.image || existingType.image.includes("placeholder")) {
              // Fallback to local image path if no inventory image
              const localImagePath = getItemImagePath(existingType.type);
              if (localImagePath) {
                existingType.image = localImagePath;
              }
            }
            // Update size chart if inventory has one
            if (typeData.sizeChart) {
              existingType.sizeChart = typeData.sizeChart;
            }
          }
        });
        
        // Convert map to array and update state
        setUniformTypes(Array.from(typeMap.values()));
        setSizeCharts(chartMap);
        
        // Optional: Use count field if available
        if (data.count !== undefined) {
          console.log(`Total inventory items: ${data.count}`);
        }
      } else {
        console.error("Failed to fetch inventory:", data.message || "Unknown error");
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message || "Failed to fetch inventory",
          confirmButtonColor: "#1d4ed8",
        });
      }
    } catch (error: any) {
      console.error("Error fetching inventory:", error);
      Swal.fire({
        icon: "error",
        title: "Network Error",
        text: error.message || "Failed to connect to server. Please check your connection.",
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSelectedTypeInfo = () => {
    return uniformTypes.find(t => `${t.category}-${t.type}` === selectedType);
  };

  const getSizeQuantities = (): SizeQuantity[] => {
    if (!selectedType) return [];
    
    const typeInfo = getSelectedTypeInfo();
    if (!typeInfo) return [];

    // If no sizes (accessories), return single row with N/A
    if (typeInfo.sizes.length === 0) {
      const item = inventory.find(
        inv => inv.category === typeInfo.category && 
        inv.type === typeInfo.type && 
        inv.size === null
      );
      return [{
        size: "N/A",
        quantity: item?.quantity || 0,
        id: item?.id
      }];
    }

    // Get all inventory items for this category and type
    const inventoryItems = inventory.filter(inv => 
      inv.category === typeInfo.category && inv.type === typeInfo.type
    );

    // Create a map of all sizes (from predefined list + database)
    const sizeMap = new Map<string, SizeQuantity>();
    
    // Create a key to identify deleted sizes for this item type
    const deletedKey = `${typeInfo.category}-${typeInfo.type}`;

    // First, add all predefined sizes (always show them, even if quantity is 0)
    // BUT: Don't show if they were explicitly deleted by admin (had an ID and were deleted)
    typeInfo.sizes.forEach(size => {
      // Check if this size was deleted
      const sizeKey = `${deletedKey}-${size}`;
      if (deletedSizes.has(sizeKey)) {
        // This size was deleted by admin, don't show it
        return;
      }
      
      // For shoes/boots, backend might store with or without "UK" prefix
      // Try both formats when searching
      const item = inventoryItems.find(inv => {
        if (typeInfo.type === "PVC Shoes" || typeInfo.type === "Boot") {
          return inv.size === size || inv.size === `UK ${size}` || inv.size === size.replace("UK ", "");
        }
        return inv.size === size;
      });
      
      sizeMap.set(size, {
        size,
        quantity: item?.quantity || 0,
        id: item?.id  // Will be undefined if not in database (quantity 0, not saved)
      });
    });

    // Then, add any sizes from database that aren't in the predefined list
    // These are sizes added via "Add Size" button
    inventoryItems.forEach(inv => {
      if (inv.size === null) return; // Skip accessories (N/A)
      
      // For shoes/boots, normalize the size (remove UK prefix for comparison)
      let normalizedSize = inv.size;
      if (typeInfo.type === "PVC Shoes" || typeInfo.type === "Boot") {
        normalizedSize = inv.size.replace(/^UK\s+/i, "");
      }
      
      // Check if this size is already in the map (from predefined list)
      const exists = Array.from(sizeMap.keys()).some(existingSize => {
        if (typeInfo.type === "PVC Shoes" || typeInfo.type === "Boot") {
          const normalizedExisting = existingSize.replace(/^UK\s+/i, "");
          return normalizedExisting === normalizedSize;
        }
        return existingSize === normalizedSize;
      });
      
      // Check if this size was deleted
      const sizeKey = `${deletedKey}-${normalizedSize}`;
      if (deletedSizes.has(sizeKey)) {
        // This size was deleted by admin, don't show it
        return;
      }
      
      // If not in predefined list, add it (these are newly added sizes)
      if (!exists && inv.id) {
        sizeMap.set(normalizedSize, {
          size: normalizedSize,
          quantity: inv.quantity || 0,
          id: inv.id
        });
      }
    });

    // Convert map to array and sort
    const result = Array.from(sizeMap.values());
    
    // Helper function to get numeric value for clothing sizes
    const getSizeOrder = (size: string): number => {
      const sizeUpper = size.toUpperCase();
      if (sizeUpper === "XS" || sizeUpper === "X-S") return 1;
      if (sizeUpper === "S") return 2;
      if (sizeUpper === "M") return 3;
      if (sizeUpper === "L") return 4;
      if (sizeUpper === "XL" || sizeUpper === "X-L") return 5;
      if (sizeUpper === "2XL" || sizeUpper === "XXL" || sizeUpper === "2X-L" || sizeUpper === "XX-L") return 6;
      if (sizeUpper === "3XL" || sizeUpper === "XXXL" || sizeUpper === "3X-L" || sizeUpper === "XXX-L") return 7;
      if (sizeUpper === "4XL" || sizeUpper === "XXXXL" || sizeUpper === "4X-L") return 8;
      if (sizeUpper === "5XL" || sizeUpper === "XXXXXL" || sizeUpper === "5X-L") return 9;
      // For beret sizes (e.g., "6 1/2", "7", etc.), try to parse as number
      const beretMatch = size.match(/^(\d+)(?:\s+(\d+)\/(\d+))?$/);
      if (beretMatch) {
        const whole = parseInt(beretMatch[1]) || 0;
        const numerator = parseInt(beretMatch[2]) || 0;
        const denominator = parseInt(beretMatch[3]) || 1;
        return 100 + whole + (numerator / denominator);
      }
      // For numeric sizes (UK shoe sizes, etc.)
      const numMatch = size.match(/^(\d+)/);
      if (numMatch) {
        return 1000 + parseInt(numMatch[1]);
      }
      // Default: alphabetical order for unknown sizes
      return 10000;
    };
    
    // Sort sizes appropriately
    if (typeInfo.type === "PVC Shoes" || typeInfo.type === "Boot") {
      // Sort numerically for shoes/boots
      result.sort((a, b) => {
        const numA = parseInt(a.size) || 0;
        const numB = parseInt(b.size) || 0;
        return numA - numB;
      });
    } else if (typeInfo.type === "Beret") {
      // Sort beret sizes numerically (e.g., "6 1/2", "6 5/8", "7", etc.)
      result.sort((a, b) => {
        return getSizeOrder(a.size) - getSizeOrder(b.size);
      });
    } else {
      // Sort clothing sizes: XS, S, M, L, XL, 2XL, 3XL, etc.
      // Always use size order function to ensure consistent sorting
      result.sort((a, b) => {
        const orderA = getSizeOrder(a.size);
        const orderB = getSizeOrder(b.size);
        
        // If both have valid size order values (clothing sizes), use that
        if (orderA < 10000 && orderB < 10000) {
          return orderA - orderB;
        }
        
        // If one is a clothing size and the other isn't, prioritize clothing size
        if (orderA < 10000) return -1;
        if (orderB < 10000) return 1;
        
        // For non-clothing sizes (like custom sizes), try predefined order first
        const predefinedOrder = typeInfo.sizes;
        const indexA = predefinedOrder.indexOf(a.size);
        const indexB = predefinedOrder.indexOf(b.size);
        
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        
        // Otherwise, fall back to alphabetical
        return a.size.localeCompare(b.size);
      });
    }
    
    return result;
  };

  const handleEditClick = (size: string) => {
    const sizeQuantities = getSizeQuantities();
    const sizeQty = sizeQuantities.find(sq => sq.size === size);
    if (sizeQty) {
      setEditingRow(size);
      setEditQuantity(sizeQty.quantity);
    }
  };

  const handleQuantityChangeForSize = (size: string, delta: number) => {
    setEditingQuantities(prev => ({
      ...prev,
      [size]: Math.max(0, (prev[size] || 0) + delta)
    }));
  };

  const handleSaveQuantityForSize = async (size: string) => {
    const typeInfo = getSelectedTypeInfo();
    if (!typeInfo) {
      Swal.fire({
        icon: "error",
        title: "No Type Selected",
        text: "Please select a valid type from the list above before saving quantities.",
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }

    // Validate that the type is actually in the predefined uniformTypes array
    const isValidType = uniformTypes.some(
      ut => ut.category === typeInfo.category && ut.type === typeInfo.type
    );

    if (!isValidType) {
      const validTypes = uniformTypes
        .filter(ut => ut.category === typeInfo.category)
        .map(ut => ut.type)
        .join(", ");

      Swal.fire({
        icon: "error",
        title: "Invalid Type",
        text: `Invalid type "${typeInfo.type}" for category "${typeInfo.category}". Valid types: ${validTypes}`,
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }

    // Get the quantity to save - use edited quantity if available, otherwise use current quantity
    const sizeQuantities = getSizeQuantities();
    const sizeQty = sizeQuantities.find(sq => sq.size === size);
    const newQuantity = editingQuantities[size] !== undefined 
      ? editingQuantities[size] 
      : (sizeQty?.quantity || 0);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Please login again",
          confirmButtonColor: "#1d4ed8",
        });
        return;
      }
      
      // Determine actual size for backend
      let actualSize: string | null = null;
      if (size === "N/A") {
        actualSize = null;
      } else if (typeInfo.type === "PVC Shoes" || typeInfo.type === "Boot") {
        actualSize = size;
      } else {
        actualSize = size;
      }

      if (sizeQty?.id) {
        // Update existing item - Option 1: Use PUT (current method, still works)
        const res = await fetch(`http://localhost:5000/api/inventory/${sizeQty.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            quantity: newQuantity,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "Saved!",
            text: `Quantity for size ${size === "N/A" ? "N/A" : (typeInfo.type === "PVC Shoes" || typeInfo.type === "Boot" ? `UK ${size}` : size)} updated to ${newQuantity}`,
            confirmButtonColor: "#1d4ed8",
            timer: 2000,
          });
          await fetchInventory();
        } else {
          throw new Error(data.message || "Failed to update quantity");
        }
      } else {
        // Create new item - Backend will auto-generate name from type
        const res = await fetch("http://localhost:5000/api/inventory", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            // name field is optional - backend auto-generates from type
            category: typeInfo.category,
            type: typeInfo.type,
            size: actualSize,
            quantity: newQuantity,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "Created!",
            text: `Item created with quantity ${newQuantity}`,
            confirmButtonColor: "#1d4ed8",
            timer: 2000,
          });
          await fetchInventory();
        } else {
          throw new Error(data.message || "Failed to create item");
        }
      }
    } catch (error: any) {
      console.error("Error saving quantity:", error);
      console.error("Size:", size, "Type:", typeInfo?.type, "Category:", typeInfo?.category);
      console.error("New Quantity:", newQuantity);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Failed to save quantity. Please check the console for details.",
        confirmButtonColor: "#1d4ed8",
      });
    }
  };

  const isShirtType = (type: string | undefined): boolean => {
    return type === "Digital Shirt" || type === "Company Shirt" || type === "Inner APM Shirt";
  };

  const getShirtPrice = (type: string | undefined): number | null => {
    if (!type) return null;
    if (type === "Digital Shirt") return shirtPrices.digitalShirt;
    if (type === "Company Shirt") return shirtPrices.companyShirt;
    if (type === "Inner APM Shirt") return shirtPrices.innerApmShirt;
    return null;
  };

  const handlePriceEdit = (type: string) => {
    const currentPrice = getShirtPrice(type);
    setEditingPrice({ type, price: currentPrice });
  };

  const handlePriceSave = async (type: string, price: number | null) => {
    try {
      const priceValue = price !== null && price >= 0 ? price : null;
      
      // Update state
      const updatedPrices = { ...shirtPrices };
      if (type === "Digital Shirt") {
        updatedPrices.digitalShirt = priceValue;
      } else if (type === "Company Shirt") {
        updatedPrices.companyShirt = priceValue;
      } else if (type === "Inner APM Shirt") {
        updatedPrices.innerApmShirt = priceValue;
      }
      
      setShirtPrices(updatedPrices);
      
      // Save to localStorage
      localStorage.setItem("shirtPrices", JSON.stringify(updatedPrices));
      
      // TODO: In production, send to backend API
      // const token = localStorage.getItem("token");
      // await fetch("http://localhost:5000/api/inventory/shirt-prices", {
      //   method: "PUT",
      //   headers: {
      //     "Content-Type": "application/json",
      //     Authorization: `Bearer ${token}`,
      //   },
      //   body: JSON.stringify({ type, price: priceValue }),
      // });

      Swal.fire({
        icon: "success",
        title: "Price Updated!",
        text: `Price for ${type} has been updated to ${priceValue !== null ? `RM ${priceValue.toFixed(2)}` : "Not set"}`,
        confirmButtonColor: "#1d4ed8",
        timer: 2000,
      });
      
      setEditingPrice(null);
    } catch (error) {
      console.error("Error saving price:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to save price",
        confirmButtonColor: "#1d4ed8",
      });
    }
  };

  const handleItemImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    typeInfo: UniformType | undefined
  ) => {
    const file = e.target.files?.[0];
    if (!file || !typeInfo) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: "error",
        title: "Invalid File",
        text: "Please select an image file.",
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: "error",
        title: "File Too Large",
        text: "Please select an image smaller than 5MB.",
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }

    setUploadingImage(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire({
          icon: "error",
          title: "Authentication Error",
          text: "Please login again.",
          confirmButtonColor: "#1d4ed8",
        });
        setUploadingImage(false);
        return;
      }

      // Convert image to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;

        try {
          // Get all inventory items for this type to update them
          const itemsToUpdate = inventory.filter(
            inv => inv.category === typeInfo.category && inv.type === typeInfo.type
          );

          if (itemsToUpdate.length === 0) {
            Swal.fire({
              icon: "error",
              title: "Error",
              text: "No inventory items found for this type.",
              confirmButtonColor: "#1d4ed8",
            });
            setUploadingImage(false);
            return;
          }

          // Update each inventory item with the new image
          const updatePromises = itemsToUpdate.map(item =>
            fetch(`http://localhost:5000/api/inventory/${item.id}`, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                image: base64Image,
              }),
            })
          );

          const results = await Promise.all(updatePromises);
          
          // Check each response for errors
          const errors: string[] = [];
          for (let i = 0; i < results.length; i++) {
            if (!results[i].ok) {
              const errorData = await results[i].json().catch(() => ({ message: "Unknown error" }));
              errors.push(`Item ${i + 1}: ${errorData.message || results[i].statusText}`);
              console.error(`Failed to update item ${itemsToUpdate[i].id}:`, errorData);
            }
          }

          if (errors.length === 0) {
            // Update local state
            setUniformTypes(prevTypes =>
              prevTypes.map(type =>
                type.category === typeInfo.category && type.type === typeInfo.type
                  ? { ...type, image: base64Image }
                  : type
              )
            );

            Swal.fire({
              icon: "success",
              title: "Updated!",
              text: `Image for ${typeInfo.type} has been updated successfully`,
              confirmButtonColor: "#1d4ed8",
              timer: 2000,
            });

            // Refresh inventory to get updated data
            await fetchInventory();
          } else {
            throw new Error(errors.join("; "));
          }
        } catch (error: any) {
          console.error("Error updating item image:", error);
          const errorMessage = error?.message || "Failed to update item image";
          Swal.fire({
            icon: "error",
            title: "Error",
            text: errorMessage.length > 100 ? errorMessage.substring(0, 100) + "..." : errorMessage,
            confirmButtonColor: "#1d4ed8",
          });
        } finally {
          setUploadingImage(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error reading file:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to read image file",
        confirmButtonColor: "#1d4ed8",
      });
      setUploadingImage(false);
    }
  };

  const handleSizeChartUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    typeInfo: UniformType | undefined
  ) => {
    const file = e.target.files?.[0];
    if (!file || !typeInfo) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: "error",
        title: "Invalid File",
        text: "Please select an image file.",
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: "error",
        title: "File Too Large",
        text: "Please select an image smaller than 5MB.",
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }

    setUploadingSizeChart(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire({
          icon: "error",
          title: "Authentication Error",
          text: "Please login again.",
          confirmButtonColor: "#1d4ed8",
        });
        setUploadingSizeChart(false);
        return;
      }

      // Convert image to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;

        try {
          // Get all inventory items for this type to update them
          const itemsToUpdate = inventory.filter(
            inv => inv.category === typeInfo.category && inv.type === typeInfo.type
          );

          if (itemsToUpdate.length === 0) {
            Swal.fire({
              icon: "error",
              title: "Error",
              text: "No inventory items found for this type.",
              confirmButtonColor: "#1d4ed8",
            });
            setUploadingSizeChart(false);
            return;
          }

          // Update each inventory item with the new size chart
          const updatePromises = itemsToUpdate.map(item =>
            fetch(`http://localhost:5000/api/inventory/${item.id}`, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                sizeChart: base64Image,
              }),
            })
          );

          const results = await Promise.all(updatePromises);
          
          // Check each response for errors
          const errors: string[] = [];
          for (let i = 0; i < results.length; i++) {
            if (!results[i].ok) {
              const errorData = await results[i].json().catch(() => ({ message: "Unknown error" }));
              errors.push(`Item ${i + 1}: ${errorData.message || results[i].statusText}`);
              console.error(`Failed to update size chart for item ${itemsToUpdate[i].id}:`, errorData);
            }
          }

          if (errors.length === 0) {
            // Update local state
            setUniformTypes(prevTypes =>
              prevTypes.map(type =>
                type.category === typeInfo.category && type.type === typeInfo.type
                  ? { ...type, sizeChart: base64Image }
                  : type
              )
            );

            // Update sizeCharts state
            const key = `${typeInfo.category}-${typeInfo.type}`;
            setSizeCharts(prev => ({ ...prev, [key]: base64Image }));

            Swal.fire({
              icon: "success",
              title: "Updated!",
              text: `Size chart for ${typeInfo.type} has been updated successfully`,
              confirmButtonColor: "#1d4ed8",
              timer: 2000,
            });

            // Refresh inventory to get updated data
            await fetchInventory();
            
            // Update the size chart modal if it's currently open for this item
            if (sizeChartModal.isOpen && sizeChartModal.itemName === typeInfo.type) {
              setSizeChartModal({
                isOpen: true,
                itemName: typeInfo.type,
                sizeChartUrl: base64Image, // Update with new image immediately
              });
            }
            
            // Force re-render by updating selected type
            const currentSelected = selectedType;
            setSelectedType("");
            setTimeout(() => {
              setSelectedType(currentSelected);
            }, 100);
          } else {
            throw new Error(errors.join("; "));
          }
        } catch (error: any) {
          console.error("Error updating size chart:", error);
          const errorMessage = error?.message || "Failed to update size chart";
          Swal.fire({
            icon: "error",
            title: "Error",
            text: errorMessage.length > 100 ? errorMessage.substring(0, 100) + "..." : errorMessage,
            confirmButtonColor: "#1d4ed8",
          });
        } finally {
          setUploadingSizeChart(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error reading file:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to read image file",
        confirmButtonColor: "#1d4ed8",
      });
      setUploadingSizeChart(false);
    }
  };

  const handleDeleteItem = async () => {
    const typeInfo = getSelectedTypeInfo();
    if (!typeInfo) return;

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to delete the entire item "${typeInfo.type}"? This will remove it from the system and delete all related inventory entries.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Please login again",
          confirmButtonColor: "#1d4ed8",
        });
        return;
      }
      
      // Delete all inventory entries for this item
      const sizeQuantities = getSizeQuantities();
      let allDeleted = true;
      let errorMessage = "";

      for (const sizeQty of sizeQuantities) {
        if (sizeQty.id) {
          try {
            const res = await fetch(`http://localhost:5000/api/inventory/${sizeQty.id}`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (!res.ok) {
              const errorData = await res.json();
              throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            if (!data.success) {
              allDeleted = false;
              errorMessage = data.message || "Failed to delete some inventory entries";
            }
          } catch (error) {
            console.error(`Error deleting inventory entry for size ${sizeQty.size}:`, error);
            allDeleted = false;
          }
        }
      }

      // Remove item from uniformTypes array
      // Remove from uniformTypes state (only if it's a custom type, not predefined)
      setUniformTypes(prevTypes => {
        const isPredefined = predefinedUniformTypes.some(
          pt => pt.category === typeInfo.category && pt.type === typeInfo.type
        );
        
        // Don't remove predefined types from the list
        if (isPredefined) {
          return prevTypes;
        }
        
        // Remove custom types
        return prevTypes.filter(
          item => !(item.category === typeInfo.category && item.type === typeInfo.type)
        );
      });

      // Clear selected type
      setSelectedType("");

      if (allDeleted || sizeQuantities.length === 0) {
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: `Item "${typeInfo.type}" has been deleted from the system`,
          confirmButtonColor: "#1d4ed8",
          timer: 2000,
        });
        await fetchInventory();
      } else {
        Swal.fire({
          icon: "warning",
          title: "Partially Deleted",
          text: `Item "${typeInfo.type}" has been removed from the list, but some inventory entries may not have been deleted: ${errorMessage}`,
          confirmButtonColor: "#1d4ed8",
        });
        await fetchInventory();
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to delete item",
        confirmButtonColor: "#1d4ed8",
      });
    }
  };

  const handleDeleteSize = async (size: string) => {
    const typeInfo = getSelectedTypeInfo();
    if (!typeInfo) return;

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to delete size ${size === "N/A" ? "N/A" : (typeInfo.type === "PVC Shoes" || typeInfo.type === "Boot" ? `UK ${size}` : size)}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      const sizeQuantities = getSizeQuantities();
      const sizeQty = sizeQuantities.find(sq => sq.size === size);

      // Determine actual size for backend
      let actualSize: string | null = null;
      if (size === "N/A") {
        actualSize = null;
      } else if (typeInfo.type === "PVC Shoes" || typeInfo.type === "Boot") {
        actualSize = size; // Size is already stored without "UK" prefix
      } else {
        actualSize = size;
      }

      // Try to delete from database if it has an ID
      if (sizeQty?.id) {
        // IMPORTANT: This DELETE operation permanently removes the entire inventory item
        // (category, type, size combination) from the database, not just setting quantity to 0.
        // The +/- buttons are for editing quantity, DELETE is for removing the size entry entirely.
        // Try ID-based delete first
        let res = await fetch(`http://localhost:5000/api/inventory/${sizeQty.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // If ID-based delete fails, try attribute-based delete
        if (!res.ok) {
          const errorData = await res.json();
          console.warn("ID-based delete failed, trying attribute-based delete:", errorData);
          
          // Fallback: Delete by attributes
          res = await fetch("http://localhost:5000/api/inventory/by-attributes", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              category: typeInfo.category,
              type: typeInfo.type,
              size: actualSize,
            }),
          });
        }

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        if (data.success) {
          // Mark this size as deleted so it doesn't reappear
          const deletedKey = `${typeInfo.category}-${typeInfo.type}-${size}`;
          setDeletedSizes(prev => new Set(prev).add(deletedKey));
          
          Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: `Size ${size === "N/A" ? "N/A" : (typeInfo.type === "PVC Shoes" || typeInfo.type === "Boot" ? `UK ${size}` : size)} has been deleted`,
            confirmButtonColor: "#1d4ed8",
            timer: 2000,
          });
          await fetchInventory();
        } else {
          throw new Error(data.message || "Failed to delete size");
        }
      } else {
        // No ID - this is a predefined size that was never saved (quantity 0, not in database)
        // Since admin clicked DELETE, mark it as deleted so it doesn't show
        const deletedKey = `${typeInfo.category}-${typeInfo.type}-${size}`;
        setDeletedSizes(prev => new Set(prev).add(deletedKey));
        
        // Try to delete by attributes (in case it exists in database but we don't have the ID)
        try {
          const res = await fetch("http://localhost:5000/api/inventory/by-attributes", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              category: typeInfo.category,
              type: typeInfo.type,
              size: actualSize,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              Swal.fire({
                icon: "success",
                title: "Deleted!",
                text: `Size ${size === "N/A" ? "N/A" : (typeInfo.type === "PVC Shoes" || typeInfo.type === "Boot" ? `UK ${size}` : size)} has been deleted`,
                confirmButtonColor: "#1d4ed8",
                timer: 2000,
              });
            }
          }
        } catch (error) {
          // Ignore errors - size will be hidden via deletedSizes tracking
          console.log("Size may not exist in database, marking as deleted...");
        }
        
        // Refresh inventory and show success
        await fetchInventory();
        Swal.fire({
          icon: "success",
          title: "Removed!",
          text: `Size ${size === "N/A" ? "N/A" : (typeInfo.type === "PVC Shoes" || typeInfo.type === "Boot" ? `UK ${size}` : size)} has been removed from the table`,
          confirmButtonColor: "#1d4ed8",
          timer: 2000,
        });
      }
    } catch (error: any) {
      console.error("Error deleting size:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Failed to delete size. Please try again.",
        confirmButtonColor: "#1d4ed8",
      });
    }
  };

  const handleQuantityChange = (delta: number) => {
    setEditQuantity(prev => Math.max(0, prev + delta));
  };

  const handleSaveQuantity = async (size: string) => {
    const typeInfo = getSelectedTypeInfo();
    if (!typeInfo) return;

    try {
      const token = localStorage.getItem("token");
      const sizeQuantities = getSizeQuantities();
      const sizeQty = sizeQuantities.find(sq => sq.size === size);
      // For display, we show "UK X" but backend expects just "X" for shoes/boots
      let actualSize: string | null = null;
      if (size === "N/A") {
        actualSize = null;
      } else if (typeInfo.type === "PVC Shoes" || typeInfo.type === "Boot") {
        // Size is already stored without "UK" prefix in the array
        actualSize = size;
      } else {
        actualSize = size;
      }

      // Check if item exists
      if (sizeQty?.id) {
        // Update existing item - Option 1: Use PUT (current method, still works)
        const res = await fetch(`http://localhost:5000/api/inventory/${sizeQty.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            quantity: editQuantity,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "Updated!",
            text: `Quantity updated to ${editQuantity}`,
            confirmButtonColor: "#1d4ed8",
            timer: 2000,
          });
          await fetchInventory();
          setEditingRow(null);
        } else {
          throw new Error(data.message || "Failed to update quantity");
        }
      } else {
        // Create new item - Backend will auto-generate name from type
        const res = await fetch("http://localhost:5000/api/inventory", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            // name field is optional - backend auto-generates from type
            category: typeInfo.category,
            type: typeInfo.type,
            size: actualSize,
            quantity: editQuantity,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "Created!",
            text: `Item created with quantity ${editQuantity}`,
            confirmButtonColor: "#1d4ed8",
            timer: 2000,
          });
          await fetchInventory();
          setEditingRow(null);
        } else {
          throw new Error(data.message || "Failed to create item");
        }
      }
    } catch (error) {
      console.error("Error saving quantity:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to save quantity",
        confirmButtonColor: "#1d4ed8",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditQuantity(0);
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const typeInfo = getSelectedTypeInfo();
  const sizeQuantities = getSizeQuantities();

  // Filter uniform types based on selected category
  const filteredUniformTypes = selectedCategory 
    ? uniformTypes.filter(type => type.category === selectedCategory)
    : uniformTypes;

  // Group items by category - all 5 categories
  const uniformNo3Items = filteredUniformTypes.filter(
    type => type.category === "Uniform No 3" &&
    (!searchTerm || 
     type.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
     type.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const uniformNo4Items = filteredUniformTypes.filter(
    type => type.category === "Uniform No 4" &&
    (!searchTerm || 
     type.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
     type.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const accessoriesNo3Items = filteredUniformTypes.filter(
    type => type.category === "Accessories No 3" &&
    (!searchTerm || 
     type.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
     type.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const accessoriesNo4Items = filteredUniformTypes.filter(
    type => type.category === "Accessories No 4" &&
    (!searchTerm || 
     type.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
     type.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const shirtItems = filteredUniformTypes.filter(
    type => (type.category === "Shirt" || type.category === "T-Shirt") &&
    (!searchTerm || 
     type.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
     type.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get category display name
  const getCategoryDisplayName = () => {
    if (selectedCategory === "T-Shirt") return "Shirt";
    return selectedCategory || "All Categories";
  };

  // Get items for selected category
  const getCategoryItems = () => {
    if (selectedCategory === "Uniform No 3") return uniformNo3Items;
    if (selectedCategory === "Uniform No 4") return uniformNo4Items;
    if (selectedCategory === "Accessories No 3") return accessoriesNo3Items;
    if (selectedCategory === "Accessories No 4") return accessoriesNo4Items;
    if (selectedCategory === "Shirt") return shirtItems;
    // If no category selected, return all
    return [...uniformNo3Items, ...uniformNo4Items, ...accessoriesNo3Items, ...accessoriesNo4Items, ...shirtItems];
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {selectedCategory && (
            <button
              onClick={() => router.push("/admin/inventory")}
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-all duration-300 hover:scale-110 border-2 border-blue-700"
              title="Back to Categories"
            >
              <ArrowLeftIcon className="w-6 h-6" strokeWidth={2.5} />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 drop-shadow-md" style={{ textShadow: '0 2px 4px rgba(255,255,255,0.8)' }}>
              {selectedCategory ? `${getCategoryDisplayName()} Inventory` : "Uniform Inventory Management"}
            </h1>
            <p className="text-gray-700 mt-2 font-medium drop-shadow-sm" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
              {selectedCategory ? `Manage inventory for ${getCategoryDisplayName()}` : "Manage inventory quantities for each uniform type and size"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Add Item Button */}
          <button
            onClick={() => setShowAddItemForm(true)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2 border-2 border-orange-400/50 hover:border-orange-500"
          >
            <PlusIcon className="w-5 h-5" />
            Add Item
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Item Type Tabs - Only show if category is selected */}
      {selectedCategory && (
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md border-2 border-orange-300 p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            {getCategoryDisplayName()} Items
          </h2>
          
          {/* Item Type Tabs */}
          <div className="flex flex-wrap gap-2">
            {getCategoryItems().map((type) => (
              <button
                key={`${type.category}-${type.type}`}
                onClick={() => {
                  setSelectedType(`${type.category}-${type.type}`);
                  setEditingRow(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedType === `${type.category}-${type.type}`
                    ? "bg-blue-700 text-white border-2 border-blue-800"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-200"
                }`}
              >
                {type.type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Combined Card with Header and Table */}
      {selectedType && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          {/* Header Section */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-4">
              {/* Picture - Display from inventory or fallback to local images */}
              <div className="flex-shrink-0">
                {(() => {
                  // Priority: 1) Image from inventory API, 2) Local image path, 3) Placeholder
                  const inventoryImage = typeInfo?.image && typeInfo.image.trim() !== "" && !typeInfo.image.includes("placeholder") 
                    ? typeInfo.image 
                    : null;
                  const localImage = typeInfo?.type ? getItemImagePath(typeInfo.type) : "";
                  const displayImage = inventoryImage || localImage || "";
                  
                  return displayImage ? (
                    <img
                      src={displayImage}
                      alt={typeInfo?.type || "Item"}
                      className="w-20 h-20 object-contain rounded bg-white border border-gray-200"
                      onError={(e) => {
                        // If image fails to load, show placeholder
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector(".image-placeholder")) {
                          const placeholder = document.createElement("div");
                          placeholder.className = "image-placeholder w-20 h-20 rounded bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-400 text-xs";
                          placeholder.textContent = "No image";
                          parent.appendChild(placeholder);
                        }
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                      No image
                    </div>
                  );
                })()}
              </div>
              
              {/* Item Name */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{typeInfo?.type}</h3>
                <p className="text-sm text-gray-600">{typeInfo?.category}</p>
              </div>

              {/* Price Section (only for shirts) */}
              {typeInfo && isShirtType(typeInfo.type) && (
                <div className="flex-shrink-0">
                  {editingPrice && editingPrice.type === typeInfo.type ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingPrice.price !== null ? editingPrice.price : ""}
                        onChange={(e) => {
                          const value = e.target.value === "" ? null : parseFloat(e.target.value);
                          setEditingPrice({ ...editingPrice, price: value });
                        }}
                        placeholder="0.00"
                        className="w-24 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">RM</span>
                      <button
                        onClick={() => handlePriceSave(typeInfo.type, editingPrice.price)}
                        className="px-3 py-1 bg-blue-700 text-white rounded hover:bg-blue-800 transition text-sm font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingPrice(null)}
                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="text-right">
                      <div className="text-sm text-gray-600 mb-1">Price</div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-gray-900">
                          {getShirtPrice(typeInfo.type) !== null
                            ? `RM ${getShirtPrice(typeInfo.type)!.toFixed(2)}`
                            : "Not set"}
                        </span>
                        <button
                          onClick={() => handlePriceEdit(typeInfo.type)}
                          className="p-1 text-blue-700 hover:bg-blue-50 rounded transition"
                          title="Edit price"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex-shrink-0 flex items-center gap-3">
                {/* Add Size Button - Only for items with sizes */}
                {typeInfo && typeInfo.sizes.length > 0 && (
                  <button
                    onClick={() => {
                      setShowAddSizeForm(true);
                      setNewSize({ size: "", quantity: 0 });
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2"
                    title="Add a new size for this item"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Add Size
                  </button>
                )}
                
                {/* Size Chart Button - only for items with sizes */}
                {typeInfo && typeInfo.sizes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const sizeChartUrl = getSizeChartUrl(typeInfo.category, typeInfo.type) || "";
                      setSizeChartModal({
                        isOpen: true,
                        itemName: typeInfo.type,
                        sizeChartUrl,
                      });
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2"
                    title="View or upload size chart for this item"
                  >
                    <ChartBarIcon className="w-5 h-5" />
                    Size Chart
                  </button>
                )}
                
                {/* Delete Item Button */}
                <button
                  onClick={handleDeleteItem}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center gap-2"
                  title="Delete this item from the system"
                >
                  <TrashIcon className="w-5 h-5" />
                  Delete Item
                </button>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 border-b">SIZE</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b">QUANTITY</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b">SAVE</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b">DELETE</th>
              </tr>
            </thead>
            <tbody>
              {sizeQuantities.map((sizeQty) => {
                const displaySize = () => {
                  if (sizeQty.size === "N/A") return "N/A";
                  const typeInfo = getSelectedTypeInfo();
                  if (typeInfo && (typeInfo.type === "PVC Shoes" || typeInfo.type === "Boot")) {
                    return `UK ${sizeQty.size}`;
                  }
                  return sizeQty.size;
                };

                const currentQuantity = editingQuantities[sizeQty.size] !== undefined 
                  ? editingQuantities[sizeQty.size] 
                  : sizeQty.quantity;

                return (
                  <tr key={sizeQty.size} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{displaySize()}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleQuantityChangeForSize(sizeQty.size, -1)}
                          className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition font-semibold"
                          title="Decrease"
                        >
                          -
                        </button>
                        <span className="font-medium min-w-[3rem] text-center">{currentQuantity}</span>
                        <button
                          onClick={() => handleQuantityChangeForSize(sizeQty.size, 1)}
                          className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200 transition font-semibold"
                          title="Increase"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleSaveQuantityForSize(sizeQty.size)}
                        className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition font-medium text-sm"
                      >
                        SAVE
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDeleteSize(sizeQty.size)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium text-sm"
                      >
                        DELETE
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!selectedType && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-800">
            Please select a uniform type above to view and manage inventory.
          </p>
        </div>
      )}

      {/* Add Item Form Modal */}
      {showAddItemForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add New Item</h2>
                <button
                  onClick={() => {
                    setShowAddItemForm(false);
                    setNewItem({
                      category: "Uniform No 3",
                      type: "",
                      sizes: [],
                      hasSizes: true,
                      image: "",
                      imageFile: null,
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  
                  // Validate form
                  if (!newItem.type.trim()) {
                    Swal.fire({
                      icon: "error",
                      title: "Error",
                      text: "Item type is required",
                      confirmButtonColor: "#1d4ed8",
                    });
                    return;
                  }

                  if (!newItem.image && !newItem.imageFile) {
                    Swal.fire({
                      icon: "error",
                      title: "Error",
                      text: "Please provide an image (URL or file)",
                      confirmButtonColor: "#1d4ed8",
                    });
                    return;
                  }

                  if (newItem.hasSizes && newItem.sizes.length === 0) {
                    Swal.fire({
                      icon: "error",
                      title: "Error",
                      text: "Please provide at least one size",
                      confirmButtonColor: "#1d4ed8",
                    });
                    return;
                  }

                  try {
                    const token = localStorage.getItem("token");
                    if (!token) {
                      Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: "Please login again",
                        confirmButtonColor: "#1d4ed8",
                      });
                      return;
                    }

                    // Show loading
                    Swal.fire({
                      title: "Creating Item...",
                      html: "Please wait while we create the new item type.",
                      allowOutsideClick: false,
                      allowEscapeKey: false,
                      didOpen: () => {
                        Swal.showLoading();
                      },
                    });

                    // Handle image input:
                    // Backend only accepts:
                    // - Base64 strings starting with "data:image/"
                    // - Valid URLs (http/https)
                    // So:
                    // - If user uploads a file -> convert to Base64
                    // - If user enters "/xxx.png" -> convert to absolute URL using current origin
                    let imageUrl = (newItem.image || "").trim();
                    if (imageUrl.startsWith("/")) {
                      imageUrl = `${window.location.origin}${imageUrl}`;
                    }

                    if (newItem.imageFile) {
                      const base64Image: string = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result || ""));
                        reader.onerror = () => reject(new Error("Failed to read image file"));
                        reader.readAsDataURL(newItem.imageFile as File);
                      });
                      imageUrl = base64Image;
                    }

                    if (!imageUrl) {
                      throw new Error("Please provide an image URL or upload an image file.");
                    }

                    // Create inventory entries via backend API
                    const itemType = newItem.type.trim();
                    const createdItems: any[] = [];

                    if (newItem.hasSizes && newItem.sizes.length > 0) {
                      // Create inventory entries for each size
                      for (const size of newItem.sizes) {
                        const actualSize = size.trim();
                        
                        // Determine size format for shoes/boots
                        let normalizedSize = actualSize;
                        if (itemType.toLowerCase().includes("shoe") || itemType.toLowerCase().includes("boot")) {
                          normalizedSize = actualSize.replace(/^UK\s+/i, "");
                        }

                        const response = await fetch("http://localhost:5000/api/inventory", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            category: newItem.category,
                            type: itemType,
                            size: normalizedSize,
                            quantity: 0,
                            name: itemType, // Use type as name
                            image: imageUrl, // Include image URL
                          }),
                        });

                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.message || `Failed to create inventory for size ${size}`);
                        }

                        const data = await response.json();
                        if (data.success) {
                          createdItems.push(data.inventory || data.item);
                        }
                      }
                    } else {
                      // Create one inventory entry for accessories (no size)
                      const response = await fetch("http://localhost:5000/api/inventory", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          category: newItem.category,
                          type: itemType,
                          size: null,
                          quantity: 0,
                          name: itemType,
                          image: imageUrl, // Include image URL
                        }),
                      });

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || "Failed to create inventory item");
                      }

                      const data = await response.json();
                      if (data.success) {
                        createdItems.push(data.inventory || data.item);
                      }
                    }

                    // Refresh inventory - this will automatically add the new type to uniformTypes
                    await fetchInventory();

                    Swal.fire({
                      icon: "success",
                      title: "Item Created!",
                      text: `"${itemType}" has been created successfully${createdItems.length > 1 ? ` with ${createdItems.length} size entries` : ""}. You can now manage inventory for this item.`,
                      confirmButtonColor: "#1d4ed8",
                      timer: 3000,
                      timerProgressBar: true,
                    });

                    // Reset form
                    setNewItem({
                      category: "Uniform No 3",
                      type: "",
                      sizes: [],
                      hasSizes: true,
                      image: "",
                      imageFile: null,
                    });
                    setShowAddItemForm(false);
                  } catch (error: any) {
                    console.error("Error creating item type:", error);
                    Swal.fire({
                      icon: "error",
                      title: "Error",
                      text: error.message || "Failed to create item type. Please try again.",
                      confirmButtonColor: "#1d4ed8",
                    });
                  }
                }}
                className="space-y-4"
              >
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Uniform No 3">Uniform No 3</option>
                    <option value="Uniform No 4">Uniform No 4</option>
                    <option value="Shirt">Shirt</option>
                    <option value="Accessories No 3">Accessories No 3</option>
                    <option value="Accessories No 4">Accessories No 4</option>
                  </select>
                </div>

                {/* Item Type (Free Text Input - Allows Custom Types) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Type *
                  </label>
                  <input
                    type="text"
                    value={newItem.type}
                    onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                    placeholder="e.g., Custom Item Name, New Badge Type, Special Uniform"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    list="existing-types"
                  />
                  <datalist id="existing-types">
                    {uniformTypes
                      .filter(ut => ut.category === newItem.category)
                      .map(ut => (
                        <option key={`${ut.category}-${ut.type}`} value={ut.type} />
                      ))}
                  </datalist>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter a new item type name or select from existing types. This will create a new item type in the system.
                  </p>
                </div>

                {/* Has Sizes Checkbox */}
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newItem.hasSizes}
                      onChange={(e) => {
                        setNewItem({
                          ...newItem,
                          hasSizes: e.target.checked,
                          sizes: e.target.checked ? [] : [],
                        });
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Item has sizes (uncheck for accessories like badges, pins, etc.)
                    </span>
                  </label>
                </div>

                {/* Sizes Input (if hasSizes is true) */}
                {newItem.hasSizes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sizes (comma-separated) *
                    </label>
                    <input
                      type="text"
                      value={newItem.sizes.join(", ")}
                      onChange={(e) => {
                        const sizes = e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter((s) => s.length > 0);
                        setNewItem({ ...newItem, sizes });
                      }}
                      placeholder="e.g., XS, S, M, L, XL, 2XL, 3XL or 4, 5, 6, 7, 8, 9, 10"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={newItem.hasSizes}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter sizes separated by commas (e.g., "XS, S, M, L" or "4, 5, 6, 7")
                    </p>
                  </div>
                )}

                {/* Image URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL *
                  </label>
                  <input
                    type="text"
                    value={newItem.image}
                    onChange={(e) => setNewItem({ ...newItem, image: e.target.value })}
                    placeholder="e.g., /no3.png or https://example.com/image.png"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={!newItem.imageFile}
                  />
                </div>

                {/* Image File Upload (Alternative) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Or Upload Image File
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setNewItem({ ...newItem, imageFile: file, image: "" });
                      }
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {newItem.imageFile && (
                    <p className="text-xs text-gray-500 mt-1">
                      Selected: {newItem.imageFile.name}
                    </p>
                  )}
                </div>

                {/* Preview */}
                {(newItem.image || newItem.imageFile) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preview
                    </label>
                    <div className="w-32 h-32 border border-gray-300 rounded-md overflow-hidden">
                      {newItem.imageFile ? (
                        <img
                          src={URL.createObjectURL(newItem.imageFile)}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <img
                          src={newItem.image}
                          alt="Preview"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition font-medium"
                  >
                    Add Item
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddItemForm(false);
                      setNewItem({
                        category: "Uniform No 3",
                        type: "",
                        sizes: [],
                        hasSizes: true,
                        image: "",
                        imageFile: null,
                      });
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Size Form Modal */}
      {showAddSizeForm && selectedType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add New Size</h2>
                <button
                  onClick={() => {
                    setShowAddSizeForm(false);
                    setNewSize({ size: "", quantity: 0 });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  
                  const typeInfo = getSelectedTypeInfo();
                  if (!typeInfo) return;

                  // Validate
                  if (!newSize.size.trim()) {
                    Swal.fire({
                      icon: "error",
                      title: "Error",
                      text: "Size is required",
                      confirmButtonColor: "#1d4ed8",
                    });
                    return;
                  }

                  // Check if size already exists
                  const sizeQuantities = getSizeQuantities();
                  const existingSize = sizeQuantities.find(sq => sq.size === newSize.size.trim());
                  if (existingSize) {
                    Swal.fire({
                      icon: "error",
                      title: "Size Exists",
                      text: `Size "${newSize.size.trim()}" already exists for this item.`,
                      confirmButtonColor: "#1d4ed8",
                    });
                    return;
                  }

                  try {
                    const token = localStorage.getItem("token");
                    if (!token) {
                      Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: "Please login again",
                        confirmButtonColor: "#1d4ed8",
                      });
                      return;
                    }

                    // Determine actual size for backend
                    let actualSize: string | null = null;
                    const trimmedSize = newSize.size.trim();
                    if (trimmedSize === "N/A") {
                      actualSize = null;
                    } else if (typeInfo.type === "PVC Shoes" || typeInfo.type === "Boot") {
                      // For shoes/boots, store without "UK" prefix
                      actualSize = trimmedSize.replace(/^UK\s+/i, "");
                    } else {
                      actualSize = trimmedSize;
                    }

                    // Create new inventory item with this size
                    const res = await fetch("http://localhost:5000/api/inventory", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        category: typeInfo.category,
                        type: typeInfo.type,
                        size: actualSize,
                        quantity: newSize.quantity || 0,
                      }),
                    });

                    if (!res.ok) {
                      const errorData = await res.json();
                      throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
                    }

                    const data = await res.json();
                    if (data.success) {
                      Swal.fire({
                        icon: "success",
                        title: "Size Added!",
                        text: `Size "${trimmedSize}" has been added with quantity ${newSize.quantity || 0}`,
                        confirmButtonColor: "#1d4ed8",
                        timer: 2000,
                      });
                      await fetchInventory();
                      setShowAddSizeForm(false);
                      setNewSize({ size: "", quantity: 0 });
                    } else {
                      throw new Error(data.message || "Failed to add size");
                    }
                  } catch (error: any) {
                    console.error("Error adding size:", error);
                    Swal.fire({
                      icon: "error",
                      title: "Error",
                      text: error.message || "Failed to add size. Please try again.",
                      confirmButtonColor: "#1d4ed8",
                    });
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Size <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSize.size}
                    onChange={(e) => setNewSize({ ...newSize, size: e.target.value })}
                    placeholder={typeInfo?.type === "PVC Shoes" || typeInfo?.type === "Boot" ? "e.g., 13 or UK 13" : "e.g., XS, S, M, L, XL, 2XL, 3XL"}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {typeInfo?.type === "PVC Shoes" || typeInfo?.type === "Boot" 
                      ? "Enter size number (e.g., 13). 'UK' prefix will be added automatically for display."
                      : "Enter the size value (e.g., XS, S, M, L, XL, 2XL, 3XL)"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newSize.quantity}
                    onChange={(e) => setNewSize({ ...newSize, quantity: parseInt(e.target.value, 10) || 0 })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Set the initial quantity for this size (default: 0)
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition font-medium"
                  >
                    Add Size
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSizeForm(false);
                      setNewSize({ size: "", quantity: 0 });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
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
            <div className="flex-1 overflow-hidden p-6 flex items-center justify-center min-h-0">
              {sizeChartModal.sizeChartUrl ? (
                <img
                  src={sizeChartModal.sizeChartUrl}
                  alt={`Size chart for ${sizeChartModal.itemName}`}
                  className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg border border-gray-200"
                  style={{ maxHeight: 'calc(95vh - 180px)' }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder-image.png";
                    target.alt = "Size chart image not available";
                  }}
                />
              ) : (
                <div className="text-center p-8 text-gray-500">
                  <p>No size chart available for this item.</p>
                  <p className="text-sm mt-2">Please contact the logistics coordinator.</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-center gap-3 flex-shrink-0">
              {/* Hidden input to upload/replace size chart */}
              <input
                type="file"
                id="size-chart-modal-upload"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const typeInfo = getSelectedTypeInfo();
                  if (!typeInfo) return;
                  handleSizeChartUpload(e, typeInfo);
                }}
              />

              <label
                htmlFor="size-chart-modal-upload"
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition cursor-pointer"
              >
                Change
              </label>

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
    </div>
  );
}
