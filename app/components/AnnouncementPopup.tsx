"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Markdown from "./Markdown";

interface Announcement {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

interface AnnouncementPopupProps {
  announcement: Announcement;
  onClose: () => void;
  onMarkRead: (id: string) => void;
}

export default function AnnouncementPopup({
  announcement,
  onClose,
  onMarkRead,
}: AnnouncementPopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show popup with animation
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    onMarkRead(announcement.id);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
    >
      <div
        className={`bg-[#1D1D1D] rounded-2xl shadow-2xl border border-white/10 w-full max-w-lg transition-all duration-300 ${
          isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-xl font-semibold text-white">{announcement.title}</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <Markdown className="text-sm text-gray-300 leading-relaxed max-h-[50vh] overflow-y-auto">
            {announcement.message}
          </Markdown>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-white/10">
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-[#E8E7BB] text-[#1D1D1D] font-semibold rounded-full hover:bg-[#d4d3a7] transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

