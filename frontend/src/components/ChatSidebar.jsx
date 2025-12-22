import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Plus, Trash2, MessageSquare, X, Star, Share2, Download, MoreVertical, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { fetchChats, createChat, deleteChat, setCurrentChat, setSidebarOpen, fetchChat, toggleStarChat, shareChat, unshareChat } from "@/store/slices/chatSlice";

let searchTimeout;

export default function ChatSidebar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const dispatch = useAppDispatch();
  const { chats, loading, currentChat, sidebarOpen, chatsFetched, pagination } = useAppSelector((state) => state.chat);
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const hasFetchedRef = useRef(false);

  // Fetch chats on mount when authenticated - only once
  useEffect(() => {
    // Only fetch if authenticated and chats haven't been fetched
    if (isAuthenticated && !chatsFetched && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      dispatch(fetchChats({ search: '', page: 1, append: false }));
    }
    
    // Reset ref when user logs out or chats are reset
    if (!isAuthenticated) {
      hasFetchedRef.current = false;
    }
  }, [isAuthenticated, chatsFetched, dispatch]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.group\\/menu')) {
        document.querySelectorAll('.chat-menu').forEach(m => m.classList.add('hidden'));
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Debounced search
  const debouncedSearch = useCallback((query) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const trimmedQuery = query.trim();
      dispatch(fetchChats({ search: trimmedQuery, page: 1, append: false }));
    }, 300);
  }, [dispatch]);

  // Load more chats
  const handleLoadMore = () => {
    if (pagination?.hasMore && !loading) {
      const nextPage = (pagination.page || 1) + 1;
      dispatch(fetchChats({ 
        search: searchQuery, 
        page: nextPage, 
        append: true 
      }));
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const handleNewChat = async () => {
    const result = await dispatch(createChat({ title: "New Chat" }));
    if (createChat.fulfilled.match(result)) {
      dispatch(setCurrentChat(result.payload));
      if (window.innerWidth < 768) {
        dispatch(setSidebarOpen(false));
      }
    }
  };

  const handleSelectChat = async (chat) => {
    const chatId = chat.id || chat._id;
    if (chatId) {
      // Always fetch full chat to ensure we have all messages
      const result = await dispatch(fetchChat(chatId));
      if (fetchChat.fulfilled.match(result)) {
        dispatch(setCurrentChat(result.payload));
      } else {
        dispatch(setCurrentChat(chat));
      }
    } else {
      dispatch(setCurrentChat(chat));
    }
    
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      dispatch(setSidebarOpen(false));
    }
  };

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this chat?")) {
      await dispatch(deleteChat(chatId));
      const currentChatId = currentChat?.id || currentChat?._id;
      if (currentChatId === chatId) {
        dispatch(setCurrentChat(null));
      }
    }
  };

  const handleStarChat = async (e, chatId, isStarred) => {
    e.stopPropagation();
    await dispatch(toggleStarChat({ chatId, isStarred: !isStarred }));
  };

  const handleShareChat = async (e, chatId) => {
    e.stopPropagation();
    document.querySelectorAll('.chat-menu').forEach(m => m.classList.add('hidden'));

    try {
      const result = await dispatch(shareChat(chatId));
      if (shareChat.fulfilled.match(result)) {
        const shareLink = result.payload.shareLink || result.payload.shareUrl;
        await navigator.clipboard.writeText(shareLink);
        alert("Share link copied to clipboard!");
      }
    } catch (error) {
      console.error("Share error:", error);
      alert("Failed to share chat");
    }
  };

  const handleUnshareChat = async (e, chatId) => {
    e.stopPropagation();
    document.querySelectorAll('.chat-menu').forEach(m => m.classList.add('hidden'));
    await dispatch(unshareChat(chatId));
  };

  const handleExportChat = async (e, chat) => {
    e.stopPropagation();
    document.querySelectorAll('.chat-menu').forEach(m => m.classList.add('hidden'));

    try {
      const chatId = chat.id || chat._id;
      const fullChat = await dispatch(fetchChat(chatId));
      
      if (fetchChat.fulfilled.match(fullChat)) {
        const chatData = fullChat.payload;

        // Dynamic import of jsPDF
        const { jsPDF } = await import('jspdf');
        
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const maxWidth = pageWidth - 2 * margin;
        let yPosition = margin;

        // Title
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        const title = chatData.title || "Chat Export";
        const titleLines = doc.splitTextToSize(title, maxWidth);
        titleLines.forEach((line, idx) => {
          if (yPosition > pageHeight - margin - 20) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin, yPosition);
          yPosition += 8;
        });

        // Export date
        yPosition += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Exported on: ${new Date().toLocaleString()}`, margin, yPosition);
        yPosition += 10;

        // Divider
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;

        // Messages
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);

        if (chatData.messages && chatData.messages.length > 0) {
          chatData.messages.forEach((msg, index) => {
            const isUser = msg.role === "user";
            const role = isUser ? "👤 User" : "🤖 Assistant";

            // Check if we need a new page
            if (yPosition > pageHeight - margin - 30) {
              doc.addPage();
              yPosition = margin;
            }

            // Role label
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(isUser ? 66 : 52, isUser ? 133 : 52, isUser ? 244 : 52);
            doc.text(role, margin + 5, yPosition);
            yPosition += 7;

            // Message content
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);

            const content = msg.content || "";
            const lines = doc.splitTextToSize(content, maxWidth - 10);
            
            lines.forEach((line) => {
              if (yPosition + 6 > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
              }
              doc.text(line, margin + 5, yPosition);
              yPosition += 6;
            });

            yPosition += 8; // Space between messages

            // Add page break if needed before next message
            if (yPosition > pageHeight - margin - 20 && index < chatData.messages.length - 1) {
              doc.addPage();
              yPosition = margin;
            }
          });
        } else {
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(150, 150, 150);
          doc.text("No messages in this chat", margin + 5, yPosition);
        }

        // Page numbers
        const totalPages = doc.internal.pages.length - 1;
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.text(
            `Page ${i} of ${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
        }

        // Save file
        const filename = `${(title).replace(/[^a-z0-9]/gi, "_").substring(0, 50)}_${new Date().getTime()}.pdf`;
        doc.save(filename);
      } else {
        throw new Error("Failed to fetch chat data");
      }
    } catch (error) {
      console.error("Export error:", error);
      alert(`Failed to export chat to PDF: ${error.message || 'Unknown error'}`);
    }
  };

  // Filter chats based on favorites
  const filteredChats = showFavoritesOnly 
    ? chats.filter(chat => chat.isStarred === true)
    : chats;

  if (!sidebarOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`fixed md:relative inset-y-0 left-0 z-50 w-full sm:w-72 bg-background border-r border-border flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Button 
              onClick={handleNewChat} 
              className="flex-1 h-9 text-sm font-medium" 
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">New Chat</span>
              <span className="sm:hidden">New</span>
            </Button>
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              title={showFavoritesOnly ? "Show all chats" : "Show favorites only"}
            >
              <Star className={`w-4 h-4 ${showFavoritesOnly ? "fill-current" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 md:hidden"
              onClick={() => dispatch(setSidebarOpen(false))}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-9 h-9 text-sm bg-background"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading && chats.length === 0 ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading chats...</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground font-medium mb-1">
                {showFavoritesOnly ? "No favorite chats" : "No chats yet"}
              </p>
              <p className="text-xs text-muted-foreground">
                {showFavoritesOnly 
                  ? "Star chats to see them here" 
                  : "Start a new conversation to begin"}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredChats.map((chat) => {
                const chatId = chat.id || chat._id;
                const isActive = (currentChat?.id || currentChat?._id) === chatId;
                // Use preview from backend, or extract from messages if available
                const preview = chat.preview || 
                  (chat.messages && chat.messages.length > 0 
                    ? chat.messages[chat.messages.length - 1]?.content?.substring(0, 60) 
                    : "") || "";

                return (
                  <div
                    key={chatId}
                    onClick={() => handleSelectChat(chat)}
                    className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      isActive 
                        ? "bg-primary/10 border border-primary/20 shadow-sm" 
                        : "hover:bg-muted/50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {/* Icon */}
                      <MessageSquare className={`w-4 h-4 mt-0.5 shrink-0 ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`} />
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`text-sm font-medium truncate ${
                            isActive ? "text-primary" : "text-foreground"
                          }`}>
                            {chat.title || "Untitled Chat"}
                          </h3>
                          {chat.isShared && (
                            <Share2 className="w-3 h-3 text-primary shrink-0" />
                          )}
                          {chat.isStarred && (
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />
                          )}
                        </div>
                        {preview && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {preview}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(e) => handleStarChat(e, chatId, chat.isStarred)}
                          className={`p-1.5 rounded hover:bg-muted transition-colors ${
                            chat.isStarred ? "opacity-100" : ""
                          }`}
                          title={chat.isStarred ? "Unstar" : "Star"}
                        >
                          <Star className={`w-4 h-4 transition-colors ${
                            chat.isStarred 
                              ? "text-yellow-500 fill-yellow-500" 
                              : "text-muted-foreground"
                          }`} />
                        </button>
                        
                        <div className="relative group/menu">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              document.querySelectorAll('.chat-menu').forEach(m => {
                                if (m !== e.currentTarget.nextElementSibling) {
                                  m.classList.add('hidden');
                                }
                              });
                              const menu = e.currentTarget.nextElementSibling;
                              if (menu) {
                                menu.classList.toggle("hidden");
                              }
                            }}
                            className="p-1.5 rounded hover:bg-muted transition-colors"
                            title="More options"
                          >
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </button>
                          
                          {/* Dropdown Menu */}
                          <div className="chat-menu hidden absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-50 min-w-[160px] overflow-hidden">
                            {chat.isShared ? (
                              <button
                                onClick={(e) => handleUnshareChat(e, chatId)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 transition-colors"
                              >
                                <Share2 className="w-4 h-4" />
                                Unshare
                              </button>
                            ) : (
                              <button
                                onClick={(e) => handleShareChat(e, chatId)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 transition-colors"
                              >
                                <Share2 className="w-4 h-4" />
                                Share
                              </button>
                            )}
                            <div className="border-t border-border my-1" />
                            <button
                              onClick={(e) => handleExportChat(e, chat)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              Export PDF
                            </button>
                            <div className="border-t border-border my-1" />
                            <button
                              onClick={(e) => handleDeleteChat(e, chatId)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-destructive flex items-center gap-2 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Load More Button */}
          {pagination?.hasMore && filteredChats.length > 0 && (
            <div className="p-4 border-t border-border">
              <Button
                onClick={handleLoadMore}
                disabled={loading}
                variant="outline"
                className="w-full"
                size="sm"
              >
                {loading ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    Load More ({pagination.total - chats.length} remaining)
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
