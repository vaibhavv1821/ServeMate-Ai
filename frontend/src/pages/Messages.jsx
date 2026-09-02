import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import { getSocket } from '../api/socket';
import { MessageCircle, Send, ChevronLeft, Loader2, AlertCircle, Clock } from 'lucide-react';

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDate = (ts) =>
  new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const socketRef = useRef(null);

  // ── Load conversations ──────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const res = await axiosClient.get('/conversations');
      setConversations(res.data.data.conversations);
    } catch {
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ── Socket.io setup ─────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const handleNewMessage = (message) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      // Refresh conversations list for unread counts
      loadConversations();
    };

    socket.on('new_message', handleNewMessage);
    return () => socket.off('new_message', handleNewMessage);
  }, [loadConversations]);

  // ── Open conversation ───────────────────────────────────────────
  const openConversation = async (conv) => {
    setActive(conv);
    setMsgLoading(true);
    setMessages([]);
    setError(null);

    try {
      const res = await axiosClient.get(`/conversations/${conv.id}/messages`);
      setMessages(res.data.data.messages);

      // Join socket room
      if (socketRef.current) {
        socketRef.current.emit('join_conversation', { conversationId: conv.id });
      }

      // Update unread count to 0 in sidebar
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
      );
    } catch {
      setError('Failed to load messages');
    } finally {
      setMsgLoading(false);
    }
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ────────────────────────────────────────────────
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !active || sending) return;

    const content = input.trim();
    setInput('');
    setSending(true);

    // Optimistic UI
    const tempMsg = {
      id: `temp-${Date.now()}`,
      conversationId: active.id,
      senderId: user.id,
      content,
      createdAt: new Date().toISOString(),
      sender: { id: user.id, name: user.name },
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      // Send via socket (real-time)
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', { conversationId: active.id, content });
      } else {
        // Fallback to REST
        const res = await axiosClient.post(`/conversations/${active.id}/messages`, { content });
        setMessages((prev) => prev.map((m) => (m.id === tempMsg.id ? res.data.data.message : m)));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const otherUser = (conv) =>
    user.role === 'CUSTOMER' ? conv.provider : conv.customer;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">
        <MessageCircle className="inline w-6 h-6 text-sky-600 mr-2" />
        Messages
      </h1>

      <div className="flex h-[600px] border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
        {/* ── Conversation Sidebar ── */}
        <div className="w-80 border-r border-gray-100 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-500">
              {conversations.length} Conversation{conversations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No conversations yet
              </div>
            ) : (
              conversations.map((conv) => {
                const other = otherUser(conv);
                const lastMsg = conv.messages?.[0];
                const isActive = active?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv)}
                    className={`w-full text-left p-4 border-b border-gray-50 hover:bg-sky-50 transition-colors ${isActive ? 'bg-sky-50 border-l-2 border-l-sky-500' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-gray-900 text-sm truncate">{other?.name}</p>
                      {conv.unreadCount > 0 && (
                        <span className="bg-sky-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {conv.booking?.serviceCategory?.name && `[${conv.booking.serviceCategory.name}] `}
                      {lastMsg ? lastMsg.content : 'No messages yet'}
                    </p>
                    {lastMsg && (
                      <p className="text-xs text-gray-400 mt-1">{formatDate(lastMsg.createdAt)}</p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Chat Window ── */}
        <div className="flex-1 flex flex-col">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a conversation to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                <button onClick={() => setActive(null)} className="text-gray-400 hover:text-gray-700 sm:hidden">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center font-bold text-sky-700 shrink-0 text-sm">
                  {otherUser(active)?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{otherUser(active)?.name}</p>
                  {active.booking?.serviceCategory?.name && (
                    <p className="text-xs text-gray-500">{active.booking.serviceCategory.name}</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">No messages yet. Say hello! 👋</p>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.senderId === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-sm px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isOwn ? 'bg-sky-600 text-white rounded-br-md' : 'bg-gray-100 text-gray-900 rounded-bl-md'}`}>
                          <p className="break-words">{msg.content}</p>
                          <p className={`text-xs mt-1 ${isOwn ? 'text-sky-200' : 'text-gray-400'} flex items-center gap-1`}>
                            <Clock className="w-3 h-3" />
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                {error && (
                  <div className="flex items-center gap-2 text-rose-600 text-sm">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="bg-sky-600 text-white px-4 py-2 rounded-xl hover:bg-sky-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
