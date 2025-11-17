"use client";

import { Session } from "next-auth";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Input, Button, Chip } from "@nextui-org/react";

interface ProfileContentProps {
  session: Session;
}

export default function ProfileContent({ session }: ProfileContentProps) {
  const [name, setName] = useState(session.user.name || "");
  const [email, setEmail] = useState(session.user.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

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

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#1D1D1D]">Profile Settings</h1>
          <p className="text-gray-600 text-sm mt-1">Manage your account settings and preferences</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {message && (
          <div
            className={`px-4 py-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-success-50 border border-success-200 text-success-700"
                : "bg-danger-50 border border-danger-200 text-danger-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Profile Information */}
        <Card className="border border-gray-100 shadow-sm">
          <CardBody className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-[#1D1D1D]">Profile Information</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <Input
                label="Name"
                value={name}
                onValueChange={setName}
                variant="bordered"
                isRequired
              />
              <Input
                type="email"
                label="Email"
                value={email}
                onValueChange={setEmail}
                variant="bordered"
                isRequired
              />
              <Button
                type="submit"
                color="primary"
                isLoading={loading}
                isDisabled={loading}
              >
                Save Changes
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Change Password */}
        <Card className="border border-gray-100 shadow-sm">
          <CardBody className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-[#1D1D1D]">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <Input
                type="password"
                label="Current Password"
                value={currentPassword}
                onValueChange={setCurrentPassword}
                variant="bordered"
                isRequired
              />
              <Input
                type="password"
                label="New Password"
                value={newPassword}
                onValueChange={setNewPassword}
                variant="bordered"
                isRequired
              />
              <Input
                type="password"
                label="Confirm New Password"
                value={confirmPassword}
                onValueChange={setConfirmPassword}
                variant="bordered"
                isRequired
              />
              <Button
                type="submit"
                color="primary"
                isLoading={loading}
                isDisabled={loading}
              >
                Change Password
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Connected Services */}
        <Card className="border border-gray-100 shadow-sm">
          <CardBody className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-[#1D1D1D]">Connected Services</h2>
            {session.user.accountingService ? (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-[#1D1D1D] font-semibold text-sm">
                      {session.user.accountingService === "QBO" ? "QB" : "X"}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-sm text-[#1D1D1D]">
                      {session.user.accountingService === "QBO"
                        ? "QuickBooks Online"
                        : "Xero"}
                    </div>
                    <Chip size="sm" color="success" variant="flat" className="mt-1">
                      Connected
                    </Chip>
                  </div>
                </div>
                <Button
                  color="danger"
                  variant="flat"
                  size="sm"
                  onPress={handleDisconnectService}
                  isLoading={loading}
                  isDisabled={loading}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4 text-sm">
                  No accounting service connected
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    as="a"
                    href="/api/auth/qbo/connect"
                    color="primary"
                    variant="flat"
                    size="sm"
                  >
                    Connect QuickBooks
                  </Button>
                  <Button
                    as="a"
                    href="/api/auth/xero/connect"
                    color="primary"
                    size="sm"
                  >
                    Connect Xero
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
