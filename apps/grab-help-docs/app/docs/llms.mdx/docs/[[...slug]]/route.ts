import { getLLMText, source } from "@/lib/fumadocs/source";
import { notFound } from "next/navigation";

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  const cleanSlug = slug?.map((s, i) => i === slug.length - 1 ? s.replace(/\.mdx$/, '') : s);
  const page = source.getPage(cleanSlug);
  if (!page) notFound();

  return new Response(await getLLMText(page), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export function generateStaticParams() {
  const params = source.generateParams();

  if (process.env.DOCS_STATIC_EXPORT !== "1") return params;

  // A static export writes this extensionless route handler to one plain file per
  // slug. Any slug that is also the prefix of a deeper one -- the docs root, and
  // section indexes such as `openapi-services` -- would have to be a file and the
  // directory holding its children at the same time, and Next fails the export with
  // "EISDIR: illegal operation on a directory". Drop those; server deployments keep
  // them and still serve each index page as text.
  const prefixes = new Set<string>();
  for (const { slug = [] } of params) {
    for (let i = 0; i < slug.length; i++) prefixes.add(slug.slice(0, i).join("/"));
  }

  return params.filter(({ slug = [] }) => !prefixes.has(slug.join("/")));
}
