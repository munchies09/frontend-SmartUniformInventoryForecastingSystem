"use client";

import { useAuth } from "@/contexts/AuthContext";
import { UserIcon } from "@heroicons/react/24/outline";

// Uniform/Clothing Icon - Matching style
const ShirtIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 7h8M8 7v10a2 2 0 002 2h4a2 2 0 002-2V7M8 7l-2-3h12l-2 3M10 7v4M14 7v4"
    />
    <circle cx="12" cy="4" r="1.5" fill="currentColor"/>
  </svg>
);

export default function MemberDashboard() {
  const { user } = useAuth();

  // Static announcement - will be managed by admin later
  const announcement = {
    title: "Pengambilan Unifrom bagi Kompeni 11",
    date: "11/11/2025",
    time: "Jam 2000",
    location: "Markas Kor SISPA UPM",
  };

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">
          Welcome, {user?.name || "Member"}!
        </h2>
        <p className="text-gray-600 mt-2">
          Manage your profile and uniform.
        </p>
      </div>

      {/* Announcement Section */}
      <div className="mb-6 bg-white rounded-lg border-2 border-yellow-300 p-6 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Announcement</h3>
        <div className="space-y-2">
          <p className="text-gray-800 font-medium">{announcement.title}</p>
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
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <a
          href="/member/profile"
          className="bg-white rounded-lg border-2 border-yellow-300 p-6 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-4 rounded-lg">
              <UserIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">My Profile</h2>
              <p className="text-gray-600 mt-1">
                View and update your personal profile
              </p>
            </div>
          </div>
        </a>

        {/* Uniform Card */}
        <a
          href="/member/uniform"
          className="bg-white rounded-lg border-2 border-yellow-300 p-6 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-4 rounded-lg">
              <ShirtIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">My Uniform</h2>
              <p className="text-gray-600 mt-1">
                View and update your personal uniform
              </p>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}

