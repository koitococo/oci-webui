import { LoginForm } from "@/components/auth/login-form";
import { Package } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-2">
          <Package className="h-8 w-8" />
          <h1 className="text-2xl font-bold">OCI Registry WebUI</h1>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
