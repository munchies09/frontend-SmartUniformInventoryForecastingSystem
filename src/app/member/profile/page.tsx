"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      console.log("Profile page - User data:", user); // Debug log
      setFormData({
        sispaId: user.sispaId || "",
        fullName: user.name || "",
        batch: user.batch || "",
        matricNo: user.matricNo || "",
        email: user.email || "",
        phone: user.phone || "",
      });
      if (user.profileImage) {
        setProfileImage(user.profileImage);
      }
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [user]);

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

        if (!formData.batch || formData.batch.trim() === '') {
          Swal.fire({
            icon: "error",
            title: "Validation Error",
            text: "Batch is required.",
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
        text: "User information not found. Please login again.",
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
          text: "Please login again.",
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
      // Backend expects: matricNumber, phoneNumber, profilePicture (not matricNo, phone, profileImage)
      const payload = {
        name: formData.fullName.trim(),
        email: formData.email.trim(),
        batch: formData.batch.trim(),
        matricNumber: formData.matricNo?.trim() || "", // Backend expects matricNumber
        phoneNumber: formData.phone?.trim() || "", // Backend expects phoneNumber
        profilePicture: profileImage || "", // Backend expects profilePicture
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
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">My Profile</h2>
          <p className="text-gray-600 mt-2">Manage your personal information.</p>
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
                <input
                  type="text"
                  value={formData.batch}
                  onChange={(e) =>
                    setFormData({ ...formData, batch: e.target.value })
                  }
                  placeholder="Kompeni 8"
                  required
                  className="w-full border rounded-md p-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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

