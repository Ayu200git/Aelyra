
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Image as ImageIcon, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Message from "./Message";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { sendMessage, createChat, addUserMessage } from "@/store/slices/chatSlice";

export default function ChatArea() {
  const [message, setMessage] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const dispatch = useAppDispatch();
  const { currentChat, streaming, loading } = useAppSelector((state) => state.chat);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChat?.messages, streaming]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleNewChat();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const WORD_LIMIT = 200;
  const [wordLimitExceeded, setWordLimitExceeded] = useState(false);
  const [editingLastUserMessage, setEditingLastUserMessage] = useState(false);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size must be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setImageFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview("");
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleNewChat = async () => {
    const result = await dispatch(createChat({ title: "New Chat" }));
    if (createChat.fulfilled.match(result)) {
      setMessage("");
      removeImage();
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!message.trim() && !imageFile) || streaming || loading) return;

    const messageText = message.trim();
    if (!messageText && !imageFile) return;

    let chatId = currentChat?.id || currentChat?._id;

    if (!chatId) {
      const result = await dispatch(createChat({ title: messageText.substring(0, 50) || "New Chat" }));
      if (createChat.fulfilled.match(result)) {
        chatId = result.payload.id || result.payload._id;
      } else {
        alert("Failed to create chat");
        return;
      }
    }

    dispatch(addUserMessage({
      chatId,
      message: messageText,
      imageUrl: imagePreview || "",
    }));

    const messageToSend = messageText;
    setMessage("");
    removeImage();

    await dispatch(sendMessage({
      message: messageToSend,
      chatId,
      imageFile: imageFile,
      regenerate: false,
    }));
  };

  const handleRegenerate = async () => {
    if (!currentChat || streaming || loading) return;

    const lastUserMessage = [...currentChat.messages]
      .reverse()
      .find((msg) => msg.role === "user");

    if (!lastUserMessage) return;

    await dispatch(sendMessage({
      message: lastUserMessage.content,
      chatId: currentChat.id || currentChat._id,
      imageFile: lastUserMessage.imageUrl ? { dataUrl: lastUserMessage.imageUrl } : null,
      regenerate: true,
    }));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleTextareaKeyDown = (e) => {
    if (e.key === "ArrowUp") {
      const trimmed = message.trim();
      if (!trimmed) {
        const lastUserMessage = [...(currentChat?.messages || [])]
          .reverse()
          .find((m) => m.role === "user");
        if (lastUserMessage) {
          e.preventDefault();
          setMessage(lastUserMessage.content || "");
          setEditingLastUserMessage(true);
        }
      }
    }
  };

  if (!currentChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-3xl font-bold">Welcome to Aelyra</h2>
          <p className="text-muted-foreground text-lg">
            Start a new conversation or select an existing chat from the sidebar
          </p>
          <Button onClick={handleNewChat} size="lg">
            Start New Chat
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full bg-background">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {!currentChat?.messages || currentChat.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">{currentChat.title || "New Chat"}</h2>
              <p className="text-muted-foreground">
                Start the conversation by sending a message
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {currentChat.messages && currentChat.messages.map((msg, idx) => (
              <Message
                key={idx}
                message={msg}
                messageIndex={idx}
                chatId={currentChat.id || currentChat._id}
                canRegenerate={
                  idx === currentChat.messages.length - 1 &&
                  msg.role === "assistant" &&
                  !streaming
                }
                onRegenerate={handleRegenerate}
              />
            ))}
            {streaming && (
              <div className="flex gap-4 p-4 bg-muted/30">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <Loader2 className="w-5 h-5 text-secondary-foreground animate-spin" />
                </div>
                <div className="flex-1">Thinking...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {imagePreview && (
        <div className="p-2 sm:p-4 border-t bg-muted/30">
          <div className="relative inline-block max-w-full">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-full sm:max-w-xs rounded-lg"
            />
            <button
              onClick={removeImage}
              className="absolute top-2 right-2 bg-destructive text-white rounded-full p-1 hover:bg-destructive/90"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSend} className="p-2 sm:p-4 border-t bg-background">
        <div className="flex gap-2 items-end max-w-4xl mx-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload">
            <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" asChild>
              <span>
                <ImageIcon className="w-4 h-4" />
              </span>
            </Button>
          </label>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                const val = e.target.value;
                const wordCount = val.trim() ? val.trim().split(/\s+/).length : 0;
                setWordLimitExceeded(wordCount > WORD_LIMIT);
                setMessage(val);
              }}
              onKeyDown={(e) => { handleKeyDown(e); handleTextareaKeyDown(e); }}
              placeholder="Send a message... (Enter to send, Shift+Enter for newline)"
              className="w-full min-h-11 max-h-50 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              rows={1}
              disabled={streaming || loading}
              style={{
                height: "auto",
                overflowY: "auto",
              }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
              }}
            />
            {wordLimitExceeded && (
              <div className="absolute right-2 bottom-2 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
                Too many words (limit {WORD_LIMIT})
              </div>
            )}
          </div>
          <Button
            type="submit"
            disabled={streaming || loading || (!message.trim() && !imageFile)}
            size="icon"
            className="h-10 w-10 shrink-0"
          >
            {streaming || loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground text-center hidden sm:block">
          Press Enter to send, Shift+Enter for newline • Cmd/Ctrl+K for new chat
        </div>
      </form>
    </div>
  );
}
