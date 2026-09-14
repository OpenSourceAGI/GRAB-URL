/**
 * @file page.tsx
 * @description Dynamic documentation page component that renders MDX content.
 */
import { source } from '@/lib/fumadocs/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/mdx-components';
import type { Metadata } from 'next';
import { AskAIDropdown } from '@/components/fumadocs/ai/ask-ai-dropdown';
import { LLMCopyButton } from '@/components/fumadocs/ai/llm-copy-button';
import { Breadcrumb } from '@/components/fumadocs/layout/breadcrumb';
import { docsConfig } from '@/lib/fumadocs/customize-docs';
import { getGithubLastEdit } from 'fumadocs-core/content/github';

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);

  if (!page) {
    notFound();
  }

  const data = page.data as any;
  const MDX = data.body;

  // Unauthenticated GitHub API calls are rate limited per build IP, which is
  // shared on hosted CI. Send a token when one is configured and never let a
  // failed lookup fail the build - the timestamp is decorative.
  const lastUpdate = await getGithubLastEdit({
    owner: 'vtempest',
    repo: 'grab-url',
    path: `grab-help-docs/content/docs/${page.path}`,
    token: process.env.GITHUB_TOKEN ? `Bearer ${process.env.GITHUB_TOKEN}` : undefined,
  }).catch(() => null);

  return (
    <DocsPage toc={data.toc} full={data.full} lastUpdate={lastUpdate ?? undefined}>
      <Breadcrumb tree={source.pageTree} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <div className="flex flex-row gap-2 items-center border-b pt-2 pb-6">
          <LLMCopyButton markdownUrl={`${page.url}.mdx`} />
          <AskAIDropdown
            markdownUrl={`${page.url}.mdx`}
            githubUrl={docsConfig.githubDocs ? `${docsConfig.githubDocs}/${page.path}` : undefined}
          />
        </div>

        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();
  const image = ['/docs-og', ...(params.slug ?? []), 'image.png'].join('/');

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      images: image,
    },
    twitter: {
      card: 'summary_large_image',
      images: image,
    },
  } satisfies Metadata;
}
