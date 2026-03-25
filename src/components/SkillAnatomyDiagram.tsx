'use client';

import { useState } from 'react';
import { X, FileText, FolderOpen, Code, Hash, AlignLeft, Layers, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface InfoPanel {
  title: string;
  description: string;
  details: string[];
  link: string;
  linkLabel: string;
  color: string;
  borderColor: string;
}

const panels: Record<string, InfoPanel> = {
  'skill-md': {
    title: 'SKILL.md',
    description: 'The only required file. Contains both the YAML frontmatter (metadata) and the markdown body (instructions). This is the entry point — the agent reads this file to understand what the skill does and how to execute it.',
    details: [
      'YAML frontmatter at the top for discovery (~100 tokens)',
      'Markdown body below for full instructions (<5,000 tokens)',
      'Steps, Guidelines, and Output format sections',
    ],
    link: '/skills/anatomy',
    linkLabel: 'Anatomy of a Skill',
    color: 'bg-emerald-950',
    borderColor: 'border-emerald-500/50',
  },
  'references': {
    title: 'references/',
    description: 'Optional directory for large, static content that would waste context window space if loaded upfront. The agent pulls these files only when a specific step references them.',
    details: [
      'API documentation and endpoint schemas',
      'Business rules and calculation methodologies',
      'Few-shot examples and output templates',
      'Lookup tables and static datasets',
    ],
    link: '/skills/references',
    linkLabel: 'References guide',
    color: 'bg-gray-800',
    borderColor: 'border-gray-500/50',
  },
  'scripts': {
    title: 'scripts/',
    description: 'Optional directory for executable code — Python, Node.js, shell scripts. Used when the skill needs deterministic results: API calls, calculations, data parsing, validation.',
    details: [
      'API integration scripts',
      'Calculation engines and scoring logic',
      'Data parsers and format converters',
      'Validation and rule-checking scripts',
    ],
    link: '/skills/scripts',
    linkLabel: 'Scripts guide',
    color: 'bg-gray-800',
    borderColor: 'border-gray-500/50',
  },
  'frontmatter': {
    title: 'YAML Frontmatter',
    description: 'The metadata block at the top of SKILL.md. The agent reads this at all times (Tier 1) to decide whether the skill is relevant. The description field is the most critical line — it determines trigger accuracy.',
    details: [
      'name: unique identifier, max 64 characters (kebab-case)',
      'description: what the skill does + trigger phrases, max 1024 chars',
      'tools: optional list of allowed tools',
    ],
    link: '/skills/frontmatter',
    linkLabel: 'Frontmatter guide',
    color: 'bg-blue-950',
    borderColor: 'border-blue-500/50',
  },
  'body': {
    title: 'Markdown Body',
    description: 'The instruction set below the frontmatter. Loaded when the skill is triggered (Tier 2). Contains numbered steps, cross-cutting guidelines, and output formatting rules.',
    details: [
      '## Steps — numbered, sequential actions with conditions',
      '## Guidelines — rules that apply across all steps',
      '## Output format — how the result should look',
    ],
    link: '/skills/steps',
    linkLabel: 'Writing Steps guide',
    color: 'bg-orange-950',
    borderColor: 'border-orange-500/50',
  },
  'tier1': {
    title: 'Tier 1 — Always Loaded',
    description: 'The agent keeps the YAML frontmatter of every skill in memory at all times. For 50 skills, that\'s only ~5,000 tokens. The agent scans descriptions to find which skill matches the user\'s query.',
    details: [
      '~100 tokens per skill',
      'Only name + description are visible',
      'Skill discovery happens here',
      'Bad description = skill never triggers',
    ],
    link: '/skills/progressive-loading',
    linkLabel: 'Progressive Loading guide',
    color: 'bg-green-950',
    borderColor: 'border-green-500/50',
  },
  'tier2': {
    title: 'Tier 2 — Loaded When Triggered',
    description: 'When a skill matches, the full markdown body loads into context. Only the matched skill loads — not all of them. This contains the actual step-by-step instructions.',
    details: [
      '<5,000 tokens per skill',
      'Full Steps + Guidelines + Output format',
      'Query matched against description in Tier 1',
      'Working instructions for the agent',
    ],
    link: '/skills/progressive-loading',
    linkLabel: 'Progressive Loading guide',
    color: 'bg-amber-950',
    borderColor: 'border-amber-500/50',
  },
  'tier3': {
    title: 'Tier 3 — Loaded On Demand',
    description: 'When a step references a file in references/ or scripts/, it loads at that point — not before. After the step completes, the content can be released. This is how thousands of skills coexist without destroying performance.',
    details: [
      'Variable token size per file',
      'Loaded only when a step needs it',
      'references/ = read into context',
      'scripts/ = executed, output returned',
    ],
    link: '/skills/progressive-loading',
    linkLabel: 'Progressive Loading guide',
    color: 'bg-red-950',
    borderColor: 'border-red-500/50',
  },
};

function DiagramBox({
  id,
  label,
  sublabel,
  icon: Icon,
  bgClass,
  borderClass,
  textClass,
  subTextClass,
  active,
  onClick,
}: {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  bgClass: string;
  borderClass: string;
  textClass: string;
  subTextClass: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center rounded-lg border p-4 transition-all cursor-pointer text-center min-h-[90px] ${bgClass} ${borderClass} ${
        active ? 'ring-2 ring-white/30 scale-[1.02]' : 'hover:ring-1 hover:ring-white/20'
      }`}
    >
      <Icon size={18} className={`${textClass} mb-1.5`} />
      <span className={`text-sm font-medium ${textClass}`}>{label}</span>
      <span className={`text-[11px] mt-0.5 ${subTextClass}`}>{sublabel}</span>
    </button>
  );
}

export default function SkillAnatomyDiagram() {
  const [active, setActive] = useState<string | null>(null);
  const panel = active ? panels[active] : null;

  return (
    <div className="not-prose my-8">
      <div className="space-y-6">
        {/* Section 1: Skill Package */}
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-mono text-indigo-400/70 bg-indigo-500/10 px-1.5 py-0.5 rounded">1</span>
            <span className="text-sm font-medium text-indigo-300">Skill Package</span>
            <span className="text-xs text-indigo-500">Folder structure</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <DiagramBox
              id="skill-md"
              label="SKILL.md"
              sublabel="Required"
              icon={FileText}
              bgClass="bg-emerald-950/60"
              borderClass="border-emerald-500/40"
              textClass="text-emerald-300"
              subTextClass="text-emerald-500"
              active={active === 'skill-md'}
              onClick={() => setActive(active === 'skill-md' ? null : 'skill-md')}
            />
            <DiagramBox
              id="references"
              label="references/"
              sublabel="Optional"
              icon={FolderOpen}
              bgClass="bg-gray-800/60"
              borderClass="border-gray-600/40"
              textClass="text-gray-300"
              subTextClass="text-gray-500"
              active={active === 'references'}
              onClick={() => setActive(active === 'references' ? null : 'references')}
            />
            <DiagramBox
              id="scripts"
              label="scripts/"
              sublabel="Optional"
              icon={Code}
              bgClass="bg-gray-800/60"
              borderClass="border-gray-600/40"
              textClass="text-gray-300"
              subTextClass="text-gray-500"
              active={active === 'scripts'}
              onClick={() => setActive(active === 'scripts' ? null : 'scripts')}
            />
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ChevronRight size={20} className="text-gray-600 rotate-90" />
        </div>

        {/* Section 2: SKILL.md Contents */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-mono text-emerald-400/70 bg-emerald-500/10 px-1.5 py-0.5 rounded">2</span>
            <span className="text-sm font-medium text-emerald-300">SKILL.md Contents</span>
            <span className="text-xs text-emerald-500">Two sections</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DiagramBox
              id="frontmatter"
              label="YAML Frontmatter"
              sublabel="name, description, tools"
              icon={Hash}
              bgClass="bg-blue-950/60"
              borderClass="border-blue-500/40"
              textClass="text-blue-300"
              subTextClass="text-blue-500"
              active={active === 'frontmatter'}
              onClick={() => setActive(active === 'frontmatter' ? null : 'frontmatter')}
            />
            <DiagramBox
              id="body"
              label="Markdown Body"
              sublabel="Steps, Guidelines, Output"
              icon={AlignLeft}
              bgClass="bg-orange-950/60"
              borderClass="border-orange-500/40"
              textClass="text-orange-300"
              subTextClass="text-orange-500"
              active={active === 'body'}
              onClick={() => setActive(active === 'body' ? null : 'body')}
            />
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ChevronRight size={20} className="text-gray-600 rotate-90" />
        </div>

        {/* Section 3: Progressive Loading */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-mono text-amber-400/70 bg-amber-500/10 px-1.5 py-0.5 rounded">3</span>
            <span className="text-sm font-medium text-amber-300">Progressive Loading</span>
            <span className="text-xs text-amber-500">Context window efficiency</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <DiagramBox
              id="tier1"
              label="Tier 1"
              sublabel="Always loaded · ~100 tokens"
              icon={Layers}
              bgClass="bg-green-950/60"
              borderClass="border-green-500/40"
              textClass="text-green-300"
              subTextClass="text-green-500"
              active={active === 'tier1'}
              onClick={() => setActive(active === 'tier1' ? null : 'tier1')}
            />
            <DiagramBox
              id="tier2"
              label="Tier 2"
              sublabel="On trigger · <5K tokens"
              icon={Layers}
              bgClass="bg-amber-950/60"
              borderClass="border-amber-500/40"
              textClass="text-amber-300"
              subTextClass="text-amber-500"
              active={active === 'tier2'}
              onClick={() => setActive(active === 'tier2' ? null : 'tier2')}
            />
            <DiagramBox
              id="tier3"
              label="Tier 3"
              sublabel="On demand · variable"
              icon={Layers}
              bgClass="bg-red-950/60"
              borderClass="border-red-500/40"
              textClass="text-red-300"
              subTextClass="text-red-500"
              active={active === 'tier3'}
              onClick={() => setActive(active === 'tier3' ? null : 'tier3')}
            />
          </div>
        </div>
      </div>

      {/* Info Panel */}
      {panel && (
        <div className={`mt-4 rounded-xl border ${panel.borderColor} ${panel.color} p-5 relative`}>
          <button
            onClick={() => setActive(null)}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={16} />
          </button>
          <h3 className="text-base font-semibold text-gray-100 mb-2">{panel.title}</h3>
          <p className="text-sm text-gray-400 leading-relaxed mb-3">{panel.description}</p>
          <ul className="space-y-1 mb-4">
            {panel.details.map((d) => (
              <li key={d} className="text-xs text-gray-500 flex items-start gap-2">
                <span className="text-gray-600 mt-0.5">-</span>
                {d}
              </li>
            ))}
          </ul>
          <Link
            href={panel.link}
            className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            Read the {panel.linkLabel} <ChevronRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}
