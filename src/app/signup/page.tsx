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

    // Normalize and validate SISPA ID
    const normalizedSispaId = form.sispaId.trim().toUpperCase();
    
    if (!normalizedSispaId) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "SISPA ID is required.",
        confirmButtonColor: "#1d4ed8",
      });
      setLoading(false);
      return;
    }

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

    // Validate batch
    if (!form.batch || isNaN(Number(form.batch)) || Number(form.batch) <= 0) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Please select a valid batch number.",
        confirmButtonColor: "#1d4ed8",
      });
      setLoading(false);
      return;
    }

    try {
      const payload = {
        sispaId: normalizedSispaId,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        batch: Number(form.batch),
        password: form.password,
      };

      console.log('=== SIGNUP REQUEST ===');
      console.log('URL:', 'http://localhost:5000/api/members/signup');
      console.log('Method:', 'POST');
      console.log('Payload:', { ...payload, password: '***' });
      console.log('Payload JSON:', JSON.stringify(payload, null, 2));

      const response = await fetch('http://localhost:5000/api/members/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      console.log('=== SIGNUP RESPONSE ===');
      console.log('Status:', response.status, response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));
      console.log('Response Data:', data);
      console.log('Full Response:', JSON.stringify(data, null, 2));

      if (!response.ok || !data.success) {
        // More detailed error message
        const errorMessage = data.message || data.error || 'Sign up failed';
        console.error('=== SIGNUP FAILED ===');
        console.error('Error Message:', errorMessage);
        console.error('Full Error Data:', data);
        console.error('Status Code:', response.status);
        
        // Check if it's a duplicate ID error
        if (errorMessage.toLowerCase().includes('already') || errorMessage.toLowerCase().includes('exists') || errorMessage.toLowerCase().includes('duplicate')) {
          Swal.fire({
            icon: "error",
            title: "ID Already Exists",
            html: `
              <p>The SISPA ID <strong>${normalizedSispaId}</strong> is already registered.</p>
              <p class="mt-2 text-sm text-red-600">⚠️ Backend Error: "${errorMessage}"</p>
              <p class="mt-2 text-xs text-gray-600">This appears to be a backend issue. The backend is checking for "Member ID" but we're sending "sispaId".</p>
              <p class="mt-1 text-xs text-gray-500">Please check the browser console (F12) for detailed logs.</p>
            `,
            confirmButtonColor: "#1d4ed8",
            width: '500px',
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Sign Up Failed",
            text: errorMessage,
            confirmButtonColor: "#1d4ed8",
          });
        }
        setLoading(false);
        return;
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
        text: error.message || "Failed to create account. Please check your connection and try again.",
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: "url('/background1.png')", backgroundPosition: "center center", backgroundRepeat: "no-repeat" }}>
      {/* White overlay for light shade effect */}
      <div className="absolute inset-0 bg-white/20 pointer-events-none"></div>
      <div className="relative z-10">

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
              onChange={(e) => {
                // Auto-uppercase SISPA ID as user types
                const value = e.target.value.toUpperCase();
                setForm({ ...form, sispaId: value });
              }}
              required 
              placeholder="B1184648"
              className="w-full border rounded-md p-2 mb-3 uppercase" 
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
              type="number" 
              value={form.batch}
              onChange={handleChange} 
              required 
              min="1"
              placeholder="Select batch number"
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
    </div>
  );
}
