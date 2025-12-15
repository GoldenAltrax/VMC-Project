// import React from 'react';
// import { LayoutDashboard, FolderKanban, Cog, Settings2, LogOut, Factory, Calendar } from 'lucide-react';
// interface SidebarProps {
//   activeTab: string;
//   setActiveTab: (tab: string) => void;
// }
// export function Sidebar({
//   activeTab,
//   setActiveTab
// }: SidebarProps) {
//   const menuItems = [{
//     id: 'dashboard',
//     label: 'Dashboard',
//     icon: LayoutDashboard
//   }, {
//     id: 'projects',
//     label: 'Projects',
//     icon: FolderKanban
//   }, {
//     id: 'machines',
//     label: 'Machines',
//     icon: Factory
//   }, {
//     id: 'planner',
//     label: 'Weekly Planner',
//     icon: Calendar
//   }, {
//     id: 'settings',
//     label: 'Settings',
//     icon: Settings2
//   }];
//   return <div className="w-64 bg-gray-800 flex flex-col">
//       <div className="p-4 border-b border-gray-700">
//         <h1 className="text-xl font-bold text-blue-400">VMC Planner</h1>
//         <p className="text-xs text-gray-400 mt-1">Machine Management System</p>
//       </div>
//       <div className="flex-1 py-4">
//         <nav className="px-2">
//           {menuItems.map(item => {
//           const Icon = item.icon;
//           return <button key={item.id} className={`flex items-center w-full px-4 py-3 mb-2 rounded-lg text-left ${activeTab === item.id ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`} onClick={() => setActiveTab(item.id)}>
//                 <Icon size={20} className="mr-3" />
//                 {item.label}
//               </button>;
//         })}
//         </nav>
//       </div>
//       <div className="p-4 border-t border-gray-700">
//         <button className="flex items-center w-full px-4 py-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700">
//           <LogOut size={20} className="mr-3" />
//           Logout
//         </button>
//       </div>
//     </div>;
// }

// ------- Old Code -------

// import React from 'react';
// import {
//   LayoutDashboard,
//   FolderKanban,
//   Settings2,
//   LogOut,
//   Factory,
//   Calendar
// } from 'lucide-react';

// interface SidebarProps {
//   activeTab: string;
//   setActiveTab: (tab: string) => void;
// }

// export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
//   const menuItems = [
//     { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
//     { id: 'projects', label: 'Projects', icon: FolderKanban },
//     { id: 'machines', label: 'Machines', icon: Factory },
//     { id: 'planner', label: 'Weekly Planner', icon: Calendar },
//     { id: 'settings', label: 'Settings', icon: Settings2 }
//   ];

//   return (
//     <div className="w-64 bg-gray-800 flex flex-col">
//       {/* Header Section */}
//       <div className="p-4 border-b border-gray-700">
//         <h1 className="text-xl font-bold text-blue-400">VMC Planner</h1>
//         <p className="text-xs text-gray-400 mt-1">Machine Management System</p>
//       </div>

//       {/* Navigation Section */}
//       <div className="flex-1 py-4">
//         <nav className="px-2">
//           {menuItems.map((item) => {
//             const Icon = item.icon;
//             return (
//               <button
//                 key={item.id}
//                 onClick={() => setActiveTab(item.id)}
//                 className={`flex items-center w-full px-4 py-3 mb-2 rounded-lg text-left transition-colors duration-150 ${
//                   activeTab === item.id
//                     ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40'
//                     : 'text-gray-300 hover:bg-gray-700'
//                 }`}
//               >
//                 <Icon size={20} className="mr-3" />
//                 {item.label}
//               </button>
//             );
//           })}
//         </nav>
//       </div>

//       {/* Logout Section */}
//       <div className="p-4 border-t border-gray-700">
//         <button
//           onClick={() => {
//             const confirmLogout = window.confirm('Are you sure you want to logout?');
//             if (confirmLogout) {
//               localStorage.removeItem('isAuthenticated');
//               window.location.reload(); // reload app to show login screen
//             }
//           }}
//           className="flex items-center w-full px-4 py-2 text-gray-400 rounded-lg 
//                      hover:bg-red-500/90 hover:text-white 
//                      hover:shadow-lg hover:shadow-red-500/30 
//                      transition-all duration-300 ease-in-out"
//         >
//           <LogOut size={20} className="mr-3" />
//           Logout
//         </button>
//       </div>
//     </div>
//   );
// }

// ------- Old Code 2 -------

// import React, { useState } from 'react';
// import {
//   LayoutDashboard,
//   FolderKanban,
//   Settings2,
//   LogOut,
//   Factory,
//   Calendar
// } from 'lucide-react';
// import { motion } from 'framer-motion';
// import { LoadingPopup } from './LoadingPopup';

// interface SidebarProps {
//   activeTab: string;
//   setActiveTab: (tab: string) => void;
// }

// export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
//   const [showLogoutPopup, setShowLogoutPopup] = useState(false);

//   const handleLogout = () => {
//     const confirmLogout = window.confirm('Are you sure you want to logout?');
//     if (confirmLogout) {
//       setShowLogoutPopup(true);

