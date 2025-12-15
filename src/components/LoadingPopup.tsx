import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingPopupProps {
  show: boolean;
  message: string;
}

export const LoadingPopup: React.FC<LoadingPopupProps> = ({ show, message }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-gray-800 text-gray-100 px-6 py-4 rounded-xl shadow-lg flex items-center space-x-3 border border-gray-700"
          >
            <div className="h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="font-medium">{message}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
