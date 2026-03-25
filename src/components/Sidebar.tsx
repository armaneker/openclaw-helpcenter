'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { navigation, NavItem } from '@/lib/navigation';

/** Normalize paths for comparison — strip trailing slash */
function normalizePath(path: string) {
  return path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
}

function NavSection({ item }: { item: NavItem }) {
  const pathname = normalizePath(usePathname());
  const isActive = pathname === item.href || item.children?.some(c => pathname === c.href);
  // Also match sub-paths (e.g. /skills/anatomy matches /skills parent)
  const isInSection = pathname.startsWith(item.href + '/') || pathname === item.href;

  if (!item.children) {
    return (
      <Link
        href={item.href}
        className={`sidebar-link ${pathname === item.href ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
      >
        {item.title}
      </Link>
    );
  }

  // Auto-open if any child or the section itself is active
  const shouldOpen = isActive || isInSection;

  return (
    <div>
      <button
        onClick={() => {/* toggle handled by Link navigation */}}
        className={`flex w-full items-center justify-between px-3 py-1.5 text-sm rounded-md transition-colors ${
          isInSection ? 'text-gray-100 bg-gray-800/30' : 'text-gray-300 hover:text-gray-100 hover:bg-gray-800/50'
        }`}
      >
        <Link href={item.href} className="font-medium flex-1 text-left">
          {item.title}
        </Link>
        <ChevronRight
          size={14}
          className={`transition-transform ${shouldOpen ? 'rotate-90' : ''}`}
        />
      </button>
      {shouldOpen && (
        <div className="ml-3 mt-0.5 border-l border-gray-800 pl-2 space-y-0.5">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={`sidebar-link ${pathname === child.href ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
            >
              {child.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`
          fixed top-14 bottom-0 z-40 w-64 border-r border-gray-800 bg-gray-950 overflow-y-auto
          transition-transform lg:translate-x-0 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:shrink-0 lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <nav className="p-4 space-y-1">
          {navigation.map((item) => (
            <NavSection key={item.href} item={item} />
          ))}
        </nav>
      </aside>
    </>
  );
}
