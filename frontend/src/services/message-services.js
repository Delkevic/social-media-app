// message-service.js
import api from './api';
import { API_URL } from '../config/constants';
import websocketService from './websocket-service';

// Tüm konuşmaları getiren fonksiyon
export const getConversations = async () => {
  try {
    const response = await api.messages.getConversations();
    if (response.success) {
      return response.data || [];
    }
    throw new Error(response.message || 'Konuşmaları getirme hatası');
  } catch (error) {
    console.error("Konuşmaları getirme hatası:", error);
    throw error;
  }
};

// Belirli bir konuşmanın mesajlarını getiren fonksiyon
export const getMessages = async (userId) => {
  try {
    const response = await api.messages.getConversation(userId);
    
    if (response.success) {
      return response.data;
    }
    throw new Error(response.message || 'Mesajları getirme hatası');
  } catch (error) {
    console.error("Mesajları getirme hatası:", error);
    throw error;
  }
};

// Yeni mesaj gönderen fonksiyon
export const sendMessage = async (userId, content, mediaUrl = null) => {
  try {
    const messageData = {
      content,
      mediaUrl
    };
    
    const response = await api.messages.sendMessage({
      receiverId: userId,
      content: content,
      mediaUrl: mediaUrl
    });
    
    if (response.success) {
      return response.data;
    }
    throw new Error(response.message || 'Mesaj gönderme hatası');
  } catch (error) {
    console.error("Mesaj gönderme hatası:", error);
    throw error;
  }
};

// Mesajı okundu olarak işaretle
export const markMessageAsRead = async (messageId) => {
  try {
    const response = await api.messages.markAsRead(messageId);
    return response.success;
  } catch (error) {
    console.error("Mesajı okundu olarak işaretleme hatası:", error);
    throw error;
  }
};

// Yazıyor durumu gönder
export const sendTypingStatus = async (userId, isTyping) => {
  try {
    // WebSocket bağlantısı varsa kullan
    if (websocketService.getStatus() === 'OPEN') {
      return websocketService.sendTypingStatus(userId, isTyping);
    } 
    
    // WebSocket yoksa veya kapalıysa HTTP isteği yap
    const response = await fetch(`${API_URL}/messages/${userId}/typing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('token') || localStorage.getItem('token')}`
      },
      body: JSON.stringify({ isTyping })
    });
    
    return response.ok;
  } catch (error) {
    console.error("Yazıyor durumu gönderme hatası:", error);
    return false;
  }
};

// Önceki sohbetleri getir
export const getPreviousChats = async () => {
  try {
    const response = await api.messages.getPreviousChats();
    if (response.success) {
      return response.data || [];
    }
    throw new Error(response.message || 'Önceki sohbetleri getirme hatası');
  } catch (error) {
    console.error("Önceki sohbetleri getirme hatası:", error);
    throw error;
  }
};

// WebSocket bağlantısını başlat
export const initializeWebSocket = (token) => {
  return websocketService.connect(token);
};

// WebSocket bağlantısını yenile
export const refreshWebSocketConnection = async () => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  return websocketService.connect(token, true);
};

// WebSocket'i getir
export const getWebSocket = () => {
  return websocketService.getWebSocket();
};

// WebSocket mesaj dinleyicisi ekle
export const addMessageListener = (callback) => {
  websocketService.addMessageListener(callback);
};

// WebSocket yazıyor durumu dinleyicisi ekle
export const addTypingListener = (callback) => {
  websocketService.addTypingListener(callback);
};

// WebSocket bağlantı dinleyicisi ekle
export const addConnectListener = (callback) => {
  websocketService.addConnectListener(callback);
};

// WebSocket bağlantı kesme dinleyicisi ekle
export const addDisconnectListener = (callback) => {
  websocketService.addDisconnectListener(callback);
};

// WebSocket hata dinleyicisi ekle
export const addErrorListener = (callback) => {
  websocketService.addErrorListener(callback);
};

// WebSocket dinleyici kaldır
export const removeMessageListener = (callback) => {
  websocketService.removeMessageListener(callback);
};

// WebSocket dinleyici kaldır
export const removeTypingListener = (callback) => {
  websocketService.removeTypingListener(callback);
};

// WebSocket dinleyici kaldır
export const removeConnectListener = (callback) => {
  websocketService.removeConnectListener(callback);
};

// WebSocket dinleyici kaldır
export const removeDisconnectListener = (callback) => {
  websocketService.removeDisconnectListener(callback);
};

// WebSocket dinleyici kaldır
export const removeErrorListener = (callback) => {
  websocketService.removeErrorListener(callback);
};