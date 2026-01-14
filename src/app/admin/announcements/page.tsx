"use client";

import { useState, useEffect } from "react";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import Swal from "sweetalert2";

interface Announcement {
  id?: string;
  title: string;
  date: string;
  time: string;
  location: string;
  message?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState<Announcement>({
    title: "",
    date: "",
    time: "",
    location: "",
    message: "",
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/announcements", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.date || !formData.time || !formData.location) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Please fill in all required fields (Title, Date, Time, Location).",
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const url = editingAnnouncement
        ? `http://localhost:5000/api/announcements/${editingAnnouncement.id}`
        : "http://localhost:5000/api/announcements";
      const method = editingAnnouncement ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        await fetchAnnouncements();
        setShowModal(false);
        setFormData({ title: "", date: "", time: "", location: "", message: "" });
        setEditingAnnouncement(null);
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: editingAnnouncement
            ? "Announcement updated successfully!"
            : "Announcement created successfully!",
          confirmButtonColor: "#1d4ed8",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message || "Failed to save announcement.",
          confirmButtonColor: "#1d4ed8",
        });
      }
    } catch (error) {
      console.error("Error saving announcement:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "An error occurred. Please try again.",
        confirmButtonColor: "#1d4ed8",
      });
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      date: announcement.date,
      time: announcement.time,
      location: announcement.location,
      message: announcement.message || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete Announcement?",
      text: "Are you sure you want to delete this announcement?",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:5000/api/announcements/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (data.success) {
          await fetchAnnouncements();
          Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: "Announcement has been deleted.",
            confirmButtonColor: "#1d4ed8",
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: data.message || "Failed to delete announcement.",
            confirmButtonColor: "#1d4ed8",
          });
        }
      } catch (error) {
        console.error("Error deleting announcement:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "An error occurred. Please try again.",
          confirmButtonColor: "#1d4ed8",
        });
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ title: "", date: "", time: "", location: "", message: "" });
    setEditingAnnouncement(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition"
        >
          <PlusIcon className="w-5 h-5" />
          Create Announcement
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-lg text-gray-600">Loading announcements...</div>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center text-gray-500">
          No announcements found. Create your first announcement!
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="bg-white rounded-lg border-2 border-yellow-300 p-6 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {announcement.title}
                  </h3>
                  <div className="space-y-2">
                    <p className="text-gray-700">
                      <span className="font-semibold">Tarikh :</span> {announcement.date}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Masa :</span> {announcement.time}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Tempat :</span> {announcement.location}
                    </p>
                  </div>
                  {announcement.message && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-gray-800 whitespace-pre-wrap">{announcement.message}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(announcement)}
                    className="p-2 text-blue-700 hover:bg-blue-50 rounded-lg transition"
                    title="Edit"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => announcement.id && handleDelete(announcement.id)}
                    className="p-2 text-red-700 hover:bg-red-50 rounded-lg transition"
                    title="Delete"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingAnnouncement ? "Edit Announcement" : "Create Announcement"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Pengambilan Uniform bagi Kompeni 11"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date (Tarikh) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 11/11/2025"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time (Masa) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Jam 2000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location (Tempat) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Markas Kor SISPA UPM"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={formData.message || ""}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any additional message or details..."
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 transition"
                >
                  {editingAnnouncement ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

