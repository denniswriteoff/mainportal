"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@nextui-org/react";
import Image from "next/image";
import { useState } from "react";

interface SidebarProps {
  accountingService?: string | null;
}

export default function Sidebar({ accountingService }: SidebarProps) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  const isActive = (path: string) => pathname === path;

  const navItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
  ];

  if (accountingService === "QBO") {
    navItems.push(
      {
        name: "QBO Chat",
        href: process.env.NEXT_PUBLIC_QBO_CHATBOT_URL || "http://localhost:3010",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        ),
      },
    );
  } else if (accountingService === "XERO") {
    navItems.push(
      {
        name: "Xero Chat",
        href: process.env.NEXT_PUBLIC_XERO_CHATBOT_URL || "http://localhost:3001",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        ),
      },
    );
  }

  return (
    <aside className={`${isExpanded ? 'w-64' : 'w-16'} bg-[#1D1D1D] flex flex-col py-4 px-3 transition-all duration-300 ease-in-out overflow-hidden`}>
      {/* Logo */}
      <Link href="/" className="mb-8 flex">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105 p-2 flex-shrink-0">
          <Image
            src="/image.png"
            alt="Logo"
            width={40}
            height={40}
            className="w-full h-full object-contain"
            unoptimized
          />
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => {
          const isExternal = item.href.startsWith("http");
          const LinkComponent = isExternal ? "a" : Link;
          const linkProps = isExternal
            ? { href: item.href, target: "_blank", rel: "noopener noreferrer" }
            : { href: item.href };

          return (
            <Button
              key={item.name}
              as={LinkComponent}
              {...linkProps}
              isIconOnly={!isExpanded}
              variant={isActive(item.href) ? "solid" : "light"}
              color={isActive(item.href) ? "primary" : "default"}
              className={`min-w-10 h-10 ${
                isExpanded ? 'w-full justify-start px-4' : 'w-10 justify-center'
              } ${isActive(item.href) ? '' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
              title={item.name}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                {isExpanded && <span className="text-sm font-medium">{item.name}</span>}
              </div>
            </Button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="flex flex-col gap-2 pt-4 border-t border-gray-700">
        <Button
          as={Link}
          href="/profile"
          isIconOnly={!isExpanded}
          variant={isActive("/profile") ? "solid" : "light"}
          color={isActive("/profile") ? "primary" : "default"}
          className={`min-w-10 h-10 ${
            isExpanded ? 'w-full justify-start px-4' : 'w-10 justify-center'
          } ${isActive("/profile") ? '' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
          title="Profile"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {isExpanded && <span className="text-sm font-medium">Profile</span>}
          </div>
        </Button>

        <Button
          isIconOnly={!isExpanded}
          variant="light"
          color="default"
          className={`min-w-10 h-10 ${
            isExpanded ? 'w-full justify-start px-4' : 'w-10 justify-center'
          } text-gray-400 hover:text-white hover:bg-white/10`}
          onPress={() => signOut({ callbackUrl: "/login" })}
          title="Logout"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {isExpanded && <span className="text-sm font-medium">Logout</span>}
          </div>
        </Button>

        {/* Toggle Expand/Collapse Button - Always at bottom, stays in place */}
        <Button
          isIconOnly={!isExpanded}
          variant="light"
          color="default"
          className={`min-w-10 h-10 ${
            isExpanded ? 'w-full justify-start px-4' : 'w-10 justify-center'
          } text-gray-400 hover:text-white hover:bg-white/10 mt-2`}
          onPress={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse" : "Expand"}
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isExpanded ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              )}
            </svg>
            {isExpanded && <span className="text-sm font-medium">Collapse</span>}
          </div>
        </Button>
      </div>
    </aside>
  );
}
