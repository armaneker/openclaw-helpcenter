import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
import Callout from '@/components/Callout';
import GuideHeader from '@/components/GuideHeader';
import SkillAnatomyDiagram from '@/components/SkillAnatomyDiagram';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Callout,
    GuideHeader,
    SkillAnatomyDiagram,
    a: ({ href, children, ...props }) => {
      if (href && href.startsWith('/')) {
        return <Link href={href} {...props}>{children}</Link>;
      }
      return <a href={href} {...props}>{children}</a>;
    },
    ...components,
  };
}
