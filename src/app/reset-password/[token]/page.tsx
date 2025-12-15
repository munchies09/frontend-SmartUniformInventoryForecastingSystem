"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Swal from "sweetalert2";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = async () => {
    if (password !== confirm) {
      Swal.fire({
        icon: "error",
        title: "Passwords do not match",
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `http://localhost:5000/api/members/reset-password/${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }
      );

      const data = await res.json();
      setLoading(false);

      if (res.ok && data.success) {
        Swal.fire({
          icon: "success",
          title: "Password Reset Successfully!",
          confirmButtonColor: "#1d4ed8",
        });
        router.push("/login?reset=success");
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message || "Invalid or expired token",
          confirmButtonColor: "#1d4ed8",
        });
      }
    } catch (err) {
      setLoading(false);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error resetting password",
        confirmButtonColor: "#1d4ed8",
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-96">

        <h2 className="text-xl font-bold text-center mb-4 text-blue-700">
          Reset Your Password
        </h2>

        {/* Password */}
        <label className="block font-medium">New Password</label>
        <div className="relative mb-3">
          <input
            type={showPassword ? "text" : "password"}
            className="w-full border rounded-md p-2 pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="button"
            className="absolute right-2 top-2"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeSlashIcon className="w-5 h-5 text-gray-600" />
            ) : (
              <EyeIcon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Confirm Password */}
        <label className="block font-medium">Confirm Password</label>
        <div className="relative mb-5">
          <input
            type={showConfirm ? "text" : "password"}
            className="w-full border rounded-md p-2 pr-10"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <button
            type="button"
            className="absolute right-2 top-2"
            onClick={() => setShowConfirm(!showConfirm)}
          >
            {showConfirm ? (
              <EyeSlashIcon className="w-5 h-5 text-gray-600" />
            ) : (
              <EyeIcon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        <button
          onClick={handleReset}
          disabled={loading}
          className="w-full bg-blue-700 text-white py-2 rounded-md hover:bg-blue-800 transition"
        >
          {loading ? "Updating..." : "Reset Password"}
        </button>

      </div>
    </div>
  );
}
