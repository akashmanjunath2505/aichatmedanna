import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { UserRole, Chat, Message } from './types';
import { PRE_CODED_GPTS } from './constants';
import { Icon } from './components/Icon';
import { LicenseVerificationModal } from './components/LicenseVerificationModal';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // State for license verification flow
  const [isDoctorVerified, setIsDoctorVerified] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [pendingVerificationMessage, setPendingVerificationMessage] = useState<string | null>(null);


  const activeChat = useMemo(() => {
    return chats.find(chat => chat.id === activeChatId) || null;
  }, [chats, activeChatId]);


  const handleNewChat = useCallback(() => {
    const ddxGpt = PRE_CODED_GPTS[0];
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      title: `New Case Analysis`,
      messages: [],
      userRole: UserRole.DOCTOR,
      gptId: ddxGpt.id,
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    if(window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  // FIX: Updated `updateChat` to accept a partial Chat object, allowing for more flexible updates (e.g., title and messages).
  const updateChat = useCallback((chatId: string, updatedFields: Partial<Chat>) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId ? { ...chat, ...updatedFields } : chat
    ));
  }, []);

  const handleSelectChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
    if(window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);
  
  const handleVerifyLicense = () => {
    setIsDoctorVerified(true);
    setShowVerificationModal(false);
  };


  return (
    <div className="flex h-screen w-screen text-medanna-text bg-medanna-dark-sider">
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        chats={chats}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        activeChatId={activeChatId}
      />
      <main className="flex-1 flex flex-col bg-medanna-dark relative">
        {/* Mobile Header */}
        <header className="md:hidden p-4 flex items-center justify-between border-b border-medanna-light-grey bg-medanna-dark sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white p-2 rounded-md hover:bg-medanna-grey"
            aria-label="Open menu"
          >
            <Icon name="menu" />
          </button>
          <h2 className="text-lg font-semibold truncate px-2">
            {activeChat?.title || 'Medanna'}
          </h2>
          <div className="w-9 h-9"></div> {/* Spacer to help center the title */}
        </header>
        <ChatView
          key={activeChatId} // Force re-mount on chat change
          chat={activeChat}
          onNewChat={handleNewChat}
          updateChat={updateChat}
          isDoctorVerified={isDoctorVerified}
          setShowVerificationModal={setShowVerificationModal}
          setPendingVerificationMessage={setPendingVerificationMessage}
          pendingVerificationMessage={pendingVerificationMessage}
        />
      </main>
      <LicenseVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onVerify={handleVerifyLicense}
      />
    </div>
  );
};

export default App;