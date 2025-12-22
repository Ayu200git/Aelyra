import ChatSidebar from "@/components/ChatSidebar";
import ChatArea from "@/components/ChatArea";
import { useAppSelector } from "@/hooks/redux";

export default function Home() {
  const { isAuthenticated, loading: authLoading } = useAppSelector((state) => state.auth);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] md:h-screen w-full overflow-hidden">
      <ChatSidebar />
      <div className="flex-1 flex flex-col min-h-0">
        <ChatArea />
      </div>
    </div>
  );
}
