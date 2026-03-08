export interface NavItem {
  title: string;
  href: string;
  children?: NavItem[];
}

export const navigation: NavItem[] = [
  {
    title: 'Getting Started',
    href: '/getting-started',
  },
  {
    title: 'Architecture',
    href: '/architecture',
    children: [
      { title: 'Overview', href: '/architecture' },
      { title: 'Agent Roles', href: '/architecture/agent-roles' },
      { title: 'Communication', href: '/architecture/communication' },
      { title: 'Configuration', href: '/architecture/configuration' },
      { title: 'Security', href: '/architecture/security' },
    ],
  },
  {
    title: 'Guides',
    href: '/guides',
    children: [
      { title: 'Create a Slack Agent', href: '/guides/create-slack-agent' },
      { title: 'Deployment', href: '/guides/deployment' },
    ],
  },
  {
    title: 'CLI Reference',
    href: '/reference/cli',
  },
];
