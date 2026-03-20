import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { animatedLogin, isLoggingIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // animatedLogin handles all the timing and animation states
      await animatedLogin(username, password);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  const isDisabled = isSubmitting || isLoggingIn;

  return (
    <>
      <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-100">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-lg w-96 relative">
          <h1 className="text-2xl font-bold text-center mb-6 text-blue-400">
            VMC Planner Login
          </h1>

          {error && (
            <div className="mb-4 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter username"
                required
                disabled={isDisabled}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter password"
                required
                disabled={isDisabled}
              />
            </div>

            <button
              type="submit"
              disabled={isDisabled}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg transition-colors"
            >
              {isDisabled ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-6">
            {new Date().getFullYear()} VMC Planner System
          </p>
        </div>
      </div>
    </>
  );
}
