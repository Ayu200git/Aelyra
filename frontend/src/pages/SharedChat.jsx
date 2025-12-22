import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Message from "@/components/Message";
import api from "@/lib/api";

export default function SharedChat() {
  const { token } = useParams();
  const [chat, setChat] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSharedChat = async () => {
      try {
        const response = await api.get(`/chat/shared/${token}`);
        setChat(response.data.chat);
      } catch (error) {
        console.error("Failed to fetch shared chat:", error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSharedChat();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Chat Not Found</h2>
          <p className="text-muted-foreground">This chat may have been deleted or the link is invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{chat.title}</h1>
        <p className="text-sm text-muted-foreground">Read-only shared chat</p>
      </div>
      <div className="space-y-0">
        {chat.messages?.map((msg, idx) => (
          <Message
            key={idx}
            message={msg}
            messageIndex={idx}
            chatId={chat.id}
            canRegenerate={false}
          />
        ))}
      </div>
    </div>
  );
}

