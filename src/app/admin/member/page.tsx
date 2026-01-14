"use client";

import { useState, useEffect } from "react";
import { MagnifyingGlassIcon, ArrowPathIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

interface MemberProfile {
  sispaId: string;
  name: string;
  email: string;
  batch: string;
  matricNumber?: string;
  phoneNumber?: string;
  profilePicture?: string;
  gender?: "Male" | "Female";
}

interface UniformItem {
  category: string;
  type: string;
  size: string;
  quantity: number;
  notes?: string;
  status?: "Available" | "Not Available" | "Missing";
  missingCount?: number;
  receivedDate?: string;
}

interface MemberUniform {
  sispaId: string;
  items: UniformItem[];
}

interface MemberWithData {
  profile: MemberProfile;
  uniform: MemberUniform | null;
}

export default function MemberPage() {
  const [members, setMembers] = useState<MemberWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"profile" | "uniform">("profile");
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [selectedUniformCategory, setSelectedUniformCategory] = useState<"Uniform No 3" | "Uniform No 4" | "Accessories No 3" | "Accessories No 4" | "Shirt" | "">("");
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  useEffect(() => {
    fetchAllMembers();
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
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
          setInventoryItems(data.inventory);
        }
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  };

  const fetchAllMembers = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Fetch all members
      const membersRes = await fetch("http://localhost:5000/api/members", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const membersData = await membersRes.json();
      
      if (!membersData.success) {
        console.error("Failed to fetch members");
        setLoading(false);
        return;
      }

      const membersList = membersData.members || [];
      
      // Debug: Log first member to check if gender is in response
      if (membersList.length > 0) {
        console.log("Sample member data from API:", membersList[0]);
      }
      
      // Fetch uniform data for each member
      const membersWithData: MemberWithData[] = await Promise.all(
        membersList.map(async (member: any) => {
          let uniform: MemberUniform | null = null;
          
          try {
            // Fetch uniform for this member (admin endpoint)
            const uniformRes = await fetch(
              `http://localhost:5000/api/members/${member.sispaId}/uniform`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            
            if (uniformRes.ok) {
              const uniformData = await uniformRes.json();
              if (uniformData.success && uniformData.uniform) {
                uniform = {
                  sispaId: member.sispaId,
                  items: uniformData.uniform.items || [],
                };
              }
            }
          } catch (error) {
            console.error(`Error fetching uniform for ${member.sispaId}:`, error);
          }

          return {
            profile: {
              sispaId: member.sispaId || "",
              name: member.name || "",
              email: member.email || "",
              batch: member.batch || "Unassigned",
              matricNumber: member.matricNumber || member.matricNo || "",
              phoneNumber: member.phoneNumber || member.phone || "",
              profilePicture: member.profilePicture || member.profileImage || "",
              gender: member.gender ? (member.gender as "Male" | "Female") : undefined,
            },
            uniform,
          };
        })
      );

      setMembers(membersWithData);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group members by batch (normalize "Kompeni X" format, case-insensitive)
  const membersByBatch = members.reduce((acc, member) => {
    const batch = member.profile.batch || "Unassigned";
    
    // Normalize batch: extract number from "Kompeni X" or "kompeni X" format
    // Convert to "Kompeni {number}" format for consistent grouping
    let normalizedBatch = "Unassigned";
    
    if (batch && batch.toLowerCase().includes("kompeni")) {
      const numberMatch = batch.match(/\d+/);
      if (numberMatch) {
        const number = numberMatch[0];
        normalizedBatch = `Kompeni ${number}`;
      } else {
        normalizedBatch = batch; // Keep original if no number found
      }
    } else if (batch && batch.trim() !== "") {
      normalizedBatch = batch; // Keep other formats as-is
    }
    
    // Filter out "Batch 1" dummy data
    if (normalizedBatch.toLowerCase() === "batch 1" || normalizedBatch === "1") {
      return acc;
    }
    
    if (!acc[normalizedBatch]) {
      acc[normalizedBatch] = [];
    }
    acc[normalizedBatch].push(member);
    return acc;
  }, {} as Record<string, MemberWithData[]>);

  // Filter members by search term
  const filteredMembersByBatch = Object.entries(membersByBatch).reduce(
    (acc, [batch, batchMembers]) => {
      const filtered = batchMembers.filter(
        (member) =>
          member.profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.profile.sispaId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.profile.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.profile.batch?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[batch] = filtered;
      }
      return acc;
    },
    {} as Record<string, MemberWithData[]>
  );

  const handleDeleteMember = async (sispaId: string, name: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to delete member "${name}" (${sispaId})? This action cannot be undone.`,
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
      const res = await fetch(`http://localhost:5000/api/members/${sispaId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: `Member "${name}" has been deleted successfully`,
          confirmButtonColor: "#1d4ed8",
          timer: 2000,
        });
        // Refresh member list
        await fetchAllMembers();
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message || "Failed to delete member",
          confirmButtonColor: "#1d4ed8",
        });
      }
    } catch (error) {
      console.error("Error deleting member:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to delete member",
        confirmButtonColor: "#1d4ed8",
      });
    }
  };

  const handleProfilePictureUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    sispaId: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire({
          icon: "error",
          title: "Authentication Error",
          text: "Please login again.",
          confirmButtonColor: "#1d4ed8",
        });
        return;
      }

      // Convert image to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;

        try {
          // Update member profile picture via PUT endpoint
          const res = await fetch(`http://localhost:5000/api/members/${sispaId}`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              profilePicture: base64Image,
            }),
          });

          const data = await res.json();

          if (data.success) {
            Swal.fire({
              icon: "success",
              title: "Updated!",
              text: "Profile picture updated successfully",
              confirmButtonColor: "#1d4ed8",
              timer: 2000,
            });

            // Refresh member list to show updated picture
            await fetchAllMembers();
          } else {
            Swal.fire({
              icon: "error",
              title: "Error",
              text: data.message || "Failed to update profile picture",
              confirmButtonColor: "#1d4ed8",
            });
          }
        } catch (error) {
          console.error("Error updating profile picture:", error);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to update profile picture",
            confirmButtonColor: "#1d4ed8",
          });
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
    }
  };

  // Get predefined items for each category (matching user uniform structure)
  // Helper function to get the display order priority for an item
  const getItemDisplayOrder = (itemType: string): number => {
    const itemLower = itemType.toLowerCase();
    
    // Define order within each category
    // Lower number = appears first
    
    // Uniform No 3 items (order: 1-10)
    if (itemLower.includes("uniform no 3 male") || itemLower.includes("cloth no 3")) return 1;
    if (itemLower.includes("uniform no 3 female") || itemLower.includes("pants no 3")) return 2;
    if (itemLower.includes("pvc shoes")) return 3;
    if (itemLower === "beret" || (itemLower.includes("beret") && !itemLower.includes("logo pin") && !itemLower.includes("pin"))) return 4;
    
    // Uniform No 4 items (order: 11-20)
    if (itemLower.includes("uniform no 4") && !itemLower.includes("boot") && !itemLower.includes("accessories")) return 11;
    if (itemLower.includes("boot")) return 12;
    
    // Accessories No 3 items (order: 21-30)
    if (itemLower.includes("apulet")) return 21;
    if (itemLower.includes("integrity badge")) return 22;
    if (itemLower.includes("shoulder badge")) return 23;
    if (itemLower.includes("cel bar")) return 24;
    if (itemLower.includes("beret logo pin") || (itemLower.includes("beret") && itemLower.includes("pin"))) return 25;
    if (itemLower.includes("belt no 3")) return 26;
    if (itemLower.includes("nametag") || itemLower.includes("name tag")) {
      if (itemLower.includes("no 3") || itemLower.includes("name tag no 3")) return 27;
      return 27; // Default nametag in Accessories No 3
    }
    
    // Accessories No 4 items (order: 31-40)
    if (itemLower.includes("apm tag")) return 31;
    if (itemLower.includes("belt no 4")) return 32;
    if (itemLower.includes("nametag") || itemLower.includes("name tag")) {
      if (itemLower.includes("no 4") || itemLower.includes("name tag no 4")) return 33;
      return 33; // Default nametag in Accessories No 4
    }
    
    // Shirt items (order: 41-50)
    if (itemLower.includes("digital shirt")) return 41;
    if (itemLower.includes("company shirt")) return 42;
    if (itemLower.includes("inner apm shirt")) return 43;
    
    // Default: items not in predefined list get high number (appear last)
    return 999;
  };

  const getCategoryItems = (category: string): string[] => {
    // If inventory is loaded, generate items dynamically from inventory
    if (inventoryItems.length > 0) {
      const categoryInventory = inventoryItems.filter(inv => {
        const invCategory = inv.category?.toLowerCase() || "";
        const targetCategory = category.toLowerCase();
        return invCategory === targetCategory;
      });
      
      // Get unique type names from inventory for this category
      const uniqueTypes = new Set<string>();
      categoryInventory.forEach(inv => {
        if (inv.type) {
          uniqueTypes.add(inv.type);
        }
      });
      
      const dynamicItems = Array.from(uniqueTypes);
      
      // Merge with hardcoded items to ensure all items are included
      // This handles cases where items might not be in inventory yet
      const hardcodedItems: string[] = [];
      switch (category) {
        case "Uniform No 3":
          hardcodedItems.push("Uniform No 3 Male", "Uniform No 3 Female", "PVC Shoes", "Beret");
          break;
        case "Uniform No 4":
          hardcodedItems.push("Uniform No 4", "Boot");
          break;
        case "Accessories No 3":
          hardcodedItems.push("Apulet", "Integrity Badge", "Shoulder Badge", "Cel Bar", "Beret Logo Pin", "Belt No 3", "Nametag");
          break;
        case "Accessories No 4":
          hardcodedItems.push("APM Tag", "Belt No 4", "Nametag");
          break;
        case "Shirt":
          hardcodedItems.push("Digital Shirt", "Company Shirt", "Inner APM Shirt");
          break;
      }
      
      // Merge and remove duplicates, prioritizing inventory items
      let allItems = [...new Set([...dynamicItems, ...hardcodedItems])];
      
      // CRITICAL: Filter out "Beret" from Accessories No 3 (Beret belongs to Uniform No 3 only)
      if (category === "Accessories No 3") {
        allItems = allItems.filter(item => {
          const itemLower = item.toLowerCase();
          // Keep "Beret Logo Pin" but remove "Beret"
          return !(itemLower === "beret" && !itemLower.includes("logo pin") && !itemLower.includes("pin"));
        });
      }
      
      // CRITICAL: Sort items to ensure correct order using display order function
      allItems.sort((a, b) => {
        const orderA = getItemDisplayOrder(a);
        const orderB = getItemDisplayOrder(b);
        return orderA - orderB;
      });
      
      return allItems;
    }
    
    // Fallback to hardcoded items if inventory not loaded
    switch (category) {
      case "Uniform No 3":
        return ["Uniform No 3 Male", "Uniform No 3 Female", "PVC Shoes", "Beret"];
      case "Uniform No 4":
        return ["Uniform No 4", "Boot"];
      case "Accessories No 3":
        return ["Apulet", "Integrity Badge", "Shoulder Badge", "Cel Bar", "Beret Logo Pin", "Belt No 3", "Nametag"];
      case "Accessories No 4":
        return ["APM Tag", "Belt No 4", "Nametag"];
      case "Shirt":
        return ["Digital Shirt", "Company Shirt", "Inner APM Shirt"];
      default:
        return [];
    }
  };

  // Helper function to determine which category an item belongs to (based on user uniform structure)
  const getItemCategory = (item: UniformItem): string => {
    const itemType = item.type?.toLowerCase() || "";
    const itemCategory = item.category?.toLowerCase() || "";
    
    // Accessories No 3 - MUST check BEFORE Uniform No 3 to catch "Beret Logo Pin"
    // "Beret Logo Pin" contains "beret" so we need to check it first
    if (itemType.includes("apulet") || itemType.includes("integrity badge") || 
        itemType.includes("shoulder badge") || itemType.includes("cel bar") ||
        itemType.includes("beret logo pin") || itemType.includes("belt no 3")) {
      return "Accessories No 3";
    }
    
    // Uniform No 3 items (check "beret" after "beret logo pin" to avoid false match)
    if (itemType.includes("uniform no 3 male") || itemType.includes("uniform no 3 female") || 
        itemType.includes("cloth no 3") || itemType.includes("pants no 3") ||
        itemType.includes("pvc shoes") || itemType.includes("beret")) {
      return "Uniform No 3";
    }
    
    // Uniform No 4 items
    if (itemType.includes("uniform no 4") || itemType.includes("cloth no 4") || 
        itemType.includes("pants no 4") || itemType.includes("boot")) {
      return "Uniform No 4";
    }
    
    // Nametag - check category to determine if No 3 or No 4
    if (itemType.includes("nametag")) {
      if (itemCategory.includes("uniform no 3")) {
        return "Accessories No 3";
      } else if (itemCategory.includes("uniform no 4")) {
        return "Accessories No 4";
      }
      // Default to Accessories No 3 if category unclear
      return "Accessories No 3";
    }
    
    // Accessories No 4
    if (itemType.includes("apm tag") || itemType.includes("belt no 4")) {
      return "Accessories No 4";
    }
    
    // Shirt/T-Shirt items
    if (itemType.includes("digital shirt") || itemType.includes("company shirt") ||
        itemType.includes("inner apm shirt") || itemCategory.includes("t-shirt") ||
        itemCategory.includes("tshirt") || itemCategory.includes("shirt")) {
      return "Shirt";
    }
    
    // Fallback to category if it matches one of our 5 categories
    // Check Accessories categories FIRST to avoid false matches
    if (itemCategory.includes("accessories no 3")) return "Accessories No 3";
    if (itemCategory.includes("accessories no 4")) return "Accessories No 4";
    if (itemCategory.includes("uniform no 3")) return "Uniform No 3";
    if (itemCategory.includes("uniform no 4")) return "Uniform No 4";
    if (itemCategory.includes("t-shirt") || itemCategory.includes("tshirt") || itemCategory === "shirt") return "Shirt";
    
    return "";
  };

  // Parse uniform items by category - includes ALL items (with sizes and accessories)
  const parseUniformData = (items: UniformItem[]) => {
    const uniformNo3: any = {
      items: [],
      accessories: []
    };
    const uniformNo4: any = {
      items: [],
      accessories: []
    };
    const tShirt: any = {
      items: []
    };

    items.forEach((item) => {
      const category = item.category?.toLowerCase() || "";
      const type = item.type?.toLowerCase() || "";
      // Handle null size (from new 5-category structure) - convert to empty string for compatibility
      const size = (item.size === null || item.size === undefined) ? "" : (item.size || "");
      const hasSize = size && size !== "N/A" && size !== "" && size !== null;

      // Handle both "Uniform No 3" and "Accessories No 3" categories
      if (category.includes("uniform no 3") || category.includes("accessories no 3")) {
        if (hasSize) {
          // Items with sizes (main items only in Uniform No 3 category)
          // Note: Accessories No 3 items should not have sizes, but handle it just in case
          if (type.includes("cloth") || type.includes("uniform no 3 male") || type.includes("male")) uniformNo3.cloth = size;
          if (type.includes("pants") || type.includes("uniform no 3 female") || type.includes("female")) uniformNo3.pants = size;
          if (type.includes("pvc") || type.includes("shoes")) uniformNo3.shoes = size;
          // Beret is a main item, not an accessory - but check for "logo pin" to distinguish
          if (type.includes("beret") && !type.includes("logo pin") && !type.includes("pin")) {
            uniformNo3.beret = size;
          }
          // CRITICAL: Only parse nametag No 3 (not No 4) in Uniform No 3 category
          if ((type.includes("nametag no 3") || type.includes("name tag no 3")) && !type.includes("no 4")) {
            uniformNo3.nametag = item.notes || "";
          }
          uniformNo3.items.push({ type: item.type, size, notes: item.notes });
        } else {
          // Accessories (no size or null size)
          // Handle both old category ("Uniform No 3" with accessories) and new category ("Accessories No 3")
          uniformNo3.accessories.push(item.type);
          if (type.includes("apulet")) uniformNo3.apulet = true;
          if (type.includes("integrity badge")) uniformNo3.integrityBadge = true;
          if (type.includes("shoulder badge")) uniformNo3.shoulderBadge = true;
          if (type.includes("cel bar")) uniformNo3.celBar = true;
          if (type.includes("beret logo pin")) uniformNo3.beretLogoPin = true;
          if (type.includes("belt no 3")) uniformNo3.beltNo3 = true;
          // CRITICAL: Only parse nametag No 3 (not No 4) in Accessories No 3 category
          if ((type.includes("nametag no 3") || type.includes("name tag no 3") || 
               (type.includes("nametag") && category.includes("accessories no 3"))) && 
              !type.includes("no 4") && !hasSize) {
            uniformNo3.nametag = item.notes || "";
          }
        }
      } else if (category.includes("uniform no 4") || category.includes("accessories no 4")) {
        if (hasSize) {
          // Items with sizes - handle both old and new type names
          // Merged: "Cloth No 4", "Pants No 4", and "Uniform No 4" all represent the same item
          if ((type.includes("cloth") || type.includes("pants") || type.includes("uniform no 4")) && !type.includes("accessories")) {
            uniformNo4.cloth = size; // Use cloth field to store the size (since they come as a pair)
            uniformNo4.pants = size; // Also set pants to the same size
          }
          if (type.includes("boot")) uniformNo4.boot = size;
          // Nametag should NOT be in hasSize block - it's an accessory
          uniformNo4.items.push({ type: item.type, size, notes: item.notes });
        } else {
          // Accessories (no size or null size)
          // Handle both old category ("Uniform No 4" with accessories) and new category ("Accessories No 4")
          uniformNo4.accessories.push(item.type);
          if (type.includes("apm tag")) uniformNo4.apmTag = true;
          if (type.includes("belt no 4")) uniformNo4.beltNo4 = true;
          // CRITICAL: Only parse nametag No 4 (not No 3) in Accessories No 4 category
          if ((type.includes("nametag no 4") || type.includes("name tag no 4") || 
               (type.includes("nametag") && category.includes("accessories no 4"))) && 
              !type.includes("no 3")) {
            uniformNo4.nametag = item.notes || "";
          }
          // Add all accessories to items array so they show up in the table
          uniformNo4.items.push({ type: item.type, size: null, notes: item.notes, status: item.status });
        }
      } else if (category.includes("t-shirt") || category.includes("tshirt") || category === "shirt") {
        if (hasSize) {
          if (type.includes("digital")) tShirt.digital = size;
          if (type.includes("inner apm")) tShirt.innerApm = size;
          if (type.includes("company")) tShirt.company = size;
          tShirt.items.push({ type: item.type, size });
        }
      }
    });

    return { uniformNo3, uniformNo4, tShirt };
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-lg text-gray-600">Loading members...</div>
      </div>
    );
  }

  // Calculate total visible members
  const totalVisibleMembers = Object.values(filteredMembersByBatch).reduce(
    (sum, batchMembers) => sum + batchMembers.length,
    0
  );

  const toggleBatch = (batch: string) => {
    const newExpanded = new Set(expandedBatches);
    if (newExpanded.has(batch)) {
      newExpanded.delete(batch);
    } else {
      newExpanded.add(batch);
    }
    setExpandedBatches(newExpanded);
  };

  const handleDownloadProfile = (batch: string, batchMembers: MemberWithData[]) => {
    try {
      // Prepare profile data for Excel
      const profileData = batchMembers.map((member) => ({
        "SISPA ID": member.profile.sispaId || "N/A",
        "Name": member.profile.name || "N/A",
        "Email": member.profile.email || "N/A",
        "Batch": member.profile.batch || "N/A",
        "Gender": member.profile.gender || "Not set",
        "Matric Number": member.profile.matricNumber || "N/A",
        "Phone Number": member.profile.phoneNumber || "N/A",
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(profileData);

      // Set column widths
      ws["!cols"] = [
        { wch: 15 }, // SISPA ID
        { wch: 25 }, // Name
        { wch: 30 }, // Email
        { wch: 15 }, // Batch
        { wch: 10 }, // Gender
        { wch: 15 }, // Matric Number
        { wch: 15 }, // Phone Number
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Members");

      // Generate filename
      const date = new Date().toISOString().split("T")[0];
      const batchSlug = batch.replace(/\s+/g, "_");
      const filename = `Member_Profile_${batchSlug}_${date}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);

      Swal.fire({
        icon: "success",
        title: "Download Complete!",
        text: `Successfully downloaded profile data for ${batchMembers.length} member(s) from ${batch}.`,
        confirmButtonColor: "#1d4ed8",
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (error: any) {
      console.error("Error downloading profile data:", error);
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: error.message || "An error occurred while downloading the file.",
        confirmButtonColor: "#1d4ed8",
      });
    }
  };

  const handleDownloadUniform = (batch: string, batchMembers: MemberWithData[]) => {
    try {
      // Get all item types (columns) - same as table display when no category selected
      const allCategoryItems = [
        ...getCategoryItems("Uniform No 3"),
        ...getCategoryItems("Uniform No 4"),
        ...getCategoryItems("Accessories No 3"),
        ...getCategoryItems("Accessories No 4"),
        ...getCategoryItems("Shirt"),
      ];
      // Remove duplicates while preserving order
      const uniqueItems = Array.from(new Set(allCategoryItems));

      // Helper function to normalize type names for matching (same as table display)
      const normalizeTypeForMatch = (type: string): string => {
        const typeLower = type.toLowerCase().trim();
        if (typeLower.includes("uniform no 3 male") || typeLower.includes("cloth no 3")) return "Uniform No 3 Male";
        if (typeLower.includes("uniform no 3 female") || typeLower.includes("pants no 3")) return "Uniform No 3 Female";
        if (typeLower.includes("uniform no 4") && !typeLower.includes("accessories")) {
          if (typeLower.includes("cloth") || typeLower.includes("pants")) return "Uniform No 4";
          if (typeLower === "uniform no 4") return "Uniform No 4";
        }
        if (typeLower.includes("pvc shoes") || typeLower === "pvc shoes") return "PVC Shoes";
        if (typeLower === "beret" || typeLower.includes("beret")) {
          if (typeLower.includes("logo pin") || typeLower.includes("pin")) return "Beret Logo Pin";
          return "Beret";
        }
        if (typeLower.includes("boot") || typeLower === "boot") return "Boot";
        if (typeLower.includes("apulet") || typeLower === "apulet") return "Apulet";
        if (typeLower.includes("integrity badge")) return "Integrity Badge";
        if (typeLower.includes("shoulder badge")) return "Shoulder Badge";
        if (typeLower.includes("cel bar")) return "Cel Bar";
        if (typeLower.includes("belt no 3")) return "Belt No 3";
        if (typeLower.includes("belt no 4")) return "Belt No 4";
        if (typeLower.includes("apm tag")) return "APM Tag";
        if (typeLower.includes("nametag") || typeLower.includes("name tag")) return "Nametag";
        if (typeLower.includes("digital shirt")) return "Digital Shirt";
        if (typeLower.includes("company shirt")) return "Company Shirt";
        if (typeLower.includes("inner apm shirt")) return "Inner APM Shirt";
        return type;
      };

      // Helper function to format dates
      const formatDate = (dateString?: string) => {
        if (!dateString) return "-";
        try {
          const date = new Date(dateString);
          return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch {
          return dateString;
        }
      };

      // Helper function to display size (same as table)
      const displaySize = (item: UniformItem) => {
        if (!item.size || item.size === null || item.size === undefined || item.size === "" || item.size === "N/A") {
          return "N/A";
        }
        if (item.type === "PVC Shoes" || item.type === "Boot") {
          return item.size.startsWith("UK ") ? item.size : `UK ${item.size}`;
        }
        return item.size;
      };

      // Prepare data - one row per member, with columns for each item type
      type UniformRow = Record<string, string | number>;
      const allRows: UniformRow[] = [];

      batchMembers.forEach((member) => {
        const memberId = member.profile.sispaId || "N/A";
        const memberName = member.profile.name || "N/A";

        // Start with SISPA ID and Name
        const row: UniformRow = {
          "SISPA ID": memberId,
          "Name": memberName,
        };

        // Get all uniform items for this member
        const allUniformItems = member.uniform ? member.uniform.items : [];
        
        // Create a map of items by normalized type
        const itemsByType = new Map<string, UniformItem>();
        allUniformItems.forEach(item => {
          const normalizedType = normalizeTypeForMatch(item.type);
          // For nametag, we need to handle both No 3 and No 4
          if (normalizedType === "Nametag") {
            const category = item.category?.toLowerCase() || "";
            if (category.includes("accessories no 3")) {
              itemsByType.set("Nametag (No 3)", item);
            } else if (category.includes("accessories no 4")) {
              itemsByType.set("Nametag (No 4)", item);
            } else {
              itemsByType.set("Nametag", item);
            }
          } else {
            itemsByType.set(normalizedType, item);
          }
        });

        // For each item type column, add the data
        uniqueItems.forEach((itemType) => {
          // Handle nametag specially - check both No 3 and No 4
          let item: UniformItem | undefined;
          
          if (itemType === "Nametag") {
            // Try to find nametag (could be No 3 or No 4)
            item = itemsByType.get("Nametag") || 
                   itemsByType.get("Nametag (No 3)") || 
                   itemsByType.get("Nametag (No 4)");
          } else {
            item = itemsByType.get(itemType);
          }

          if (!item) {
            // No item of this type - set to N/A
            row[itemType] = "N/A";
          } else {
            // Format: "Size | Status | Date" or "Size\nStatus\nDate"
            const size = displaySize(item);
            const status = item.status || "Not Available";
            const missingCount = status === "Missing" && item.missingCount !== undefined && item.missingCount > 0
              ? ` (${item.missingCount})`
              : "";
            const statusText = `${status}${missingCount}`;
            const date = status === "Available" && item.receivedDate
              ? formatDate(item.receivedDate)
              : status === "Available" 
                ? formatDate(new Date().toISOString())
                : "-";
            
            // Combine size, status, and date - format like table display
            // Option 1: Single line with separators
            // row[itemType] = `${size} | ${statusText} | ${date}`;
            
            // Option 2: Multi-line (Excel will show as wrapped text)
            row[itemType] = `${size}\n${statusText}\n${date}`;
          }
        });

        allRows.push(row);
      });

      // Create workbook with single sheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(allRows);

      // Set column widths
      const colWidths: { wch: number }[] = [
        { wch: 15 }, // SISPA ID
        { wch: 25 }, // Name
      ];
      // Add width for each item type column
      uniqueItems.forEach(() => {
        colWidths.push({ wch: 20 }); // Each item type column
      });
      ws["!cols"] = colWidths;

      // Enable text wrapping for item type columns
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) continue;
          if (C >= 2) { // Item type columns (starting from column C, index 2)
            ws[cellAddress].s = {
              alignment: { wrapText: true, vertical: 'top' },
            };
          }
        }
      }

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Member Uniform Data");

      // Generate filename
      const date = new Date().toISOString().split("T")[0];
      const batchSlug = batch.replace(/\s+/g, "_");
      const filename = `Member_Uniform_${batchSlug}_${date}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);

      Swal.fire({
        icon: "success",
        title: "Download Complete!",
        text: `Successfully downloaded uniform data for ${batchMembers.length} member(s) from ${batch}.`,
        confirmButtonColor: "#1d4ed8",
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (error: any) {
      console.error("Error downloading uniform data:", error);
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: error.message || "An error occurred while downloading the file.",
        confirmButtonColor: "#1d4ed8",
      });
    }
  };

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 drop-shadow-md" style={{ textShadow: '0 2px 4px rgba(255,255,255,0.8)' }}>Member Management</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Total Members: {totalVisibleMembers}
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchAllMembers();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh member list"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, SISPA ID, email, or batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* View Mode Buttons */}
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex gap-3">
          <button
            onClick={() => {
              setViewMode("profile");
              setSelectedUniformCategory(""); // Reset category when switching to profile
            }}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              viewMode === "profile"
                ? "bg-blue-700 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setViewMode("uniform")}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              viewMode === "uniform"
                ? "bg-blue-700 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Uniform Information
          </button>
        </div>


        {/* Uniform Category Buttons - Only visible when uniform view is active */}
        {viewMode === "uniform" && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedUniformCategory("Uniform No 3")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedUniformCategory === "Uniform No 3"
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Uniform No 3
            </button>
            <button
              onClick={() => setSelectedUniformCategory("Uniform No 4")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedUniformCategory === "Uniform No 4"
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Uniform No 4
            </button>
            <button
              onClick={() => setSelectedUniformCategory("Accessories No 3")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedUniformCategory === "Accessories No 3"
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Accessories No 3
            </button>
            <button
              onClick={() => setSelectedUniformCategory("Accessories No 4")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedUniformCategory === "Accessories No 4"
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Accessories No 4
            </button>
            <button
              onClick={() => setSelectedUniformCategory("Shirt")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedUniformCategory === "Shirt"
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Shirt
            </button>
          </div>
        )}
      </div>

      {/* Grouped by Batch with Dropdown */}
      {Object.keys(filteredMembersByBatch).length === 0 ? (
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md border-2 border-orange-300 p-8 text-center text-gray-500">
          {searchTerm ? "No members found matching your search." : "No members found."}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(filteredMembersByBatch)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([batch, batchMembers]) => (
              <div
                key={batch}
                className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md border-2 border-orange-300 overflow-hidden"
              >
                {/* Batch Header with Dropdown and Download Buttons */}
                <div className="flex items-center justify-between p-4 bg-blue-50/80 border-b-2 border-orange-200">
                  <button
                    onClick={() => toggleBatch(batch)}
                    className="flex-1 flex items-center justify-between hover:bg-blue-100 transition rounded px-2 py-1 -mx-2 -my-1"
                  >
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-gray-900">{batch}</h2>
                      <span className="text-sm text-gray-600">
                        ({batchMembers.length} {batchMembers.length === 1 ? "member" : "members"})
                      </span>
                    </div>
                    {expandedBatches.has(batch) ? (
                      <ChevronUpIcon className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                  
                  {/* Download Buttons - Show based on view mode */}
                  <div className="flex items-center gap-2 ml-4">
                    {viewMode === "profile" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadProfile(batch, batchMembers);
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
                        title="Download Profile Data"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Profile
                      </button>
                    )}
                    {viewMode === "uniform" && !selectedUniformCategory && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadUniform(batch, batchMembers);
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition border-2 border-orange-400/50 hover:border-orange-500"
                        title="Download Uniform Data"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Uniform
                      </button>
                    )}
                  </div>
                </div>

                {/* Batch Members Table */}
                {expandedBatches.has(batch) && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-2 border-orange-300 rounded-lg overflow-hidden">
                      <thead className="bg-gray-100 border-b-2 border-orange-300">
                        <tr>
                          {viewMode === "profile" ? (
                            <>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b-2 border-orange-300">Picture</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b-2 border-orange-300">SISPA ID</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b-2 border-orange-300">Name</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b-2 border-orange-300">Email</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b-2 border-orange-300">Gender</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b-2 border-orange-300">Matric Number</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b-2 border-orange-300">Phone</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b-2 border-orange-300">Action</th>
                            </>
                          ) : (
                            <>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b-2 border-orange-300">SISPA ID</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b-2 border-orange-300">Name</th>
                              {(() => {
                                // Show predefined items for selected category (matching user uniform structure)
                                if (selectedUniformCategory) {
                                  const categoryItems = getCategoryItems(selectedUniformCategory);
                                  return categoryItems.map((itemType) => (
                                    <th key={itemType} className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b-2 border-orange-300">
                                      {itemType}
                                    </th>
                                  ));
                                } else {
                                  // If no category selected, show all items from all categories
                                  // Remove duplicates (e.g., "Nametag" appears in both Accessories No 3 and No 4)
                                  const allCategoryItems = [
                                    ...getCategoryItems("Uniform No 3"),
                                    ...getCategoryItems("Uniform No 4"),
                                    ...getCategoryItems("Accessories No 3"),
                                    ...getCategoryItems("Accessories No 4"),
                                    ...getCategoryItems("Shirt"),
                                  ];
                                  // Remove duplicates while preserving order
                                  let uniqueItems = Array.from(new Set(allCategoryItems));
                                  // CRITICAL: Sort all items using display order function to ensure consistent ordering
                                  uniqueItems.sort((a, b) => {
                                    const orderA = getItemDisplayOrder(a);
                                    const orderB = getItemDisplayOrder(b);
                                    return orderA - orderB;
                                  });
                                  return uniqueItems.map((itemType) => (
                                    <th key={itemType} className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b-2 border-orange-300">
                                      {itemType}
                                    </th>
                                  ));
                                }
                              })()}
                              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b-2 border-orange-300">Action</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {[...batchMembers]
                          .sort((a, b) => {
                            // Sort by SISPA ID (alphabetically/numerically)
                            const sispaIdA = a.profile.sispaId || "";
                            const sispaIdB = b.profile.sispaId || "";
                            return sispaIdA.localeCompare(sispaIdB, undefined, { numeric: true, sensitivity: 'base' });
                          })
                          .flatMap((member) => {
                          const uniformData = member.uniform ? parseUniformData(member.uniform.items) : null;
                          
                          // Filter uniform items by selected category
                          let allUniformItems = member.uniform ? member.uniform.items : [];
                          
                          if (viewMode === "uniform" && selectedUniformCategory) {
                            allUniformItems = allUniformItems.filter((item) => {
                              const itemCategory = getItemCategory(item);
                              return itemCategory === selectedUniformCategory;
                            });
                          }
                          
                          if (viewMode === "profile") {
                            return [
                              <tr key={member.profile.sispaId} className="border-b border-orange-100 hover:bg-orange-50/30">
                                <td className="px-4 py-3">
                                  <div className="relative group">
                                    <label 
                                      htmlFor={`profile-picture-${member.profile.sispaId}`}
                                      className="cursor-pointer block"
                                    >
                                      {member.profile.profilePicture ? (
                                        <img
                                          src={member.profile.profilePicture}
                                          alt={`${member.profile.name}'s profile picture`}
                                          className="w-12 h-12 rounded-full object-cover border-2 border-orange-300 hover:border-blue-500 transition"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = "none";
                                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                                          }}
                                        />
                                      ) : (
                                        <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-orange-300 flex items-center justify-center hover:border-blue-500 transition cursor-pointer">
                                          <span className="text-gray-400 text-xs">Click to Upload</span>
                                        </div>
                                      )}
                                    </label>
                                    <input
                                      type="file"
                                      id={`profile-picture-${member.profile.sispaId}`}
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => handleProfilePictureUpload(e, member.profile.sispaId)}
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">{member.profile.sispaId}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{member.profile.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{member.profile.email}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{member.profile.gender || "Not set"}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{member.profile.matricNumber || "N/A"}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{member.profile.phoneNumber || "N/A"}</td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => handleDeleteMember(member.profile.sispaId, member.profile.name)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                                    title="Delete member"
                                  >
                                    <TrashIcon className="w-5 h-5" />
                                  </button>
                                </td>
                              </tr>
                            ];
                          }

                          // For uniform view, create one row per member with columns for each item type
                          // Use predefined category items (matching user uniform structure)
                          const categoryItems = selectedUniformCategory 
                            ? getCategoryItems(selectedUniformCategory)
                            : (() => {
                                // If no category selected, show all items from all categories
                                // Remove duplicates (e.g., "Nametag" appears in both Accessories No 3 and No 4)
                                const allItems = [
                                  ...getCategoryItems("Uniform No 3"),
                                  ...getCategoryItems("Uniform No 4"),
                                  ...getCategoryItems("Accessories No 3"),
                                  ...getCategoryItems("Accessories No 4"),
                                  ...getCategoryItems("Shirt"),
                                ];
                                // Remove duplicates while preserving order
                                let uniqueItems = Array.from(new Set(allItems));
                                
                                // CRITICAL: Sort all items using display order function to ensure consistent ordering
                                uniqueItems.sort((a, b) => {
                                  const orderA = getItemDisplayOrder(a);
                                  const orderB = getItemDisplayOrder(b);
                                  return orderA - orderB;
                                });
                                
                                return uniqueItems;
                              })();

                          const displaySize = (item: any) => {
                            // Handle null, undefined, empty string, or "N/A" - accessories don't have sizes
                            if (!item.size || item.size === null || item.size === undefined || item.size === "" || item.size === "N/A") return "N/A";
                            // For shoes/boots, add UK prefix
                            if (item.type === "PVC Shoes" || item.type === "Boot") {
                              return item.size.startsWith("UK ") ? item.size : `UK ${item.size}`;
                            }
                            return item.size;
                          };

                          const formatDate = (dateString?: string) => {
                            // Always use current date if item exists and is available
                            // Otherwise use receivedDate if available
                            if (dateString) {
                              try {
                                const date = new Date(dateString);
                                return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                              } catch {
                                return dateString;
                              }
                            }
                            // If item exists but no date, use current date
                            const now = new Date();
                            return now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                          };

                          // Create a map of items by type for quick lookup
                          // Normalize type names for matching
                          const normalizeTypeForMatch = (type: string): string => {
                            const typeLower = type.toLowerCase().trim();
                            // Handle common variations
                            if (typeLower.includes("uniform no 3 male") || typeLower.includes("cloth no 3")) return "Uniform No 3 Male";
                            if (typeLower.includes("uniform no 3 female") || typeLower.includes("pants no 3")) return "Uniform No 3 Female";
                            if (typeLower.includes("uniform no 4") && !typeLower.includes("accessories")) {
                              if (typeLower.includes("cloth") || typeLower.includes("pants")) return "Uniform No 4";
                              if (typeLower === "uniform no 4") return "Uniform No 4";
                            }
                            if (typeLower.includes("pvc shoes") || typeLower === "pvc shoes") return "PVC Shoes";
                            if (typeLower === "beret" || typeLower.includes("beret")) {
                              // Distinguish between Beret and Beret Logo Pin
                              if (typeLower.includes("logo pin") || typeLower.includes("pin")) return "Beret Logo Pin";
                              return "Beret";
                            }
                            if (typeLower.includes("boot") || typeLower === "boot") return "Boot";
                            if (typeLower.includes("apulet") || typeLower === "apulet") return "Apulet";
                            if (typeLower.includes("integrity badge")) return "Integrity Badge";
                            if (typeLower.includes("shoulder badge")) return "Shoulder Badge";
                            if (typeLower.includes("cel bar")) return "Cel Bar";
                            if (typeLower.includes("belt no 3")) return "Belt No 3";
                            if (typeLower.includes("belt no 4")) return "Belt No 4";
                            if (typeLower.includes("apm tag")) return "APM Tag";
                            // CRITICAL: Handle nametag by checking category to determine No 3 vs No 4
                            if (typeLower.includes("nametag") || typeLower.includes("name tag")) {
                              // Check the item's category to determine if it's No 3 or No 4
                              // This will be handled in the display logic by filtering by category
                              if (typeLower.includes("no 4") || typeLower.includes("name tag no 4")) {
                                return "Nametag";
                              } else if (typeLower.includes("no 3") || typeLower.includes("name tag no 3")) {
                                return "Nametag";
                              }
                              // For backward compatibility, check category
                              return "Nametag";
                            }
                            if (typeLower.includes("digital shirt")) return "Digital Shirt";
                            if (typeLower.includes("company shirt")) return "Company Shirt";
                            if (typeLower.includes("inner apm shirt")) return "Inner APM Shirt";
                            // Return original if no match
                            return type;
                          };

                          const itemsByType = new Map<string, UniformItem>();
                          allUniformItems.forEach(item => {
                            const normalizedType = normalizeTypeForMatch(item.type);
                            itemsByType.set(normalizedType, item);
                          });

                          return [
                            <tr key={member.profile.sispaId} className="border-b border-orange-100 hover:bg-orange-50/30">
                              <td className="px-4 py-3 text-sm text-gray-900">{member.profile.sispaId}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{member.profile.name}</td>
                              {categoryItems.map((itemType) => {
                                // CRITICAL: For nametag, filter by category to match the correct one
                                let item: UniformItem | undefined;
                                
                                if (itemType === "Nametag") {
                                  // For nametag, we need to match by both type AND category
                                  // If viewing "Accessories No 3", only match nametag from "Accessories No 3"
                                  // If viewing "Accessories No 4", only match nametag from "Accessories No 4"
                                  const expectedCategory = selectedUniformCategory === "Accessories No 3" 
                                    ? "Accessories No 3" 
                                    : selectedUniformCategory === "Accessories No 4" 
                                    ? "Accessories No 4"
                                    : null; // If no category selected, try to match by type name
                                  
                                  if (expectedCategory) {
                                    // Find nametag in the expected category
                                    item = allUniformItems.find(uniItem => {
                                      const typeLower = uniItem.type?.toLowerCase() || "";
                                      const categoryLower = uniItem.category?.toLowerCase() || "";
                                      const expectedCategoryLower = expectedCategory.toLowerCase();
                                      
                                      // Match by category first
                                      if (categoryLower !== expectedCategoryLower) return false;
                                      
                                      // Then match by type (No 3 or No 4)
                                      if (expectedCategory === "Accessories No 3") {
                                        return (typeLower.includes("nametag no 3") || 
                                                typeLower.includes("name tag no 3") ||
                                                (typeLower.includes("nametag") && !typeLower.includes("no 4")));
                                      } else if (expectedCategory === "Accessories No 4") {
                                        return (typeLower.includes("nametag no 4") || 
                                                typeLower.includes("name tag no 4") ||
                                                (typeLower.includes("nametag") && !typeLower.includes("no 3")));
                                      }
                                      return false;
                                    });
                                  } else {
                                    // No category selected - try to find any nametag (for backward compatibility)
                                    item = allUniformItems.find(uniItem => {
                                      const normalizedType = normalizeTypeForMatch(uniItem.type);
                                      return normalizedType === "Nametag";
                                    });
                                  }
                                } else {
                                  // For non-nametag items, use the existing matching logic
                                  const normalizedType = normalizeTypeForMatch(itemType);
                                  item = itemsByType.get(normalizedType);
                                  if (!item) {
                                    // Try to find by checking all items with normalized matching
                                    allUniformItems.forEach(uniItem => {
                                      if (normalizeTypeForMatch(uniItem.type) === itemType) {
                                        item = uniItem;
                                      }
                                    });
                                  }
                                }
                                
                                if (!item) {
                                  // No item of this type for this member
                                  return (
                                    <td key={itemType} className="px-4 py-3 text-center text-sm text-gray-400">
                                      N/A
                                    </td>
                                  );
                                }

                                const itemStatus = item.status || "Not Available";
                                const itemDate = item.receivedDate || (itemStatus === "Available" ? new Date().toISOString() : undefined);
                                
                                // Get missing count - check multiple possible field names
                                // Backend might send missingCount (camelCase) or missing_count (snake_case)
                                const missingCount = item.missingCount !== undefined && item.missingCount !== null 
                                  ? item.missingCount 
                                  : (item as any).missing_count !== undefined && (item as any).missing_count !== null
                                  ? (item as any).missing_count
                                  : null;
                                
                                // Debug: Log when status is Missing to check if missingCount is present
                                // Remove this debug log after confirming backend sends missingCount
                                if (itemStatus === "Missing") {
                                  console.log(`[DEBUG] Missing item ${itemType} for ${member.profile.name}:`, {
                                    status: itemStatus,
                                    missingCount: item.missingCount,
                                    missing_count: (item as any).missing_count,
                                    hasMissingCount: missingCount !== null,
                                    fullItem: item
                                  });
                                }

                                return (
                                  <td key={itemType} className="px-4 py-3 text-center text-sm text-gray-900">
                                    <div className="space-y-1">
                                      {/* Size */}
                                      <div className="font-medium">
                                        {displaySize(item)}
                                        {item.notes && (
                                          <span className="text-gray-600 text-xs"> ({item.notes})</span>
                                        )}
                                      </div>
                                      {/* Status */}
                                      <div>
                                        <span className={`text-xs font-medium px-2 py-1 rounded inline-block ${
                                          itemStatus === "Available" 
                                            ? "bg-green-100 text-green-800" 
                                            : itemStatus === "Missing"
                                              ? "bg-red-100 text-red-800"
                                              : "bg-yellow-100 text-yellow-800"
                                        }`}>
                                          {itemStatus}
                                          {/* Show missing count if status is Missing and count exists */}
                                          {itemStatus === "Missing" && missingCount !== null && missingCount !== undefined && missingCount > 0 && (
                                            <span className="ml-1 font-bold">({missingCount})</span>
                                          )}
                                        </span>
                                      </div>
                                      {/* Date */}
                                      <div className="text-xs text-gray-600">
                                        {itemDate ? formatDate(itemDate) : "-"}
                                      </div>
                                    </div>
                                  </td>
                                );
                              })}
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleDeleteMember(member.profile.sispaId, member.profile.name)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                                  title="Delete member"
                                >
                                  <TrashIcon className="w-5 h-5" />
                                </button>
                              </td>
                            </tr>
                          ];

                          // No uniform items - still show row but with N/A in all item columns
                          // Use predefined category items
                          const categoryItemsNoData = selectedUniformCategory 
                            ? getCategoryItems(selectedUniformCategory)
                            : (() => {
                                // Remove duplicates (e.g., "Nametag" appears in both Accessories No 3 and No 4)
                                const allItems = [
                                  ...getCategoryItems("Uniform No 3"),
                                  ...getCategoryItems("Uniform No 4"),
                                  ...getCategoryItems("Accessories No 3"),
                                  ...getCategoryItems("Accessories No 4"),
                                  ...getCategoryItems("Shirt"),
                                ];
                                // Remove duplicates while preserving order
                                return Array.from(new Set(allItems));
                              })();

                          return [
                            <tr key={member.profile.sispaId} className="border-b border-orange-100 hover:bg-orange-50/30">
                              <td className="px-4 py-3 text-sm text-gray-900">{member.profile.sispaId}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{member.profile.name}</td>
                              {categoryItemsNoData.length > 0 ? (
                                categoryItemsNoData.map((itemType) => (
                                  <td key={itemType} className="px-4 py-3 text-center text-sm text-gray-400">
                                    N/A
                                  </td>
                                ))
                              ) : (
                                <td className="px-4 py-3 text-sm text-gray-400" colSpan={1}>
                                  {selectedUniformCategory 
                                    ? `No ${selectedUniformCategory} data` 
                                    : "No uniform data"}
                                </td>
                              )}
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleDeleteMember(member.profile.sispaId, member.profile.name)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                                  title="Delete member"
                                >
                                  <TrashIcon className="w-5 h-5" />
                                </button>
                              </td>
                            </tr>
                          ];
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
