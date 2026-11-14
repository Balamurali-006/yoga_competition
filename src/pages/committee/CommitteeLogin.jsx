import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, setCustomAuthUser } from "../../firebase/auth";

const CommitteeLogin = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const emailTrimmed = form.email.trim().toLowerCase();
    const passwordTrimmed = form.password;

    // Strict validation: Only committeeuser@gmail.com and password "admin" are allowed
    if (emailTrimmed !== "committeeuser@gmail.com" || passwordTrimmed !== "admin") {
      setError("Invalid credentials. Only committeeuser@gmail.com is authorized.");
      setLoading(false);
      return;
    }

    try {
      // Attempt Firebase login if account exists in Firebase Auth
      await login(form.email.trim(), form.password);
    } catch (err) {
      // If Firebase Auth does not have this account or fails,
      // session is authenticated locally for the verified committee user
    }

    setCustomAuthUser({
      uid: "committeeuser",
      email: "committeeuser@gmail.com",
      role: "committee",
      displayName: "Committee Member",
    });

    navigate("/committee/verify");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-orange-500 text-3xl">🧘</div>
          <h1 className="mt-4 text-3xl font-bold text-purple-700">Committee Login</h1>
          <p className="mt-2 text-sm text-gray-600">Access restricted to authorized committee members.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="committeeuser@gmail.com"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 px-4 py-3 font-semibold text-white disabled:opacity-60 hover:opacity-95 transition-opacity"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CommitteeLogin;
