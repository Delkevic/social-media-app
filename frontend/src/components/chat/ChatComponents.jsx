import React from "react";

// Button bileşeni
const Button = ({ children, className, onClick, type, disabled }) => {
  return (
    <button
      type={type || "button"}
      className={className || ""}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// Avatar bileşenleri
const Avatar = ({ children, className }) => {
  return (
    <div className={`relative rounded-full overflow-hidden ${className || ""}`}>
      {children}
    </div>
  );
};

const AvatarImage = ({ src }) => {
  return <img src={src} alt="Avatar" className="w-full h-full object-cover" />;
};

const AvatarFallback = ({ children }) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-700 font-semibold">
      {children}
    </div>
  );
};

// Chat Bubble bileşenleri
const ChatBubble = ({ children, variant }) => {
  return (
    <div className={`flex items-start gap-2 mb-4 ${variant === "sent" ? "flex-row-reverse" : "flex-row"}`}>
      {children}
    </div>
  );
};

const ChatBubbleAvatar = ({ className, src, fallback }) => {
  return (
    <Avatar className={className}>
      {src ? <AvatarImage src={src} /> : <AvatarFallback>{fallback}</AvatarFallback>}
    </Avatar>
  );
};

const ChatBubbleMessage = ({ children, variant, style, isLoading }) => {
  if (isLoading) {
    return (
      <div
        className="py-3 px-4 rounded-2xl max-w-xs"
        style={{ backgroundColor: 'var(--background-secondary)' }}
      >
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.4s]" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`py-3 px-4 rounded-2xl max-w-xs ${
        variant === "sent" ? "rounded-tr-none" : "rounded-tl-none"
      }`}
      style={style}
    >
      {children}
    </div>
  );
};

// Bu bileşenleri dışa aktar
export {
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage
};