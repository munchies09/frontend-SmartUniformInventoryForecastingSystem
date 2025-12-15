"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Swal from "sweetalert2";
import { PencilIcon } from "@heroicons/react/24/outline";

interface UniformNo3Data {
  clothNo3: string; // XS - 3XL
  pantsNo3: string; // XS - 3XL
  pvcShoes: string; // UK 4-12
  beret: string; // Specific sizes
  nametag: string; // Text input
  accessories: {
    apulet: boolean;
    integrityBadge: boolean;
    goldBadge: boolean;
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

export default function UniformPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uniformNo3, setUniformNo3] = useState<UniformNo3Data | null>(null);
  const [uniformNo4, setUniformNo4] = useState<UniformNo4Data | null>(null);
  const [tShirt, setTShirt] = useState<TShirtData | null>(null);
  const [showUniformNo3Modal, setShowUniformNo3Modal] = useState(false);
  const [showUniformNo4Modal, setShowUniformNo4Modal] = useState(false);
  const [showTShirtModal, setShowTShirtModal] = useState(false);
  
  const [formDataNo3, setFormDataNo3] = useState<UniformNo3Data>({
    clothNo3: "",
    pantsNo3: "",
    pvcShoes: "",
    beret: "",
    nametag: "",
    accessories: {
      apulet: false,
      integrityBadge: false,
      goldBadge: false,
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

  useEffect(() => {
    fetchUniform();
  }, [user]);

  const fetchUniform = async () => {
    if (!user?.sispaId || user.sispaId.trim() === '') {
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const url = 'http://localhost:5000/api/members/uniform';
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const contentType = res.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        console.error("Non-JSON response received");
        setLoading(false);
        return;
      }
      
      if (data.success && data.uniform && data.uniform.items) {
        const items = data.uniform.items || [];
        const uniformNo3Data = parseUniformNo3FromItems(items);
        const uniformNo4Data = parseUniformNo4FromItems(items);
        const tShirtData = parseTShirtFromItems(items);
        
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
        goldBadge: false,
        celBar: false,
        beretLogoPin: false,
        beltNo3: false,
      },
    };

    items.forEach((item: any) => {
      const category = item.category?.toLowerCase() || "";
      const type = item.type?.toLowerCase() || "";
      const size = item.size || "";

      if (category === "uniform no 3") {
        if (type === "cloth no 3") data.clothNo3 = size;
        if (type === "pants no 3") data.pantsNo3 = size;
        if (type === "pvc shoes") data.pvcShoes = size.replace("UK ", "");
        if (type === "beret") data.beret = size;
        if (type === "nametag") data.nametag = item.notes || "";
        if (type === "apulet" || type === "aplet") data.accessories!.apulet = true;
        if (type === "integrity badge") data.accessories!.integrityBadge = true;
        if (type === "gold badge") data.accessories!.goldBadge = true;
        if (type === "cel bar") data.accessories!.celBar = true;
        if (type === "beret logo pin") data.accessories!.beretLogoPin = true;
        if (type === "belt no 3") data.accessories!.beltNo3 = true;
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

      if (category === "uniform no 4") {
        if (type === "cloth no 4") data.clothNo4 = size;
        if (type === "pants no 4") data.pantsNo4 = size;
        if (type === "boot") data.boot = size.replace("UK ", "");
        if (type === "nametag") data.nametag = item.notes || "";
        if (type === "apm tag") data.accessories!.apmTag = true;
        if (type === "belt no 4") data.accessories!.beltNo4 = true;
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

      if (category === "t-shirt" || category === "tshirt") {
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
      items.push({ category: "Uniform No 3", type: "Cloth No 3", size: data.clothNo3, quantity: 1 });
    }
    if (data.pantsNo3) {
      items.push({ category: "Uniform No 3", type: "Pants No 3", size: data.pantsNo3, quantity: 1 });
    }
    if (data.pvcShoes) {
      items.push({ category: "Uniform No 3", type: "PVC Shoes", size: `UK ${data.pvcShoes}`, quantity: 1 });
    }
    if (data.beret) {
      items.push({ category: "Uniform No 3", type: "Beret", size: data.beret, quantity: 1 });
    }
    if (data.nametag) {
      items.push({ category: "Uniform No 3", type: "Nametag", size: "N/A", quantity: 1, notes: data.nametag });
    }
    if (data.accessories.apulet) items.push({ category: "Uniform No 3", type: "Apulet", size: "N/A", quantity: 1 });
    if (data.accessories.integrityBadge) items.push({ category: "Uniform No 3", type: "Integrity Badge", size: "N/A", quantity: 1 });
    if (data.accessories.goldBadge) items.push({ category: "Uniform No 3", type: "Gold Badge", size: "N/A", quantity: 1 });
    if (data.accessories.celBar) items.push({ category: "Uniform No 3", type: "Cel Bar", size: "N/A", quantity: 1 });
    if (data.accessories.beretLogoPin) items.push({ category: "Uniform No 3", type: "Beret Logo Pin", size: "N/A", quantity: 1 });
    if (data.accessories.beltNo3) items.push({ category: "Uniform No 3", type: "Belt No 3", size: "N/A", quantity: 1 });
    return items;
  };

  const convertNo4ToBackendItems = (data: UniformNo4Data): any[] => {
    const items: any[] = [];
    if (data.clothNo4) {
      items.push({ category: "Uniform No 4", type: "Cloth No 4", size: data.clothNo4, quantity: 1 });
    }
    if (data.pantsNo4) {
      items.push({ category: "Uniform No 4", type: "Pants No 4", size: data.pantsNo4, quantity: 1 });
    }
    if (data.boot) {
      items.push({ category: "Uniform No 4", type: "Boot", size: `UK ${data.boot}`, quantity: 1 });
    }
    if (data.nametag) {
      items.push({ category: "Uniform No 4", type: "Nametag", size: "N/A", quantity: 1, notes: data.nametag });
    }
    if (data.accessories.apmTag) items.push({ category: "Uniform No 4", type: "APM Tag", size: "N/A", quantity: 1 });
    if (data.accessories.beltNo4) items.push({ category: "Uniform No 4", type: "Belt No 4", size: "N/A", quantity: 1 });
    return items;
  };

  const convertTShirtToBackendItems = (data: TShirtData): any[] => {
    const items: any[] = [];
    if (data.digitalShirt) {
      items.push({ category: "T-Shirt", type: "Digital Shirt", size: data.digitalShirt, quantity: 1 });
    }
    if (data.innerApmShirt) {
      items.push({ category: "T-Shirt", type: "Inner APM Shirt", size: data.innerApmShirt, quantity: 1 });
    }
    if (data.companyShirt) {
      items.push({ category: "T-Shirt", type: "Company Shirt", size: data.companyShirt, quantity: 1 });
    }
    return items;
  };

  // Submit handlers
  const handleSubmitUniform = async (
    itemsToSend: any[],
    uniformType: string,
    hasExisting: boolean,
    categoryToUpdate?: string // Category being updated (e.g., "Uniform No 3", "Uniform No 4", "T-Shirt")
  ) => {
    if (!user?.sispaId || user.sispaId.trim() === '') {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "User information not found. Please login again.",
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
      const url = 'http://localhost:5000/api/members/uniform';

      // If updating (PUT), we need to merge with existing items from other categories
      let finalItemsToSend = itemsToSend;
      
      if (hasExisting && categoryToUpdate) {
        // Fetch existing uniform data first
        try {
          const existingRes = await fetch(url, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (existingRes.ok) {
            const existingData = await existingRes.json();
            if (existingData.success && existingData.uniform && existingData.uniform.items) {
              const existingItems = existingData.uniform.items || [];
              
              // Filter out items from the category being updated
              const otherCategoryItems = existingItems.filter((item: any) => {
                const itemCategory = item.category?.toLowerCase() || "";
                const updateCategory = categoryToUpdate.toLowerCase();
                return itemCategory !== updateCategory;
              });
              
              // Merge: keep items from other categories + add new items from this category
              finalItemsToSend = [...otherCategoryItems, ...itemsToSend];
              
              console.log(`Merging uniforms: Keeping ${otherCategoryItems.length} items from other categories, adding ${itemsToSend.length} items for ${categoryToUpdate}`);
            }
          }
        } catch (fetchError) {
          console.error("Error fetching existing uniforms for merge:", fetchError);
          // Continue with just the new items if fetch fails
        }
      }

      // Always use PUT when we have existing data (to replace all items with merged data)
      // Use POST only when there's no existing data at all
      const method = hasExisting ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: finalItemsToSend }),
      });

      const contentType = res.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch (parseError) {
          Swal.fire({
            icon: "error",
            title: "Server Error",
            text: `Invalid JSON response: ${res.status} ${res.statusText}`,
            confirmButtonColor: "#1d4ed8",
          });
          return;
        }
      } else {
        const text = await res.text();
        Swal.fire({
          icon: "error",
          title: "Server Error",
          text: text || `HTTP ${res.status}: ${res.statusText}`,
          confirmButtonColor: "#1d4ed8",
        });
        return;
      }

      if (data.success) {
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

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Uniform</h1>
        <p className="text-gray-600 mt-2">
          Select a uniform type to add or update your uniform information
        </p>
      </div>

      {/* Display Saved Uniform Information */}
      {uniformNo3 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Uniform No 3 Information</h2>
            <button
              onClick={() => {
                setFormDataNo3(uniformNo3);
                setShowUniformNo3Modal(true);
              }}
              className="flex items-center gap-2 text-blue-700 hover:text-blue-800"
            >
              <PencilIcon className="w-5 h-5" />
              Edit
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniformNo3.clothNo3 && (
              <div>
                <p className="text-sm text-gray-600">Cloth No 3</p>
                <p className="text-lg font-semibold text-gray-900">{uniformNo3.clothNo3}</p>
              </div>
            )}
            {uniformNo3.pantsNo3 && (
              <div>
                <p className="text-sm text-gray-600">Pants No 3</p>
                <p className="text-lg font-semibold text-gray-900">{uniformNo3.pantsNo3}</p>
              </div>
            )}
            {uniformNo3.pvcShoes && (
              <div>
                <p className="text-sm text-gray-600">PVC Shoes</p>
                <p className="text-lg font-semibold text-gray-900">UK {uniformNo3.pvcShoes}</p>
              </div>
            )}
            {uniformNo3.beret && (
              <div>
                <p className="text-sm text-gray-600">Beret</p>
                <p className="text-lg font-semibold text-gray-900">{uniformNo3.beret}</p>
              </div>
            )}
            {uniformNo3.nametag && (
              <div>
                <p className="text-sm text-gray-600">Nametag</p>
                <p className="text-lg font-semibold text-gray-900">{uniformNo3.nametag}</p>
              </div>
            )}
            {(uniformNo3.accessories.apulet ||
              uniformNo3.accessories.integrityBadge ||
              uniformNo3.accessories.goldBadge ||
              uniformNo3.accessories.celBar ||
              uniformNo3.accessories.beretLogoPin ||
              uniformNo3.accessories.beltNo3) && (
              <div className="md:col-span-2 lg:col-span-3">
                <p className="text-sm text-gray-600 mb-2">Accessories</p>
                <div className="flex flex-wrap gap-2">
                  {uniformNo3.accessories.apulet && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">Apulet</span>
                  )}
                  {uniformNo3.accessories.integrityBadge && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">Integrity Badge</span>
                  )}
                  {uniformNo3.accessories.goldBadge && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">Gold Badge</span>
                  )}
                  {uniformNo3.accessories.celBar && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">Cel Bar</span>
                  )}
                  {uniformNo3.accessories.beretLogoPin && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">Beret Logo Pin</span>
                  )}
                  {uniformNo3.accessories.beltNo3 && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">Belt No 3</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {uniformNo4 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Uniform No 4 Information</h2>
            <button
              onClick={() => {
                setFormDataNo4(uniformNo4);
                setShowUniformNo4Modal(true);
              }}
              className="flex items-center gap-2 text-blue-700 hover:text-blue-800"
            >
              <PencilIcon className="w-5 h-5" />
              Edit
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniformNo4.clothNo4 && (
              <div>
                <p className="text-sm text-gray-600">Cloth No 4</p>
                <p className="text-lg font-semibold text-gray-900">{uniformNo4.clothNo4}</p>
              </div>
            )}
            {uniformNo4.pantsNo4 && (
              <div>
                <p className="text-sm text-gray-600">Pants No 4</p>
                <p className="text-lg font-semibold text-gray-900">{uniformNo4.pantsNo4}</p>
              </div>
            )}
            {uniformNo4.boot && (
              <div>
                <p className="text-sm text-gray-600">Boot</p>
                <p className="text-lg font-semibold text-gray-900">UK {uniformNo4.boot}</p>
              </div>
            )}
            {uniformNo4.nametag && (
              <div>
                <p className="text-sm text-gray-600">Nametag</p>
                <p className="text-lg font-semibold text-gray-900">{uniformNo4.nametag}</p>
              </div>
            )}
            {(uniformNo4.accessories.apmTag || uniformNo4.accessories.beltNo4) && (
              <div className="md:col-span-2 lg:col-span-3">
                <p className="text-sm text-gray-600 mb-2">Accessories</p>
                <div className="flex flex-wrap gap-2">
                  {uniformNo4.accessories.apmTag && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">APM Tag</span>
                  )}
                  {uniformNo4.accessories.beltNo4 && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">Belt No 4</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tShirt && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">T-Shirt Information</h2>
            <button
              onClick={() => {
                setFormDataTShirt(tShirt);
                setShowTShirtModal(true);
              }}
              className="flex items-center gap-2 text-blue-700 hover:text-blue-800"
            >
              <PencilIcon className="w-5 h-5" />
              Edit
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tShirt.digitalShirt && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Digital Shirt</p>
                <p className="text-lg font-semibold text-gray-900">{tShirt.digitalShirt}</p>
              </div>
            )}
            {tShirt.innerApmShirt && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Inner APM Shirt</p>
                <p className="text-lg font-semibold text-gray-900">{tShirt.innerApmShirt}</p>
              </div>
            )}
            {tShirt.companyShirt && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Company Shirt</p>
                <p className="text-lg font-semibold text-gray-900">{tShirt.companyShirt}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Uniform Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Uniform No 3 Card */}
        <div
          onClick={() => {
            if (uniformNo3) {
              setFormDataNo3(uniformNo3);
            } else {
              setFormDataNo3({
                clothNo3: "",
                pantsNo3: "",
                pvcShoes: "",
                beret: "",
                nametag: "",
                accessories: {
                  apulet: false,
                  integrityBadge: false,
                  goldBadge: false,
                  celBar: false,
                  beretLogoPin: false,
                  beltNo3: false,
                },
              });
            }
            setShowUniformNo3Modal(true);
          }}
          className="bg-white rounded-lg shadow-md border-2 border-yellow-300 p-6 hover:shadow-lg transition cursor-pointer"
        >
          <div className="flex flex-col items-center text-center">
            <img 
              src="/no3.jpg" 
              alt="Uniform No 3" 
              className="w-32 h-32 object-contain rounded-lg mb-4" 
            />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Uniform No 3</h2>
            <p className="text-gray-600 text-sm mb-4">
              {uniformNo3 ? "Click to update" : "Click to add"}
            </p>
            {uniformNo3 && (
              <div className="w-full mt-2">
                <div className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                  ✓ Information Added
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Uniform No 4 Card */}
        <div
          onClick={() => {
            if (uniformNo4) {
              setFormDataNo4(uniformNo4);
            } else {
              setFormDataNo4({
                clothNo4: "",
                pantsNo4: "",
                boot: "",
                nametag: "",
                accessories: {
                  apmTag: false,
                  beltNo4: false,
                },
              });
            }
            setShowUniformNo4Modal(true);
          }}
          className="bg-white rounded-lg shadow-md border-2 border-yellow-300 p-6 hover:shadow-lg transition cursor-pointer"
        >
          <div className="flex flex-col items-center text-center">
            <img 
              src="/no4.png" 
              alt="Uniform No 4" 
              className="w-32 h-32 object-contain rounded-lg mb-4" 
            />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Uniform No 4</h2>
            <p className="text-gray-600 text-sm mb-4">
              {uniformNo4 ? "Click to update" : "Click to add"}
            </p>
            {uniformNo4 && (
              <div className="w-full mt-2">
                <div className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                  ✓ Information Added
                </div>
              </div>
            )}
          </div>
        </div>

        {/* T-Shirt Card */}
        <div
          onClick={() => {
            if (tShirt) {
              setFormDataTShirt(tShirt);
            } else {
              setFormDataTShirt({
                digitalShirt: "",
                innerApmShirt: "",
                companyShirt: "",
              });
            }
            setShowTShirtModal(true);
          }}
          className="bg-white rounded-lg shadow-md border-2 border-yellow-300 p-6 hover:shadow-lg transition cursor-pointer"
        >
          <div className="flex flex-col items-center text-center">
            <img 
              src="/orensispa.png" 
              alt="T-Shirt" 
              className="w-32 h-32 object-contain rounded-lg mb-4" 
            />
            <h2 className="text-xl font-bold text-gray-900 mb-2">T-Shirt</h2>
            <p className="text-gray-600 text-sm mb-4">
              {tShirt ? "Click to update" : "Click to add"}
            </p>
            {tShirt && (
              <div className="w-full mt-2">
                <div className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                  ✓ Information Added
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Uniform No 3 Modal */}
      {showUniformNo3Modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Uniform No 3</h2>
            <form onSubmit={handleSubmitUniformNo3}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cloth No 3</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pants No 3</label>
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
                    {["apulet", "integrityBadge", "goldBadge", "celBar", "beretLogoPin", "beltNo3"].map((key) => (
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
                           key === "goldBadge" ? "Gold Badge" :
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cloth No 4</label>
                  <select
                    value={formDataNo4.clothNo4}
                    onChange={(e) => setFormDataNo4({ ...formDataNo4, clothNo4: e.target.value })}
                    className="w-full border rounded-md p-2"
                  >
                    <option value="">Select Size</option>
                    {clothSizes.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pants No 4</label>
                  <select
                    value={formDataNo4.pantsNo4}
                    onChange={(e) => setFormDataNo4({ ...formDataNo4, pantsNo4: e.target.value })}
                    className="w-full border rounded-md p-2"
                  >
                    <option value="">Select Size</option>
                    {clothSizes.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
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
