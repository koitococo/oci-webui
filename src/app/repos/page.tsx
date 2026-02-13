import { RepoList } from "@/components/repos/repo-list";

export default function ReposPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Repositories</h1>
      <RepoList />
    </div>
  );
}
