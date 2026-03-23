'use client';

import { useEffect, useRef } from 'react';
import { X, Star, GitFork, ExternalLink, Tag, BookOpen } from 'lucide-react';
import type { TrendRepo } from './TrendCard';

const categoryColors: Record<string, string> = {
  'AI / ML': 'border-purple-500/40 text-purple-400',
  'Agentic': 'border-violet-500/40 text-violet-400',
  'Security': 'border-red-500/40 text-red-400',
  'Web Framework': 'border-blue-500/40 text-blue-400',
  'DevTools': 'border-emerald-500/40 text-emerald-400',
  'Database': 'border-amber-500/40 text-amber-400',
  'Mobile': 'border-cyan-500/40 text-cyan-400',
  'Infra': 'border-orange-500/40 text-orange-400',
  'Language': 'border-pink-500/40 text-pink-400',
  'Data': 'border-teal-500/40 text-teal-400',
  'Other': 'border-gray-500/40 text-gray-400',
};

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toString();
}

export default function RepoPopup({
  repo,
  onClose,
}: {
  repo: TrendRepo;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [owner, name] = repo.full_name.split('/');
  const summaryHref = `/trends/projects/${owner}-${name}`;
  const catColor = categoryColors[repo.category] || categoryColors['Other'];

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-800 p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-gray-50 truncate">
                <span className="text-gray-500 font-normal">{owner}/</span>{name}
              </h2>
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-300 shrink-0"
              >
                <ExternalLink size={14} />
              </a>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${catColor}`}>
                {repo.category}
              </span>
              {repo.version && (
                <span className="flex items-center gap-1 text-[11px] text-gray-500 font-mono">
                  <Tag size={10} />
                  {repo.version}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1 -m-1 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Blurb or description */}
          <p className="text-sm text-gray-300 leading-relaxed">
            {repo.blurb || repo.description || 'No description available.'}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-gray-400">
              <Star size={14} className="text-yellow-500" />
              {formatNumber(repo.stars)} stars
            </span>
            <span className="flex items-center gap-1.5 text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />
              {repo.language}
            </span>
          </div>

          {/* Trend deltas */}
          <div className="grid grid-cols-4 gap-2">
            {([
              ['Today', repo.delta_day],
              ['This Week', repo.delta_week],
              ['This Month', repo.delta_month],
              ['This Year', repo.delta_year],
            ] as const).map(([label, delta]) => (
              <div key={label} className="rounded-lg bg-gray-800/60 p-2.5 text-center">
                <div className={`text-sm font-semibold tabular-nums ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                  {delta > 0 ? '+' : ''}{formatNumber(delta as number)}
                </div>
                <div className="text-[10px] text-gray-600 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-gray-800 px-5 py-3">
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ExternalLink size={12} />
            GitHub
          </a>
          {repo.has_summary && (
            <a
              href={summaryHref}
              className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              <BookOpen size={12} />
              Full Summary
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
