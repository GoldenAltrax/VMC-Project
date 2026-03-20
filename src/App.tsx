import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Projects } from './components/Projects';
import { Machines } from './components/Machines';
import { Maintenance } from './components/Maintenance';
import { Notifications } from './components/Notifications';
import { Settings } from './components/Settings';
import { WeeklyPlanner } from './components/WeeklyPlanner';
import { CostTab } from './components/CostTab';
import { FloorView } from './components/FloorView';
import { OperatorReport } from './components/OperatorReport';
import { Checklists } from './components/Checklists';
import { ShiftHandover } from './components/ShiftHandover';
import { DelayReasonModal } from './components/DelayReasonModal';
import { ToastContainer } from './components/common/Toast';
import { useShiftTimeSync } from './hooks/useShiftTimeSync';
import { AnimatePresence, motion } from 'framer-motion';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { pendingJobs, shouldPrompt, markChecked } = useShiftTimeSync();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'projects':
        return <Projects />;
      case 'machines':
        return <Machines />;
      case 'maintenance':
        return <Maintenance />;
      case 'planner':
        return <WeeklyPlanner />;
      case 'notifications':
        return <Notifications />;
      case 'settings':
        return <Settings />;
      case 'cost':
        return <CostTab />;
      case 'floor':
        return <FloorView />;
      case 'reports':
        return <OperatorReport />;
      case 'checklists':
        return <Checklists />;
      case 'handover':
        return <ShiftHandover />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="flex h-screen w-full bg-gray-900 text-gray-100"
    >
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />
        {shouldPrompt && (
          <DelayReasonModal pendingJobs={pendingJobs} onClose={markChecked} />
        )}
        <ToastContainer />

        <main className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </motion.div>
  );
}
