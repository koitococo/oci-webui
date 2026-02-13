import { TagList } from "@/components/tags/tag-list";
import { ManifestDetail } from "@/components/manifests/manifest-detail";
import { Breadcrumb } from "@/components/layout/breadcrumb";

function parseSlug(segments: string[]): {
  repoName: string;
  tag?: string;
} {
  const tagIndex = segments.indexOf("_tag");
  if (tagIndex >= 0 && tagIndex < segments.length - 1) {
    return {
      repoName: segments.slice(0, tagIndex).join("/"),
      tag: segments[tagIndex + 1],
    };
  }
  return { repoName: segments.join("/") };
}

export default async function RepoPage({
  params,
}: {
  params: Promise<{ name: string[] }>;
}) {
  const { name } = await params;
  const { repoName, tag } = parseSlug(name);

  if (tag) {
    return (
      <div>
        <Breadcrumb
          items={[
            { label: "Repositories", href: "/repos" },
            { label: repoName, href: `/repos/${repoName}` },
            { label: tag },
          ]}
        />
        <h1 className="mb-6 text-2xl font-bold">
          {repoName}
          <span className="text-muted-foreground">:{tag}</span>
        </h1>
        <ManifestDetail repoName={repoName} tag={tag} />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Repositories", href: "/repos" },
          { label: repoName },
        ]}
      />
      <h1 className="mb-6 text-2xl font-bold">{repoName}</h1>
      <TagList repoName={repoName} />
    </div>
  );
}
