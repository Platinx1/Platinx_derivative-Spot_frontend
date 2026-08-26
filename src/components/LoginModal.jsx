import React from 'react';
import { Mail, Lock, X } from 'lucide-react';

export default function LoginModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gradient-to-br from-[#1f3775] to-[#01add2]">
      {/* Close button for convenience */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 text-white hover:text-gray-200 transition"
      >
        <X size={32} />
      </button>

      {/* Main Card */}
      <div className="bg-[#e4eff6] w-full max-w-[400px] rounded-[24px] p-8 shadow-2xl relative">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-[#1f295b] text-[28px] font-bold mb-1">Welcome Back</h2>
          <p className="text-[#64748b] text-[13px]">Sign in to your enterprise dashboard</p>
        </div>

        {/* Form */}
        <form className="space-y-5">
          
          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-[#475569] text-[13px] font-semibold ml-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail size={18} className="text-[#94a3b8]" />
              </div>
              <input
                type="email"
                placeholder="name@enterprise.com"
                className="w-full bg-transparent border border-[#cbd5e1] rounded-full py-2.5 pl-10 pr-4 text-[14px] text-[#1e293b] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1 mr-1">
              <label className="block text-[#475569] text-[13px] font-semibold">Password</label>
              <a href="#" className="text-[#0284c7] text-[12px] font-medium hover:underline">Forgot Password?</a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock size={18} className="text-[#94a3b8]" />
              </div>
              <input
                type="password"
                placeholder="........"
                className="w-full bg-transparent border border-[#cbd5e1] rounded-full py-2.5 pl-10 pr-4 text-[14px] text-[#1e293b] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition tracking-widest"
              />
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center ml-1 mt-4">
            <input
              type="checkbox"
              id="remember"
              className="w-4 h-4 rounded border-[#cbd5e1] text-[#1f295b] focus:ring-[#1f295b] cursor-pointer"
            />
            <label htmlFor="remember" className="ml-2 block text-[#475569] text-[13px] cursor-pointer">
              Remember this device
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            className="w-full bg-[#1b1c55] hover:bg-[#161743] text-white text-[14px] font-medium py-3 rounded-full transition-colors mt-2 shadow-[0_4px_14px_0_rgba(27,28,85,0.39)]"
          >
            Login to HealthSync
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#cbd5e1]"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 bg-[#e4eff6] text-[#94a3b8] text-[11px] font-medium uppercase tracking-wider">
              OR CONTINUE WITH
            </span>
          </div>
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center gap-2 bg-transparent border border-[#cbd5e1] rounded-full py-2.5 hover:bg-white/50 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-[#334155] text-[13px] font-medium">Google</span>
          </button>
          <button className="flex items-center justify-center gap-2 bg-transparent border border-[#cbd5e1] rounded-full py-2.5 hover:bg-white/50 transition">
            <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 0H0v10h10V0z" fill="#f25022"/>
              <path d="M21 0H11v10h10V0z" fill="#7fba00"/>
              <path d="M10 11H0v10h10V11z" fill="#00a4ef"/>
              <path d="M21 11H11v10h10V11z" fill="#ffb900"/>
            </svg>
            <span className="text-[#334155] text-[13px] font-medium">Microsoft</span>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-[#64748b] text-[12px]">
            New to HealthSync? <a href="#" className="text-[#0284c7] font-semibold hover:underline">Contact Sales</a>
          </p>
        </div>

      </div>
    </div>
  );
}
