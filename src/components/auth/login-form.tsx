"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { discoverAuth } from "@/lib/api-client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/repos";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [registryUrl, setRegistryUrl] = useState(
    process.env.NEXT_PUBLIC_REGISTRY_URL ?? ""
  );
  const [authType, setAuthType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);

  async function handleDiscover() {
    if (!registryUrl) return;
    setDiscovering(true);
    try {
      const result = await discoverAuth(registryUrl);
      setAuthType(result.authType);
    } catch {
      setAuthType(null);
    } finally {
      setDiscovering(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        registryName: undefined,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid credentials. Please try again.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Sign in to Registry</CardTitle>
        <CardDescription>
          Enter your credentials to browse the OCI registry
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="registry">Registry URL</Label>
            <div className="flex gap-2">
              <Input
                id="registry"
                value={registryUrl}
                onChange={(e) => {
                  setRegistryUrl(e.target.value);
                  setAuthType(null);
                }}
                placeholder="https://registry.example.com"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDiscover}
                disabled={!registryUrl || discovering}
              >
                {discovering ? "..." : "Detect"}
              </Button>
            </div>
            {authType && (
              <Badge variant="secondary" className="text-xs">
                Auth: {authType}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