//       // Fade the popup in and then smoothly log out
//       setTimeout(() => {
//         localStorage.removeItem('isAuthenticated');
//         // Add a subtle fade-out to the app before reload
//         document.body.classList.add('fade-out');
//         setTimeout(() => {
//           window.location.reload();
//         }, 600); // matches fade duration
//       }, 1500);
//     }
//   };

//   const menuItems = [
//     { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
//     { id: 'projects', label: 'Projects', icon: FolderKanban },
//     { id: 'machines', label: 'Machines', icon: Factory },
//     { id: 'planner', label: 'Weekly Planner', icon: Calendar },
//     { id: 'settings', label: 'Settings', icon: Settings2 }
//   ];

//   return (
//     <>
//       <div className="w-64 bg-gray-800 flex flex-col">
//         {/* Header Section */}
//         <div className="p-4 border-b border-gray-700">
//           <h1 className="text-xl font-bold text-blue-400">VMC Planner</h1>
//           <p className="text-xs text-gray-400 mt-1">Machine Management System</p>
//         </div>

//         {/* Navigation Section */}
//         <div className="flex-1 py-4">
//           <nav className="px-2 relative">
//             {menuItems.map((item) => {
//               const Icon = item.icon;
//               const isActive = activeTab === item.id;

//               return (
//                 <motion.button
//                   key={item.id}
//                   layout
//                   onClick={() => setActiveTab(item.id)}
//                   className={`relative flex items-center w-full px-4 py-3 mb-2 rounded-lg text-left overflow-hidden
//                     ${isActive ? 'text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}
//                   `}
//                   whileTap={{ scale: 0.97 }}
//                 >
//                   {isActive && (
//                     <motion.div
//                       layoutId="activeHighlight"
//                       className="absolute inset-0 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/30"
//                       transition={{ type: 'spring', stiffness: 300, damping: 25 }}
//                     />
//                   )}
//                   <Icon size={20} className="mr-3 relative z-10" />
//                   <span className="relative z-10">{item.label}</span>
//                 </motion.button>
//               );
//             })}
//           </nav>
//         </div>

//         {/* Logout Section */}
//         <div className="p-4 border-t border-gray-700">
//           <motion.button
//             whileHover={{ scale: 1.03 }}
//             whileTap={{ scale: 0.95 }}
//             onClick={handleLogout}
//             className="flex items-center w-full px-4 py-2 text-gray-400 rounded-lg
//                        hover:bg-red-500/90 hover:text-white
//                        hover:shadow-lg hover:shadow-red-500/30
//                        transition-all duration-300 ease-in-out"
//           >
//             <LogOut size={20} className="mr-3" />
//             Logout
//           </motion.button>
//         </div>
//       </div>

//       {/* Logging out popup */}
//       <LoadingPopup show={showLogoutPopup} message="Logging out..." />
//     </>
//   );
// }

// --------- Old Code 3 ---------

import { useState } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Settings2,
  LogOut,
  Factory,
  Calendar,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { animatedLogout, isAdmin } = useAuth();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleConfirmLogout = async () => {
    setShowConfirmModal(false);
    // Use the animated logout from AuthContext which handles the loading popup globally
    await animatedLogout();
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "machines", label: "Machines", icon: Factory },
    { id: "planner", label: "Weekly Planner", icon: Calendar },
    { id: "settings", label: "Settings", icon: Settings2 },
  ];

  return (
    <>
      <div className="w-64 bg-gray-800 flex flex-col">
        {/* Header Section */}
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-blue-400">VMC Planner</h1>
          <p className="text-xs text-gray-400 mt-1">
            Machine Management System
          </p>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 py-4">
          <nav className="px-2 relative">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <motion.button
                  key={item.id}
                  layout
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center w-full px-4 py-3 mb-2 rounded-lg text-left overflow-hidden
                    ${
                      isActive
                        ? "text-white"
                        : "text-gray-300 hover:text-white hover:bg-gray-700"
                    }
                  `}
                  whileTap={{ scale: 0.97 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeHighlight"
                      className="absolute inset-0 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/30"
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                  <Icon size={20} className="mr-3 relative z-10" />
                  <span className="relative z-10">{item.label}</span>
                </motion.button>
              );
            })}
          </nav>
        </div>

        {/* Logout Section */}
        <div className="p-4 border-t border-gray-700">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowConfirmModal(true)}
            className="flex items-center w-full px-4 py-2 text-gray-400 rounded-lg
                       hover:bg-red-500/90 hover:text-white
                       hover:shadow-lg hover:shadow-red-500/30
                       transition-all duration-300 ease-in-out"
          >
            <LogOut size={20} className="mr-3" />
            Logout
          </motion.button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-gray-800 rounded-xl p-6 shadow-2xl text-center max-w-sm w-full"
            >
              <XCircle className="text-red-400 mx-auto mb-3" size={48} />
              <h2 className="text-lg font-semibold mb-2 text-white">
                Confirm Logout
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                Are you sure you want to logout from VMC Planner?
              </p>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
