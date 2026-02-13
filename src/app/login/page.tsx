import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getRegistries } from "@/lib/config";

export default function LoginPage() {
  const registries = getRegistries();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-2">
          <Package className="h-8 w-8" />
          <h1 className="text-2xl font-bold">OCI Registry WebUI</h1>
        </div>
        <Suspense fallback={<Skeleton className="h-96 w-96" />}>
          <LoginForm registries={registries.map((r) => r.name)} />
        </Suspense>
      </div>
    </div>
  );
}
