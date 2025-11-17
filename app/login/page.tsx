"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Input, Button } from "@nextui-org/react";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4">
      <Card className="w-full max-w-md shadow-xl border border-gray-100">
        <CardBody className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-4 shadow-md p-3">
              <Image
                src="/image.png"
                alt="Logo"
                width={64}
                height={64}
                className="w-full h-full object-contain"
                unoptimized
              />
            </div>
            <h1 className="text-2xl font-bold text-[#1D1D1D]">Writeoff</h1>
            <p className="text-gray-600 mt-2 text-sm">
              Welcome back! Please login to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Input
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onValueChange={setEmail}
              variant="bordered"
              isRequired
              classNames={{
                input: "text-sm",
                label: "text-sm",
              }}
            />

            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onValueChange={setPassword}
              variant="bordered"
              isRequired
              classNames={{
                input: "text-sm",
                label: "text-sm",
              }}
            />

            <Button
              type="submit"
              color="primary"
              className="w-full font-medium"
              size="lg"
              isLoading={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              Don't have an account?{" "}
              <span className="text-primary-600 font-medium">
                Contact your administrator
              </span>
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
