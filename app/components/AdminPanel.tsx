"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardBody,
  Input,
  Button,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
} from "@nextui-org/react";

interface User {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  accountingService: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPanel() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        const errorData = await response.json();
        setMessage({ type: "error", text: errorData.error || "Failed to fetch users" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred while fetching users" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          isAdmin,
        }),
      });

      if (response.ok) {
        const newUser = await response.json();
        setUsers([newUser, ...users]);
        setMessage({ type: "success", text: "User created successfully!" });
        
        // Reset form
        setName("");
        setEmail("");
        setPassword("");
        setIsAdmin(false);
      } else {
        const errorData = await response.json();
        setMessage({ type: "error", text: errorData.error || "Failed to create user" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred while creating user" });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string | null) => {
    if (!confirm(`Are you sure you want to delete user "${userName || 'this user'}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingUserId(userId);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setUsers(users.filter((user) => user.id !== userId));
        setMessage({ type: "success", text: "User deleted successfully!" });
      } else {
        const errorData = await response.json();
        setMessage({ type: "error", text: errorData.error || "Failed to delete user" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred while deleting user" });
    } finally {
      setDeletingUserId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
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

      {/* Create User Form */}
      <Card className="bg-[#1D1D1D] rounded-3xl shadow-2xl border-none">
        <CardBody className="p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-[#E8E7BB] p-2 rounded-full">
              <div className="w-2 h-2 bg-[#1D1D1D] rounded-full"></div>
            </div>
            <h2 className="text-2xl font-bold text-white">Create New User</h2>
          </div>
          
          <form onSubmit={handleCreateUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">
                  Full Name
                </label>
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
                <label className="text-sm font-medium text-gray-400 mb-2 block">
                  Email Address
                </label>
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
            </div>

            <div>
              <label className="text-sm font-medium text-gray-400 mb-2 block">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onValueChange={setPassword}
                variant="bordered"
                isRequired
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-white/5 border-white/10 hover:bg-white/10 rounded-xl",
                }}
              />
            </div>

            <div>
              <Checkbox
                isSelected={isAdmin}
                onValueChange={setIsAdmin}
                classNames={{
                  base: "text-white",
                  label: "text-gray-300",
                }}
              >
                Admin User
              </Checkbox>
            </div>

            <Button
              type="submit"
              isLoading={creating}
              isDisabled={creating}
              className="w-full bg-[#E8E7BB] text-[#1D1D1D] font-semibold rounded-full h-12 text-base hover:bg-[#d4d3a7] transition-all shadow-lg"
            >
              Create User
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Users Table */}
      <Card className="bg-[#1D1D1D] rounded-3xl shadow-2xl border-none">
        <CardBody className="p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-[#E8E7BB] p-2 rounded-full">
              <div className="w-2 h-2 bg-[#1D1D1D] rounded-full"></div>
            </div>
            <h2 className="text-2xl font-bold text-white">All Users</h2>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8E7BB]"></div>
              <p className="text-gray-400 mt-4">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table
                aria-label="Users table"
                classNames={{
                  wrapper: "bg-transparent shadow-none",
                  th: "bg-white/5 text-gray-400 font-semibold",
                  td: "text-white",
                }}
              >
                <TableHeader>
                  <TableColumn>NAME</TableColumn>
                  <TableColumn>EMAIL</TableColumn>
                  <TableColumn>ACCOUNTING SERVICE</TableColumn>
                  <TableColumn>ROLE</TableColumn>
                  <TableColumn>CREATED</TableColumn>
                  <TableColumn>ACTIONS</TableColumn>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name || "N/A"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.accountingService ? (
                          <Chip
                            size="sm"
                            className="bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          >
                            {user.accountingService === "QBO" ? "QuickBooks" : "Xero"}
                          </Chip>
                        ) : (
                          <span className="text-gray-500">Not connected</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.isAdmin ? (
                          <Chip
                            size="sm"
                            className="bg-purple-500/20 text-purple-400 border border-purple-500/30"
                          >
                            Admin
                          </Chip>
                        ) : (
                          <Chip
                            size="sm"
                            className="bg-gray-500/20 text-gray-400 border border-gray-500/30"
                          >
                            User
                          </Chip>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          isIconOnly
                          onPress={() => handleDeleteUser(user.id, user.name)}
                          isLoading={deletingUserId === user.id}
                          isDisabled={deletingUserId === user.id || user.id === session?.user?.id}
                          className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all min-w-8 h-8"
                        >
                          {deletingUserId === user.id ? null : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

