import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { User, Bot, Copy, ThumbsUp, ThumbsDown, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/hooks/redux";
import { updateMessageFeedback } from "@/store/slices/chatSlice";

export default function Message({ message, messageIndex, chatId, canRegenerate, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(message.feedback || null);
  const dispatch = useAppDispatch();
  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleFeedback = (type) => {
    const newFeedback = feedback === type ? null : type;
    setFeedback(newFeedback);
    dispatch(updateMessageFeedback({
      messageIndex,
      feedback: newFeedback,
    }));
  };

  return (
    <div
      className={`flex gap-2 sm:gap-4 p-3 sm:p-4 group hover:bg-muted/50 transition-colors ${
        isUser ? "bg-background" : "bg-muted/30"
      }`}
    >
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center">
            <User className="w-3 h-3 sm:w-5 sm:h-5 text-primary-foreground" />
          </div>
        ) : (
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-secondary flex items-center justify-center">
            <Bot className="w-3 h-3 sm:w-5 sm:h-5 text-secondary-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="Uploaded"
            className="max-w-md rounded-lg mb-2"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        )}
        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-3 prose-p:leading-7 prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-headings:my-4 prose-h1:text-xl sm:prose-h1:text-2xl prose-h2:text-lg sm:prose-h2:text-xl prose-h3:text-base sm:prose-h3:text-lg prose-blockquote:my-4 prose-pre:my-4 prose-code:text-xs sm:prose-code:text-sm prose-strong:font-semibold break-words">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-4 leading-7 whitespace-pre-wrap break-words">{children}</p>,
              ul: ({ children }) => <ul className="mb-4 ml-6 list-disc space-y-2">{children}</ul>,
              ol: ({ children }) => <ol className="mb-4 ml-6 list-decimal space-y-2">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>,
              h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-4">{children}</h3>,
              blockquote: ({ children }) => <blockquote className="border-l-4 border-muted-foreground pl-4 my-4 italic">{children}</blockquote>,
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      margin: "1rem 0",
                      borderRadius: "0.5rem",
                      padding: "1rem",
                    }}
                    {...props}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                ) : (
                  <code
                    className={`${className} bg-muted px-1.5 py-0.5 rounded text-sm font-mono`}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {!isUser && (
          <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {canRegenerate && onRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerate}
                className="h-8 px-2"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Regenerate
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 px-2"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback("like")}
              className={`h-8 px-2 ${feedback === "like" ? "bg-primary/10" : ""}`}
            >
              <ThumbsUp className={`w-3 h-3 ${feedback === "like" ? "fill-current" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback("dislike")}
              className={`h-8 px-2 ${feedback === "dislike" ? "bg-destructive/10" : ""}`}
            >
              <ThumbsDown className={`w-3 h-3 ${feedback === "dislike" ? "fill-current" : ""}`} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
