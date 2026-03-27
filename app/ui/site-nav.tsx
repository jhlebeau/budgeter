"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const setupDropdownLinks = [
  { href: "/income", label: "Income" },
  { href: "/categories", label: "Spending" },
  { href: "/savings-categories", label: "Savings" },
];

const navLinks = [
  { href: "/home", label: "Home", match: ["/home"] },
  { href: "/transactions", label: "Transactions", match: ["/transactions"] },
  { href: "/spending", label: "Spending", match: ["/spending"] },
  { href: "/settings", label: "Settings", match: ["/settings"] },
];

const setupMatch = ["/setup", "/income", "/categories", "/savings-categories"];

export function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSetupActive = setupMatch.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );

  function cancelClose() {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleClose() {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setDropdownOpen(false), 120);
  }

  function openDropdown() {
    cancelClose();
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 6, left: rect.left });
    }
    setDropdownOpen(true);
  }

  useEffect(() => {
    return () => cancelClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  function handleSetupClick() {
    if (dropdownOpen) {
      router.push("/setup");
      setDropdownOpen(false);
    } else {
      openDropdown();
    }
  }

  const homeLink = navLinks[0];
  const restLinks = navLinks.slice(1);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2.5 sm:px-6 lg:px-8">
        {/* Home */}
        <Link
          href={homeLink.href}
          className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
            homeLink.match.some(
              (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
            )
              ? "bg-white/10 text-slate-50"
              : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
          }`}
        >
          {homeLink.label}
        </Link>

        {/* Setup with dropdown */}
        <div
          className="shrink-0"
          onMouseEnter={openDropdown}
          onMouseLeave={scheduleClose}
        >
          <button
            ref={buttonRef}
            type="button"
            onClick={handleSetupClick}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              isSetupActive
                ? "bg-white/10 text-slate-50"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            Setup
          </button>
        </div>

        {/* Remaining nav links */}
        {restLinks.map((link) => {
          const isActive = link.match.some(
            (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
          );
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "bg-white/10 text-slate-50"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {dropdownOpen &&
        createPortal(
          <div
            style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left }}
            className="z-50 min-w-[140px] rounded-2xl border border-white/10 bg-slate-950/95 py-1.5 shadow-[0_16px_48px_-12px_rgba(2,6,23,0.8)] backdrop-blur-xl"
            onMouseEnter={openDropdown}
            onMouseLeave={scheduleClose}
          >
            {setupDropdownLinks.map((item) => {
              const isItemActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-1.5 text-sm font-medium transition ${
                    isItemActive
                      ? "text-slate-50"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>,
          document.body,
        )}
    </nav>
  );
}
