import "./index.css";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Login } from "./components/Login";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import { LoadingPopup } from "./components/LoadingPopup";

function AuthenticatedApp() {
  const { isAuthenticated, isLoading, isLoggingIn, isLoggingOut } = useAuth();
  const [showApp, setShowApp] = useState(false);

  // Handle transitions between login and app
  useEffect(() => {
    if (isAuthenticated && !isLoggingOut) {
      setShowApp(true);
    } else if (!isAuthenticated) {
      setShowApp(false);
    }
  }, [isAuthenticated, isLoggingOut]);

  // Handle the login success transition
  const handleLoginSuccess = () => {
    // This is called after animatedLogin completes - no additional logic needed
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {showApp ? (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <App />
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <Login onLogin={handleLoginSuccess} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global loading popups for login/logout transitions */}
      <LoadingPopup show={isLoggingIn} message="Logging in..." />
      <LoadingPopup show={isLoggingOut} message="Logging out..." />
    </div>
  );
}

function Root() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
