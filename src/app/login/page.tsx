"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import Swal from "sweetalert2";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      if (user.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/member/dashboard");
      }
    }
  }, [user, loading, router]);

  const [showForgotPopup, setShowForgotPopup] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const [sispaId, setSispaId] = useState("");
  const [password, setPassword] = useState("");

  // ==========================================
  // NEW LOGIN (Calls Backend)
  // ==========================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5000/api/members/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sispaId: sispaId.trim(), // Backend uses sispaId only
          password: password,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        Swal.fire({
          icon: "error",
          title: "Invalid ID or Password",
          confirmButtonColor: "#1d4ed8",
        });
        return;
      }


      // Store user data and redirect based on role
      // Backend returns: { success: true, user: { id, sispaId, name, email, role, batch, matricNumber, phoneNumber, profilePicture }, token }
      const userData = {
        id: data.user?.id || data.member?.id || "",
        sispaId: data.user?.sispaId || data.member?.sispaId || sispaId.trim(), // Primary identifier
        name: data.user?.name || data.member?.name || "",
        email: data.user?.email || data.member?.email || "",
        role: data.user?.role || data.member?.role || "member", // Default to member if not specified
        batch: data.user?.batch || data.member?.batch || "",
        matricNo: data.user?.matricNo || data.user?.matricNumber || data.member?.matricNo || data.member?.matricNumber || "",
        phone: data.user?.phone || data.user?.phoneNumber || data.member?.phone || data.member?.phoneNumber || "",
        profileImage: data.user?.profileImage || data.user?.profilePicture || data.member?.profileImage || data.member?.profilePicture || "",
      };

      login(userData, data.token);

    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Login Error",
        text: "Something went wrong!",
        confirmButtonColor: "#1d4ed8",
      });
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: "url('/background1.png')", backgroundPosition: "center center", backgroundRepeat: "no-repeat" }}
    >
      {/* White overlay for light shade effect */}
      <div className="absolute inset-0 bg-white/20 pointer-events-none"></div>
      <div className="relative z-10">
      <div className="flex w-[900px] h-[500px] bg-white rounded-xl shadow-2xl overflow-hidden">

        {/* LEFT IMAGE */}
        <div className="w-1/2">
          <img src="/image1.png" className="w-full h-full object-cover" />
        </div>

        {/* RIGHT FORM */}
        <div className="w-1/2 flex flex-col justify-center px-10">

          <div className="flex justify-center gap-4 mb-4">
            <img src="/logoupm.png" className="w-16" />
            <img src="/logoapm.png" className="w-16" />
          </div>

          <h2 className="text-2xl font-bold text-center text-blue-700 mb-4">
            Sign in Kor SISPA Inventory
          </h2>

          <form onSubmit={handleLogin}>
            <label className="block font-medium">SISPA ID</label>
            <input
              value={sispaId}
              onChange={(e) => setSispaId(e.target.value)}
              required
              placeholder="Enter your SISPA ID"
              className="w-full border rounded-md p-2 mb-3"
            />

            <label className="block font-medium">Password</label>
            <div className="relative mb-4">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border rounded-md p-2 pr-10"
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2 cursor-pointer text-gray-600"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5" />
                ) : (
                  <EyeIcon className="w-5" />
                )}
              </span>
            </div>

            <button className="w-full bg-blue-700 text-white py-2 rounded-md hover:bg-blue-800 transition">
              LOGIN
            </button>

            <div className="text-center mt-3">
              <span
                onClick={() => setShowForgotPopup(true)}
                className="text-blue-700 hover:underline text-sm cursor-pointer"
              >
                Forgot Password?
              </span>
            </div>

            <p className="text-sm text-center mt-4">
              First time here?{" "}
              <a href="/signup" className="text-blue-700 hover:underline">
                Sign Up
              </a>
            </p>
          </form>

        </div>
      </div>

      {/* FORGOT PASSWORD POPUP */}
      {showForgotPopup && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-semibold text-center mb-3">Reset Password</h2>

            <label className="block font-medium">Enter Your Email</label>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full border rounded-md p-2 mt-1 mb-4 focus:outline-blue-500 transition"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowForgotPopup(false)}
                className="px-3 py-1 border border-blue-700 rounded-md text-blue-700 hover:bg-blue-700 hover:text-white transition"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  try {
                    const res = await fetch("http://localhost:5000/api/members/forgot-password", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: resetEmail }),
                    });

                    if (!res.ok) {
                      const err = await res.json();
                      throw new Error(err.message);
                    }

                    Swal.fire({
                      icon: "success",
                      title: "Email Sent!",
                      text: "Please check your inbox.",
                      confirmButtonColor: "#1d4ed8",
                    });

                    setShowForgotPopup(false);
                  } catch (error: any) {
                    Swal.fire({
                      icon: "error",
                      title: "Error",
                      text: error.message,
                      confirmButtonColor: "#1d4ed8",
                    });
                  }
                }}
                className="px-3 py-1 bg-blue-700 text-white rounded-md hover:bg-blue-800 transition"
              >
                Send Reset Link
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
