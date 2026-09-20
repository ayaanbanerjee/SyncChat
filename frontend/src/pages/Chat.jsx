import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ConversationPanel from '../components/ConversationPanel';
import './Chat.css';

const Chat = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeConversation, setActiveConversation] = useState(null);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    if (!loading && !user) navigate('/');
  }, [user, loading, navigate]);

  const handleConversationSelect = useCallback((conv) => {
    setActiveConversation(conv);
  }, []);

  const handleConversationUpdate = useCallback((updated) => {
    setConversations((prev) =>
      prev.map((c) => (c._id === updated._id ? updated : c))
    );
    if (activeConversation?._id === updated._id) setActiveConversation(updated);
  }, [activeConversation]);

  if (loading || !user) return null;

  return (
    <div className="chat-layout">
      <Sidebar
        activeConversationId={activeConversation?._id}
        onSelect={handleConversationSelect}
        conversations={conversations}
        setConversations={setConversations}
      />
      <ConversationPanel
        conversation={activeConversation}
        onConversationUpdate={handleConversationUpdate}
      />
    </div>
  );
};

export default Chat;
