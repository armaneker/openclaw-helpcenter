import { AlertTriangle, Info, Lightbulb, AlertOctagon } from 'lucide-react';
import { ReactNode } from 'react';

const variants = {
  info: {
    icon: Info,
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/5',
    iconColor: 'text-blue-400',
    title: 'Info',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-yellow-500/30',
    bg: 'bg-yellow-500/5',
    iconColor: 'text-yellow-400',
    title: 'Warning',
  },
  tip: {
    icon: Lightbulb,
    border: 'border-green-500/30',
    bg: 'bg-green-500/5',
    iconColor: 'text-green-400',
    title: 'Tip',
  },
  danger: {
    icon: AlertOctagon,
    border: 'border-red-500/30',
    bg: 'bg-red-500/5',
    iconColor: 'text-red-400',
    title: 'Danger',
  },
};

interface CalloutProps {
  type?: keyof typeof variants;
  title?: string;
  children: ReactNode;
}

export default function Callout({ type = 'info', title, children }: CalloutProps) {
  const v = variants[type];
  const Icon = v.icon;

  return (
    <div className={`my-6 rounded-lg border ${v.border} ${v.bg} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={v.iconColor} />
        <span className={`text-sm font-semibold ${v.iconColor}`}>
          {title || v.title}
        </span>
      </div>
      <div className="text-sm text-gray-300 [&>p]:m-0">{children}</div>
    </div>
  );
}
