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
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate('/');
  }, [user, loading, navigate]);

  const handleConversationSelect = useCallback((conv) => {
    setActiveConversation(conv);
    // On mobile, hide sidebar when a conversation is selected
    setShowSidebar(false);
  }, []);

  const handleConversationUpdate = useCallback((updated) => {
    setConversations((prev) =>
      prev.map((c) => (c._id === updated._id ? updated : c))
    );
    if (activeConversation?._id === updated._id) setActiveConversation(updated);
  }, [activeConversation]);

  const handleMobileBack = useCallback(() => {
    setShowSidebar(true);
    setActiveConversation(null);
  }, []);

  const handleRequestHandled = useCallback((action, conv) => {
    if (action === 'accepted') {
      // Update the conversation in the list to active
      setConversations((prev) =>
        prev.map((c) => c._id === conv._id ? conv : c)
      );
      setActiveConversation(conv);
    } else {
      // Declined — remove from list and go back
      setConversations((prev) => prev.filter((c) => c._id !== conv._id));
      setActiveConversation(null);
      setShowSidebar(true);
    }
  }, []);

  if (loading || !user) return null;

  return (
    <div className="chat-layout">
      <div className={`chat-sidebar-wrap ${showSidebar ? 'sidebar-visible' : 'sidebar-hidden'}`}>
        <Sidebar
          activeConversationId={activeConversation?._id}
          onSelect={handleConversationSelect}
          conversations={conversations}
          setConversations={setConversations}
          onMobileClose={() => setShowSidebar(false)}
        />
      </div>
      <div className={`chat-panel-wrap ${!showSidebar ? 'panel-visible' : 'panel-hidden'}`}>
        <ConversationPanel
          conversation={activeConversation}
          onConversationUpdate={handleConversationUpdate}
          onMobileBack={handleMobileBack}
          onRequestHandled={handleRequestHandled}
        />
      </div>
    </div>
  );
};

export default Chat;
