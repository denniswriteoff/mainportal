"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import Markdown from "./Markdown";

interface FinancialInsightPopupProps {
  insights: string | null;
  loading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

const SESSION_STORAGE_KEY = "financial-insights-popup-closed";

export default function FinancialInsightPopup({
  insights,
  loading,
  isOpen,
  onClose,
  onOpen,
}: FinancialInsightPopupProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  const handleOpen = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    onOpen();
  };

  // Show collapsed logo if closed
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={handleOpen}
          className="bg-[#1D1D1D] rounded-xl p-2 shadow-2xl border border-white/5 hover:bg-[#2a2a2a] transition-all hover:scale-110 active:scale-95"
          title="AI Financial Insights"
        >
          <div className="bg-[#E8E7BB] p-2 rounded-lg">
            <Sparkles className="w-5 h-5 text-[#1D1D1D]" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
        isClosing
          ? "opacity-0 translate-y-4 scale-95 pointer-events-none"
          : "opacity-100 translate-y-0 scale-100"
      }`}
    >
      <div className="bg-[#1D1D1D] rounded-2xl shadow-2xl border border-white/10 w-96 max-w-[calc(100vw-3rem)] transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <div className="bg-[#E8E7BB] p-2 rounded-lg">
              <Sparkles className="w-4 h-4 text-[#1D1D1D]" />
            </div>
            <h3 className="text-sm font-semibold text-white">AI Financial Insights</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading || !insights ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-[#E8E7BB] animate-spin" />
              <span className="ml-3 text-sm text-gray-400">Analyzing your finances...</span>
            </div>
          ) : (
            <Markdown className="text-sm text-gray-300 leading-relaxed">
              {insights}
            </Markdown>
          )}
        </div>
      </div>
    </div>
  );
}

