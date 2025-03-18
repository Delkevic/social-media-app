import React from "react";
import { motion } from "framer-motion";

// Button bileşeni - basitleştirilmiş
const Button = ({ children, className, onClick, type, disabled }) => {
  return (
    <motion.button
      type={type || "button"}
      className={className || ""}
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { 
        scale: 1.03, 
        transition: { duration: 0.1 }
      } : {}}
      whileTap={!disabled ? { 
        scale: 0.97, 
        transition: { duration: 0.1 }
      } : {}}
    >
      {children}
    </motion.button>
  );
};

// Avatar bileşenleri - basitleştirilmiş
const Avatar = ({ children, className }) => {
  return (
    <motion.div 
      className={`relative rounded-full overflow-hidden ${className || ""}`}
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: 1,
        transition: {
          duration: 0.15
        }
      }}
      whileHover={{
        scale: 1.05,
        transition: { duration: 0.1 }
      }}
    >
      {children}
    </motion.div>
  );
};

const AvatarImage = ({ src }) => {
  return (
    <div className="w-full h-full relative">
      <div className="absolute inset-0 z-0 opacity-50" 
         style={{ background: "linear-gradient(120deg, rgba(149, 76, 233, 0.5), rgba(43, 192, 228, 0.5))" }}/>
      <img 
        src={src} 
        alt="Avatar" 
        className="w-full h-full object-cover relative z-10"
      />
    </div>
  );
};

const AvatarFallback = ({ children }) => {
  const colorVariants = [
    "linear-gradient(135deg, #954ce9, #2bc0e4)",
    "linear-gradient(135deg, #6a11cb, #2575fc)",
    "linear-gradient(135deg, #c471f5, #fa71cd)",
  ];
  
  const randomColor = colorVariants[Math.floor(Math.random() * colorVariants.length)];
  
  return (
    <motion.div 
      className="w-full h-full flex items-center justify-center text-white font-bold"
      style={{ background: randomColor }}
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: 1,
        transition: { duration: 0.1 }
      }}
    >
      {children}
    </motion.div>
  );
};

// Chat Bubble bileşenleri - basitleştirilmiş
const ChatBubble = ({ children, variant }) => {
  return (
    <motion.div 
      className={`flex items-start gap-2 mb-4 ${variant === "sent" ? "flex-row-reverse" : "flex-row"}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.15
      }}
    >
      {children}
    </motion.div>
  );
};

const ChatBubbleAvatar = ({ className, src, fallback }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.15
      }}
    >
      <Avatar className={className}>
        {src ? <AvatarImage src={src} /> : <AvatarFallback>{fallback}</AvatarFallback>}
      </Avatar>
    </motion.div>
  );
};

const ChatBubbleMessage = ({ children, variant, style, isLoading }) => {
  const sentGradient = "linear-gradient(135deg, #954ce9, #6439ff)";
  const receivedGradient = "linear-gradient(135deg, #2c3e50, #34495e)";
  
  if (isLoading) {
    return (
      <motion.div
        className="py-3 px-4 rounded-2xl max-w-xs backdrop-blur-sm"
        style={{ 
          background: "rgba(30, 30, 30, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)"
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.15
        }}
      >
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <motion.div 
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ background: "rgba(149, 76, 233, 0.7)" }}
              animate={{ 
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ 
                duration: 0.3,
                repeat: Infinity,
                delay: i * 0.05,
              }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`py-3 px-4 rounded-2xl max-w-xs backdrop-blur-sm ${
        variant === "sent" ? "rounded-tr-none" : "rounded-tl-none"
      }`}
      style={{
        background: variant === "sent" ? sentGradient : receivedGradient,
        color: variant === "sent" ? 'white' : 'white',
        boxShadow: variant === "sent" 
          ? "0 4px 15px rgba(100, 57, 255, 0.25)" 
          : "0 4px 15px rgba(0, 0, 0, 0.15)",
        border: variant === "sent"
          ? "1px solid rgba(149, 76, 233, 0.3)"
          : "1px solid rgba(255, 255, 255, 0.1)"
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.15
      }}
    >
      <div>
        {children}
      </div>
    </motion.div>
  );
};

// Yeni bileşenler ve efektler - basitleştirilmiş
const MessageBubbleTrail = ({ variant }) => {
  return (
    <div 
      className="absolute top-1/2 transform -translate-y-1/2"
      style={{
        right: variant === "sent" ? "100%" : "auto",
        left: variant === "received" ? "100%" : "auto",
        marginRight: variant === "sent" ? "2px" : "0",
        marginLeft: variant === "received" ? "2px" : "0"
      }}
    >
      <div className="flex space-x-1">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="rounded-full"
            style={{
              background: variant === "sent" 
                ? "rgba(149, 76, 233, 0.7)" 
                : "rgba(255, 255, 255, 0.3)",
              width: $`{4 - i}px`,
              height: $`{4 - i}px`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ 
              duration: 0.3,
              delay: i * 0.05
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Animasyonlu gönderme butonu - basitleştirilmiş
const SendButton = ({ disabled, onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className="p-2 rounded-full relative z-10 overflow-hidden"
      style={{
        background: disabled ? 'rgba(60, 60, 70, 0.5)' : 'linear-gradient(135deg, #954ce9, #2bc0e4)',
        color: disabled ? 'rgba(255,255,255,0.5)' : 'white',
        boxShadow: disabled ? 'none' : '0 4px 15px rgba(149, 76, 233, 0.25)'
      }}
      whileHover={!disabled ? { 
        scale: 1.05,
        transition: { duration: 0.1 }
      } : {}}
      whileTap={!disabled ? { scale: 0.95, transition: { duration: 0.1 } } : {}}
      initial={{ opacity: 0.8 }}
      animate={{ 
        opacity: disabled ? 0.6 : 1,
        transition: { duration: 0.15 }
      }}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M22 2L11 13M22 2L15 22L11 13M15 22L2 9L11 13" />
      </svg>
    </motion.button>
  );
};

// Klavye efekti - giriş kısmı için klavye simülasyonu (zaten basitleştirilmiş)
const KeyboardEffect = ({ text }) => {
  return <span>{text}</span>;
};

// Emoji paketi efekti - basitleştirilmiş
const EmojiPack = ({ onSelect }) => {
  const emojis = ["😊", "👍", "❤", "🎉", "😂", "🙌", "🔥", "✨"];
  
  return (
    <motion.div
      className="p-2 rounded-lg bg-gray-800/90 backdrop-blur-md grid grid-cols-4 gap-2 border border-purple-500/20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
    >
      {emojis.map((emoji, i) => (
        <motion.button
          key={i}
          className="w-8 h-8 flex items-center justify-center text-xl rounded-lg hover:bg-white/10"
          whileHover={{ scale: 1.1, transition: { duration: 0.1 } }}
          whileTap={{ scale: 0.9, transition: { duration: 0.1 } }}
          onClick={() => onSelect(emoji)}
        >
          {emoji}
        </motion.button>
      ))}
    </motion.div>
  );
};

// Bu bileşenleri dışa aktar
export {
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
  SendButton,
  MessageBubbleTrail,
  KeyboardEffect,
  EmojiPack
};