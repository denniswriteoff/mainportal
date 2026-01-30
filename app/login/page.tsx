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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0f0f] via-[#171714] to-[#1a1a1a] p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-[#1D1D1D] opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#1D1D1D] opacity-5 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-lg relative z-10">
        <CardBody className="p-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#E8E7BB] to-[#d4d3a7] rounded-2xl mb-6 shadow-lg p-4">
              <Image
                src="/image.png"
                alt="Logo"
                width={64}
                height={64}
                className="w-full h-full object-contain "
                unoptimized
              />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-wide">Writeoff</h1>
            <p className="text-white/60 text-sm">
              Welcome back! Please login to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-5 py-3 rounded-full text-sm font-medium text-center">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-400 mb-2 block">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onValueChange={setEmail}
                variant="bordered"
                isRequired
                classNames={{
                  input: "text-white text-base placeholder-white/40",
                  inputWrapper: "bg-white/5 border-white/10 hover:bg-white/10 rounded-xl h-12",
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-400 mb-2 block">
                Password
              </label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onValueChange={setPassword}
                variant="bordered"
                isRequired
                classNames={{
                  input: "text-white text-base placeholder-white/40",
                  inputWrapper: "bg-white/5 border-white/10 hover:bg-white/10 rounded-xl h-12",
                }}
              />
            </div>

            <Button
              type="submit"
              isLoading={loading}
              className="w-full bg-[#E8E7BB] text-[#1D1D1D] font-semibold rounded-lg h-12 text-base hover:bg-[#d4d3a7] transition-all shadow-md mt-6"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm">
            <p className="text-gray-400">
              Don't have an account?{" "}
              <span className="text-[#E8E7BB] font-semibold cursor-pointer hover:text-[#d4d3a7] transition-colors">
                Contact your administrator
              </span>
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
