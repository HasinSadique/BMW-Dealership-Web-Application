"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/models", label: "Models" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navLinkBase =
    "rounded-full px-3 py-2 text-sm font-medium text-white transition hover:bg-gradient-to-r hover:from-[rgba(67,132,229,0.5)] hover:to-[rgba(112,170,255,0.45)] hover:text-white hover:shadow-[0_6px_16px_rgba(70,135,230,0.28)]";
  const activeNavLink =
    "bg-gradient-to-r from-[rgba(67,132,229,0.5)] to-[rgba(112,170,255,0.45)] text-white shadow-[0_6px_16px_rgba(70,135,230,0.28)]";

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(132,175,238,0.35)] bg-gradient-to-r from-[rgba(18,42,78,0.94)] via-[rgba(13,32,62,0.94)] to-[rgba(8,20,42,0.94)] shadow-bmw-glow backdrop-blur-md">
      <div className="mx-auto flex h-[72px] w-[min(1120px,calc(100%-2rem))] items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/images/bmw-logo.png"
            alt="BMW logo"
            width={50}
            height={50}
            // unoptimized
            // priority
            // className="rounded-full object-contain shadow-[0_0_0_1px_rgba(189,215,255,0.45),0_0_18px_rgba(95,159,255,0.35)]"
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-extrabold tracking-[0.1em] text-white [text-shadow:0_2px_10px_rgba(79,141,230,0.35)]">
              BMW
            </span>
            <span className="text-xs text-white">Dealership</span>
          </div>
        </Link>

        <nav
          className="hidden items-center gap-4 md:flex"
          aria-label="Primary Navigation"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${navLinkBase} ${pathname === item.href ? activeNavLink : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="rounded-lg border border-[rgba(142,188,255,0.5)] bg-[rgba(70,128,214,0.28)] px-3 py-2 text-sm text-white md:hidden"
          aria-label="Open menu"
          onClick={() => setIsDrawerOpen(true)}
        >
          Menu
        </button>
      </div>

      <div
        className={`fixed inset-0 ${isDrawerOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        {isDrawerOpen && (
          <aside
            className="absolute right-0 top-0 z-[3] h-full w-[min(320px,80vw)] border-l border-white/10 bg-gradient-to-b from-[#111b2d] to-[#090f1a] p-5 transition-transform translate-x-0"
            aria-label="Mobile Navigation Drawer"
          >
            <div className="mb-4 flex items-center justify-between">
              <span>Navigation</span>
              <button
                type="button"
                className="rounded-md border border-white/20 px-2.5 py-1.5 text-sm text-slate-100"
                onClick={() => setIsDrawerOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="flex flex-col gap-2.5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${navLinkBase} ${pathname === item.href ? activeNavLink : ""}`}
                  onClick={() => setIsDrawerOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </aside>
        )}

        <button
          type="button"
          aria-label="Close menu overlay"
          className="absolute inset-0 z-[2] border-0 bg-black/50"
          onClick={() => setIsDrawerOpen(false)}
        />
      </div>
    </header>
  );
}
