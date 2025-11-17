import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Sidebar from "./components/Sidebar";
import DashboardContent from "./components/DashboardContent";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar accountingService={session.user.accountingService} />
      <DashboardContent session={session} />
    </div>
  );
}

