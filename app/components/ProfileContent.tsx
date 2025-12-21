"use client";

import { Session } from "next-auth";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardBody, Input, Button, Chip, Switch } from "@nextui-org/react";
import AdminPanel from "./AdminPanel";

interface ProfileContentProps {
  session: Session;
}

export default function ProfileContent({ session: initialSession }: ProfileContentProps) {
  const { data: session, update } = useSession();
  const currentSession = session || initialSession;
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [name, setName] = useState(currentSession.user.name || "");
  const [email, setEmail] = useState(currentSession.user.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [enableAiInsights, setEnableAiInsights] = useState(
    (currentSession.user as any).enableAiFinancialInsights || false
  );

  // Trigger session update when returning from OAuth callback
  useEffect(() => {
    const success = searchParams.get("success");
    if (success) {
      if (success === "xero-connected") {
        setMessage({ type: "success", text: "Xero connected successfully!" });
      } else if (success === "qbo-connected") {
        setMessage({ type: "success", text: "QuickBooks connected successfully!" });
      }
      // Update the session to reflect the new accountingService
      update();
      // Clean up the URL
      router.replace("/profile");
    }
  }, [searchParams, update, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Profile updated successfully!" });
        router.refresh();
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "Failed to update profile" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Password changed successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "Failed to change password" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectService = async () => {
    if (!confirm("Are you sure you want to disconnect your accounting service?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/profile/disconnect-service", {
        method: "POST",
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Service disconnected successfully!" });
        // Trigger session update to refresh accountingService
        await update();
        router.refresh();
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "Failed to disconnect service" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAiInsights = async (enabled: boolean) => {
    setEnableAiInsights(enabled);
    try {
      const response = await fetch("/api/profile/ai-insights-setting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enableAiFinancialInsights: enabled }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Setting updated successfully!" });
        await update();
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "Failed to update setting" });
        // Revert on error
        setEnableAiInsights(!enabled);
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
      // Revert on error
      setEnableAiInsights(!enabled);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#E8E7BB]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1D1D1D] border-b border-gray-800 px-6 py-4 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-semibold text-white">Profile Settings</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your account settings and preferences</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {message && (
          <div
            className={`px-6 py-4 rounded-full text-sm font-medium shadow-lg ${
              message.type === "success"
                ? "bg-green-500/20 border border-green-500/30 text-green-600"
                : "bg-red-500/20 border border-red-500/30 text-red-600"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Profile Information */}
        <Card className="bg-[#1D1D1D] rounded-3xl shadow-2xl border-none">
          <CardBody className="p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-[#E8E7BB] p-2 rounded-full">
                <div className="w-2 h-2 bg-[#1D1D1D] rounded-full"></div>
              </div>
              <h2 className="text-2xl font-bold text-white">Profile Information</h2>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Full Name</label>
                <Input
                  value={name}
                  onValueChange={setName}
                  variant="bordered"
                  isRequired
                  classNames={{
                    input: "text-white",
                    inputWrapper: "bg-white/5 border-white/10 hover:bg-white/10 rounded-xl",
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onValueChange={setEmail}
                  variant="bordered"
                  isRequired
                  classNames={{
                    input: "text-white",
                    inputWrapper: "bg-white/5 border-white/10 hover:bg-white/10 rounded-xl",
                  }}
                />
              </div>
              <Button
                type="submit"
                isLoading={loading}
                isDisabled={loading}
                className="w-full bg-[#E8E7BB] text-[#1D1D1D] font-semibold rounded-full h-12 text-base hover:bg-[#d4d3a7] transition-all shadow-lg"
              >
                Save Changes
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Change Password */}
        <Card className="bg-[#1D1D1D] rounded-3xl shadow-2xl border-none">
          <CardBody className="p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-[#E8E7BB] p-2 rounded-full">
                <div className="w-2 h-2 bg-[#1D1D1D] rounded-full"></div>
              </div>
              <h2 className="text-2xl font-bold text-white">Change Password</h2>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Current Password</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onValueChange={setCurrentPassword}
                  variant="bordered"
                  isRequired
                  classNames={{
                    input: "text-white",
                    inputWrapper: "bg-white/5 border-white/10 hover:bg-white/10 rounded-xl",
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onValueChange={setNewPassword}
                  variant="bordered"
                  isRequired
                  classNames={{
                    input: "text-white",
                    inputWrapper: "bg-white/5 border-white/10 hover:bg-white/10 rounded-xl",
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Confirm New Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onValueChange={setConfirmPassword}
                  variant="bordered"
                  isRequired
                  classNames={{
                    input: "text-white",
                    inputWrapper: "bg-white/5 border-white/10 hover:bg-white/10 rounded-xl",
                  }}
                />
              </div>
              <Button
                type="submit"
                isLoading={loading}
                isDisabled={loading}
                className="w-full bg-[#E8E7BB] text-[#1D1D1D] font-semibold rounded-full h-12 text-base hover:bg-[#d4d3a7] transition-all shadow-lg"
              >
                Change Password
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Settings */}
        <Card className="bg-[#1D1D1D] rounded-3xl shadow-2xl border-none">
          <CardBody className="p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-[#E8E7BB] p-2 rounded-full">
                <div className="w-2 h-2 bg-[#1D1D1D] rounded-full"></div>
              </div>
              <h2 className="text-2xl font-bold text-white">Settings</h2>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-white mb-1">
                    AI Financial Insights
                  </h3>
                  <p className="text-sm text-gray-400">
                    Enable AI-powered financial insights and recommendations on your dashboard
                  </p>
                </div>
                <Switch
                  isSelected={enableAiInsights}
                  onValueChange={handleToggleAiInsights}
                  classNames={{
                    base: "ml-4",
                    wrapper: "bg-white/10 group-data-[selected=true]:bg-[#E8E7BB]",
                  }}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Connected Services */}
        <Card className="bg-[#1D1D1D] rounded-3xl shadow-2xl border-none">
          <CardBody className="p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-[#E8E7BB] p-2 rounded-full">
                <div className="w-2 h-2 bg-[#1D1D1D] rounded-full"></div>
              </div>
              <h2 className="text-2xl font-bold text-white">Connected Services</h2>
            </div>
            {currentSession.user.accountingService ? (
              <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#E8E7BB] to-[#d4d3a7] rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-[#1D1D1D] font-bold text-lg">
                      {currentSession.user.accountingService === "QBO" ? "QB" : "X"}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-base text-white mb-1">
                      {currentSession.user.accountingService === "QBO"
                        ? "QuickBooks Online"
                        : "Xero"}
                    </div>
                    <Chip 
                      size="sm" 
                      className="bg-green-500/20 text-green-400 border border-green-500/30"
                    >
                      Connected
                    </Chip>
                  </div>
                </div>
                <Button
                  onPress={handleDisconnectService}
                  isLoading={loading}
                  isDisabled={loading}
                  className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-6 hover:bg-red-500/30 transition-all"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-gray-400 mb-6 text-sm">
                  No accounting service connected
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    as="a"
                    href="/api/auth/qbo/connect"
                    className="bg-white/10 text-white rounded-full px-6 hover:bg-white/20 transition-all"
                  >
                    Connect QuickBooks
                  </Button>
                  <Button
                    as="a"
                    href="/api/auth/xero/connect"
                    className="bg-[#E8E7BB] text-[#1D1D1D] font-semibold rounded-full px-6 hover:bg-[#d4d3a7] transition-all"
                  >
                    Connect Xero
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Admin Panel - Only visible to admins */}
        {currentSession.user.isAdmin && (
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-[#1D1D1D]">Admin Panel</h2>
              <p className="text-gray-600 text-sm">Manage users and system settings</p>
            </div>
            <AdminPanel />
          </div>
        )}
      </div>
    </div>
  );
}
