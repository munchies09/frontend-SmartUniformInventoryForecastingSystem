"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import Swal from "sweetalert2";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    sispaId: "",
    fullName: "",
    batch: "",
    matricNo: "",
    email: "",
    phone: "",
    gender: "" as "Male" | "Female" | "",
  });
  const [batchNumber, setBatchNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user?.sispaId) {
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const endpoint = `${backendUrl}/api/members/profile`;
      
      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        console.log("API Response:", data); // Debug log
        if (data.success && data.member) {
          const memberData = data.member;
          console.log("Fetched profile data:", memberData); // Debug log
          console.log("Gender from API:", memberData.gender); // Debug log
          
          const batch = memberData.batch || user.batch || "";
          // Extract number from batch (e.g., "Batch 9" -> 9, "batch 8" -> 8)
          const extractedBatchNumber = batch.match(/\d+/)?.[0] ? parseInt(batch.match(/\d+/)?.[0] || "1", 10) : 1;
          
          setFormData({
            sispaId: memberData.sispaId || user.sispaId || "",
            fullName: memberData.name || user.name || "",
            batch: batch,
            matricNo: memberData.matricNumber || memberData.matricNo || user.matricNo || "",
            email: memberData.email || user.email || "",
            phone: memberData.phoneNumber || memberData.phone || user.phone || "",
            gender: memberData.gender ? (memberData.gender as "Male" | "Female") : (user.gender ? (user.gender as "Male" | "Female") : ""),
          });
          setBatchNumber(extractedBatchNumber);
          
          console.log("Set formData gender:", memberData.gender ? (memberData.gender as "Male" | "Female") : (user.gender ? (user.gender as "Male" | "Female") : "")); // Debug log
          
          if (memberData.profilePicture || user.profileImage) {
            setProfileImage(memberData.profilePicture || user.profileImage || "");
          }
        } else {
          // Fallback to user data from context
          const batch = user.batch || "";
          const extractedBatchNumber = batch.match(/\d+/)?.[0] ? parseInt(batch.match(/\d+/)?.[0] || "1", 10) : 1;
          setFormData({
            sispaId: user.sispaId || "",
            fullName: user.name || "",
            batch: batch,
            matricNo: user.matricNo || "",
            email: user.email || "",
            phone: user.phone || "",
            gender: (user.gender as "Male" | "Female") || "",
          });
          setBatchNumber(extractedBatchNumber);
          if (user.profileImage) {
            setProfileImage(user.profileImage);
          }
        }
      } else {
        // Fallback to user data from context
        const batch = user.batch || "";
        const extractedBatchNumber = batch.match(/\d+/)?.[0] ? parseInt(batch.match(/\d+/)?.[0] || "1", 10) : 1;
        setFormData({
          sispaId: user.sispaId || "",
          fullName: user.name || "",
          batch: batch,
          matricNo: user.matricNo || "",
          email: user.email || "",
          phone: user.phone || "",
          gender: (user.gender as "Male" | "Female") || "",
        });
        setKompeniNumber(batchNumber);
        if (user.profileImage) {
          setProfileImage(user.profileImage);
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      // Fallback to user data from context
      setFormData({
        sispaId: user.sispaId || "",
        fullName: user.name || "",
        batch: user.batch || "",
        matricNo: user.matricNo || "",
        email: user.email || "",
        phone: user.phone || "",
        gender: (user.gender as "Male" | "Female") || "",
      });
      if (user.profileImage) {
        setProfileImage(user.profileImage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Frontend validation to match backend requirements
    if (!formData.sispaId || formData.sispaId.trim() === '') {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "SISPA ID is required.",
        confirmButtonColor: "#1d4ed8",
      });
      setSaving(false);
      return;
    }

    if (!formData.fullName || formData.fullName.trim() === '') {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Full name is required.",
        confirmButtonColor: "#1d4ed8",
      });
      setSaving(false);
      return;
    }

        if (!formData.email || formData.email.trim() === '') {
          Swal.fire({
            icon: "error",
            title: "Validation Error",
            text: "Email is required.",
            confirmButtonColor: "#1d4ed8",
          });
          setSaving(false);
          return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          Swal.fire({
            icon: "error",
            title: "Validation Error",
            text: "Please enter a valid email address.",
            confirmButtonColor: "#1d4ed8",
          });
          setSaving(false);
          return;
        }

        if (!batchNumber || batchNumber < 1) {
          Swal.fire({
            icon: "error",
            title: "Validation Error",
            text: "Batch number is required and must be at least 1.",
            confirmButtonColor: "#1d4ed8",
          });
          setSaving(false);
          return;
        }

    // Use sispaId as primary identifier (backend now uses sispaId in route params)
    if (!user?.sispaId || user.sispaId.trim() === '') {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "User information not found. Please log in again.",
        confirmButtonColor: "#1d4ed8",
      });
      setSaving(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire({
          icon: "error",
          title: "Authentication Error",
          text: "Please log in again.",
          confirmButtonColor: "#1d4ed8",
        });
        setSaving(false);
        return;
      }

      // Backend endpoint: PUT /api/members/profile (no ID in path, uses JWT token)
      // Use absolute URL to ensure it's treated as external API call
      // IMPORTANT: Must use full URL with protocol to avoid Next.js treating it as a route
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const endpoint = `${backendUrl}/api/members/profile`;
      
      // Note: sispaId cannot be changed via updateOwnProfile, so we don't send it in payload
      // Backend expects: matricNumber, phoneNumber, profilePicture, gender (not matricNo, phone, profileImage)
      // Format batch as "Batch {number}"
      const payload = {
        name: formData.fullName.trim(),
        email: formData.email.trim(),
        batch: `Batch ${batchNumber}`,
        matricNumber: formData.matricNo?.trim() || "", // Backend expects matricNumber
        phoneNumber: formData.phone?.trim() || "", // Backend expects phoneNumber
        profilePicture: profileImage || "", // Backend expects profilePicture
        gender: formData.gender || "", // Backend expects gender
      };
      
      console.log("Updating profile:", { endpoint, payload, backendUrl }); // Debug log
      
      // Ensure we're making an external API call, not a Next.js route
      // Use window.fetch explicitly to ensure it's a browser fetch, not Next.js
      const res = await window.fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      // Read response body ONCE - check content-type first
      const contentType = res.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        // Response is JSON - read as JSON
        try {
          data = await res.json();
        } catch (parseError) {
          // If JSON parsing fails, we can't read the body again
          setSaving(false);
          console.error("JSON parse error:", parseError, "Status:", res.status);
          Swal.fire({
            icon: "error",
            title: "Server Error",
            text: `Invalid JSON response: ${res.status} ${res.statusText}`,
            confirmButtonColor: "#1d4ed8",
          });
          return;
        }
      } else {
        // Response is not JSON - read as text
        const text = await res.text();
        setSaving(false);
        console.error("Non-JSON response:", text, "Status:", res.status);
        Swal.fire({
          icon: "error",
          title: "Server Error",
          text: text || `HTTP ${res.status}: ${res.statusText}`,
          confirmButtonColor: "#1d4ed8",
        });
        return;
      }

      setSaving(false);

      // Check HTTP status first
      if (!res.ok) {
        // HTTP error (400, 401, 403, 500, etc.)
        console.error("HTTP Error:", res.status, data);
        Swal.fire({
          icon: "error",
          title: `Error ${res.status}`,
          text: data.message || data.error || `Server returned error: ${res.statusText}`,
          confirmButtonColor: "#1d4ed8",
        });
        return;
      }

      // Backend now consistently returns success: true/false
      if (data.success === true) {
        // Use backend response data (data.member) to update user state
        // Backend returns: { success: true, message: "...", member: { sispaId, name, email, batch, matricNumber, phoneNumber, profilePicture, ... } }
        const memberData = data.member || data.user || {};
        
        // Map backend field names to frontend field names
        const updatedUserData = {
          name: memberData.name || formData.fullName.trim(),
          email: memberData.email || formData.email.trim(),
          batch: memberData.batch || formData.batch.trim(),
          matricNo: memberData.matricNo || memberData.matricNumber || formData.matricNo?.trim() || "",
          phone: memberData.phone || memberData.phoneNumber || formData.phone?.trim() || "",
          profileImage: memberData.profileImage || memberData.profilePicture || profileImage || "",
          gender: memberData.gender || formData.gender || "",
        };
        
        // Update AuthContext state and localStorage
        updateUser(updatedUserData);
        
        console.log("Profile updated successfully:", updatedUserData); // Debug log
        
        // Show success message and wait for user to close it before reloading
        await Swal.fire({
          icon: "success",
          title: "Profile Updated!",
          text: data.message || "Your profile has been updated successfully.",
          confirmButtonColor: "#1d4ed8",
          timer: 3000, // Show for 3 seconds (increased from 2)
          timerProgressBar: true, // Show progress bar
          showConfirmButton: true, // Show confirm button so user can close manually
          allowOutsideClick: false, // Prevent closing by clicking outside
        });
        
        // Reload after popup is closed (either by user clicking OK or timer expires)
        window.location.reload();
      } else {
        // Backend returns success: false with message
        console.error("Backend error:", data);
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: data.message || data.error || "Failed to update profile. Please try again.",
          confirmButtonColor: "#1d4ed8",
        });
      }
    } catch (error: any) {
      setSaving(false);
      console.error("Profile update error:", error);
      Swal.fire({
        icon: "error",
        title: "Network Error",
        text: error.message || "Failed to connect to server. Please check your connection.",
        confirmButtonColor: "#1d4ed8",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md border-2 border-orange-300 p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 drop-shadow-md" style={{ textShadow: '0 2px 4px rgba(255,255,255,0.8)' }}>My Profile</h2>
          <p className="text-gray-700 mt-2 font-medium drop-shadow-sm" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>Manage your personal information.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-8">
            {/* Profile Picture Section */}
            <div className="flex-shrink-0">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-48 h-48 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-300 transition border-2 border-dashed border-gray-400"
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <p className="text-gray-500 text-center text-sm px-4">
                    upload your picture here
                  </p>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Form Fields */}
            <div className="flex-1 space-y-6">
              {/* SISPA ID - Read-only (cannot be changed) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SISPA ID
                </label>
                <input
                  type="text"
                  value={formData.sispaId}
                  disabled
                  className="w-full border rounded-md p-2 bg-gray-100 text-gray-600 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  SISPA ID cannot be changed
                </p>
              </div>

              {/* FULLNAME */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  FULLNAME
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  placeholder="Munirah binti Mazlan"
                  required
                  className="w-full border rounded-md p-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* BATCH */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  BATCH <span className="text-red-500">*</span>
                </label>
                <div className="inline-flex items-center border rounded-md bg-gray-50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setBatchNumber((prev) => Math.max(1, prev - 1))}
                    className="px-3 py-2 hover:bg-gray-200 active:bg-gray-300 transition-colors border-r border-gray-300 flex items-center justify-center"
                    aria-label="Decrease Batch number"
                  >
                    <ChevronDownIcon className="w-4 h-4 text-gray-700" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={batchNumber}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      if (!isNaN(value) && value >= 1) {
                        setBatchNumber(value);
                      }
                    }}
                    required
                    className="w-20 px-3 py-2 bg-transparent text-center font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => setBatchNumber((prev) => Math.max(1, prev + 1))}
                    className="px-3 py-2 hover:bg-gray-200 active:bg-gray-300 transition-colors border-l border-gray-300 flex items-center justify-center"
                    aria-label="Increase Batch number"
                  >
                    <ChevronUpIcon className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
              </div>

              {/* GENDER */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GENDER <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value as "Male" | "Female" | "" })
                  }
                  required
                  className="w-full border rounded-md p-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              {/* NO. MATRIC */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NO. MATRIC
                </label>
                <input
                  type="text"
                  value={formData.matricNo}
                  onChange={(e) =>
                    setFormData({ ...formData, matricNo: e.target.value })
                  }
                  placeholder="214334"
                  className="w-full border rounded-md p-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* PERSONAL EMAIL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PERSONAL EMAIL
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="munirah123@gmail.com"
                  required
                  className="w-full border rounded-md p-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* NO. PHONE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NO. PHONE
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="019-5189484"
                  className="w-full border rounded-md p-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Update Button */}
              <div className="flex justify-center pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-700 text-white px-8 py-2 rounded-md hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Update"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

