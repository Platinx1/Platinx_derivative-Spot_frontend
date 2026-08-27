import React, { useState } from "react";
import { User, Phone, Hash, ArrowRight, CheckCircle } from "lucide-react";
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const SignupPage = () => {
  const [formData, setFormData] = useState({
    id: "",
    userName: "",
    mobile: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const queryParams = new URLSearchParams({
        id: formData.id.trim(),
        userName: formData.userName.trim(),
        mobile: formData.mobile.trim(),
      });

      const response = await fetch(
        `${BASE_URL}/api/fno/create-user?${queryParams}`,
        { method: "GET" },
      );

      const data = await response.json();

      if (response.ok && data.status === true) {
        setSuccess(true);
        setResult(data);
        setFormData({ id: "", userName: "", mobile: "" });
      } else {
        setError(data.message || "Failed to create user. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070814] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7B2FF7] to-[#A855F7] rounded-xl flex items-center justify-center">
              <span className="text-black font-bold text-2xl">π</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              PI42
            </h1>
          </div>
          <p className="text-gray-400 text-sm">
            Create your futures trading account
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-[#131A28] border border-[#1E2433] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            Create New Account
          </h2>

          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-green-500 text-xl font-bold mb-2">
                Account Created Successfully!
              </h3>
              <p className="text-gray-400 mb-6">
                Your Pi42 account has been registered.
              </p>
              <button
                onClick={() => setSuccess(false)}
                className="bg-[#7B2FF7] hover:bg-[#A855F7] text-white font-bold py-3 px-8 rounded-xl transition-all"
              >
                Create Another Account
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User ID */}
              <div>
                <label className="block text-gray-400 text-sm mb-2 flex items-center gap-2">
                  <Hash size={16} /> User ID
                </label>
                <input
                  type="text"
                  name="id"
                  value={formData.id}
                  onChange={handleChange}
                  required
                  placeholder="Enter unique User ID"
                  className="w-full bg-[#0F1725] border border-[#1E2433] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7B2FF7] transition-colors"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-gray-400 text-sm mb-2 flex items-center gap-2">
                  <User size={16} /> Username
                </label>
                <input
                  type="text"
                  name="userName"
                  value={formData.userName}
                  onChange={handleChange}
                  required
                  placeholder="Enter username"
                  className="w-full bg-[#0F1725] border border-[#1E2433] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7B2FF7] transition-colors"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-gray-400 text-sm mb-2 flex items-center gap-2">
                  <Phone size={16} /> Mobile Number
                </label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  required
                  placeholder="Enter 10-digit mobile number"
                  className="w-full bg-[#0F1725] border border-[#1E2433] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7B2FF7] transition-colors"
                />
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#7B2FF7] to-[#A855F7] hover:from-[#A855F7] hover:to-[#C084FC] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-70"
              >
                {loading ? (
                  "Creating Account..."
                ) : (
                  <>
                    Create Account <ArrowRight size={20} />
                  </>
                )}
              </button>

              <p className="text-center text-gray-500 text-xs mt-4">
                By signing up, you agree to our Terms &amp; Conditions
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-gray-500 text-xs">
          © 2026 Pi42 Futures • All Rights Reserved
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
