'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import Swal from "sweetalert2";

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    sispaId: '',
    name: '',
    email: '',
    batch: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate passwords match
    if (form.password !== form.confirmPassword) {
      Swal.fire({
        icon: "error",
        title: "Password Mismatch",
        text: "Passwords do not match!",
        confirmButtonColor: "#1d4ed8",
      });
      setLoading(false);
      return;
    }

    // Validate password length
    if (form.password.length < 6) {
      Swal.fire({
        icon: "error",
        title: "Invalid Password",
        text: "Password must be at least 6 characters long.",
        confirmButtonColor: "#1d4ed8",
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/members/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sispaId: form.sispaId.trim(),
          name: form.name.trim(),
          email: form.email.trim(),
          batch: form.batch.trim(),
          password: form.password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Sign up failed');
      }

      // Success
      await Swal.fire({
        icon: "success",
        title: "Account Created!",
        text: data.message || "Account created successfully. You can now log in.",
        confirmButtonColor: "#1d4ed8",
      });

      // Redirect to login page
      router.push('/login');
    } catch (error: any) {
      console.error('Sign up error:', error);
      Swal.fire({
        icon: "error",
        title: "Sign Up Failed",
        text: error.message || "Failed to create account. Please try again.",
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/background1.png')" }}>

      <div className="flex w-[900px] h-[500px] bg-white rounded-xl shadow-2xl overflow-hidden">

        {/* LEFT IMAGE */}
        <div className="w-1/2">
          <img src="/image1.png" className="w-full h-full object-cover" />
        </div>

        {/* RIGHT FORM */}
        <div className="w-1/2 flex flex-col justify-center px-10 pt-10 pb-10">

          <div className="flex justify-center gap-4 mb-3">
            <img src="/logoupm.png" className="w-16" />
            <img src="/logoapm.png" className="w-16" />
          </div>

          <h2 className="text-2xl font-bold text-center text-blue-700 mb-4">Create Account</h2>

          {/* SCROLLABLE FORM */}
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[500px] pr-2">

            <label className="block font-medium">SISPA ID <span className="text-red-500">*</span></label>
            <input 
              name="sispaId" 
              value={form.sispaId}
              onChange={handleChange} 
              required 
              placeholder="B1184648"
              className="w-full border rounded-md p-2 mb-3" 
            />

            <label className="block font-medium">Full Name <span className="text-red-500">*</span></label>
            <input 
              name="name" 
              value={form.name}
              onChange={handleChange} 
              required 
              placeholder="Munirah binti Mazlan"
              className="w-full border rounded-md p-2 mb-3" 
            />

            <label className="block font-medium">Email <span className="text-red-500">*</span></label>
            <input 
              name="email" 
              type="email" 
              value={form.email}
              onChange={handleChange} 
              required 
              placeholder="munirah@gmail.com"
              className="w-full border rounded-md p-2 mb-3" 
            />

            <label className="block font-medium">Batch <span className="text-red-500">*</span></label>
            <input 
              name="batch" 
              value={form.batch}
              onChange={handleChange} 
              required 
              placeholder="Kompeni 8"
              className="w-full border rounded-md p-2 mb-3" 
            />

            <label className="block font-medium">Password <span className="text-red-500">*</span></label>
            <div className="relative mb-3">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                className="w-full border rounded-md p-2 pr-10"
              />
              <span onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2 cursor-pointer">
                {showPassword ? <EyeSlashIcon className="w-5 text-gray-600" /> : <EyeIcon className="w-5 text-gray-600" />}
              </span>
            </div>

            <label className="block font-medium">Confirm Password <span className="text-red-500">*</span></label>
            <div className="relative mb-4">
              <input
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={form.confirmPassword}
                onChange={handleChange}
                required
                className="w-full border rounded-md p-2 pr-10"
              />
              <span onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-2 cursor-pointer">
                {showConfirm ? <EyeSlashIcon className="w-5 text-gray-600" /> : <EyeIcon className="w-5 text-gray-600" />}
              </span>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 text-white py-2 rounded-md hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            <p className="text-sm text-center mt-3">
              Already have an account?{" "}
              <a href="/login" className="text-blue-700 hover:underline">
                Log in here
              </a>
            </p>
          </form>

        </div>
      </div>
    </div>
  );
}
