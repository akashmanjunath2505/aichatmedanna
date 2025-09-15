import React, { Dispatch, SetStateAction, useState } from 'react';
import { Chat } from '../types';
import { Icon } from './Icon';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  chats: Chat[];
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  activeChatId: string | null;
}

const SidebarHeader: React.FC<{ onNewChat: () => void; setIsOpen: (isOpen: boolean) => void; }> = ({ onNewChat, setIsOpen }) => (
  <div className="p-4 flex justify-between items-center border-b border-medanna-light-grey">
    <h1 className="text-xl font-bold">Medanna</h1>
    <div className="flex items-center gap-1">
      <button
        onClick={onNewChat}
        className="flex items-center justify-center p-2 text-sm font-medium text-white bg-medanna-accent rounded-md hover:bg-purple-700 transition-colors"
        title="Start a new diagnosis"
      >
        <Icon name="newChat" />
      </button>
      <button
        onClick={() => setIsOpen(false)}
        className="md:hidden p-2 text-gray-400 hover:text-white"
        title="Close menu"
        aria-label="Close menu"
      >
        <Icon name="close" />
      </button>
    </div>
  </div>
);

const SearchBar: React.FC<{
    placeholder: string;
    searchQuery: string;
    setSearchQuery: Dispatch<SetStateAction<string>>;
}> = ({ placeholder, searchQuery, setSearchQuery }) => (
    <div className="p-4">
        <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Icon name="search" className="w-4 h-4 text-gray-400" />
            </div>
            <input
                type="text"
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-medanna-grey border border-medanna-light-grey text-white text-sm rounded-lg focus:ring-medanna-accent focus:border-medanna-accent block pl-9 p-2.5"
            />
        </div>
    </div>
);


const ChatHistory: React.FC<{ chats: Chat[], onSelectChat: (id: string) => void, activeChatId: string | null }> = ({ chats, onSelectChat, activeChatId }) => (
    <div className="space-y-1 px-4">
        {chats.map(chat => (
            <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md truncate transition-colors ${activeChatId === chat.id ? 'bg-medanna-accent' : 'hover:bg-medanna-grey'}`}
            >
                {chat.title}
            </button>
        ))}
    </div>
);

const SidebarFooter: React.FC<{}> = () => (
  <div className="p-4 border-t border-medanna-light-grey mt-auto flex justify-between items-center">
    <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-medanna-accent flex items-center justify-center font-bold text-sm">MU</div>
        <span className="text-sm font-medium">Medanna User</span>
    </div>
  </div>
);

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, chats, onNewChat, onSelectChat, activeChatId }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      className={`absolute md:relative z-20 flex-shrink-0 w-80 bg-medanna-dark-sider flex flex-col h-full transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 border-r border-medanna-light-grey`}
    >
      <SidebarHeader onNewChat={onNewChat} setIsOpen={setIsOpen} />
      <SearchBar
        placeholder={'Search chats...'}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <div className="flex-grow overflow-y-auto pb-4">
        <ChatHistory chats={filteredChats} onSelectChat={onSelectChat} activeChatId={activeChatId} />
      </div>
      <SidebarFooter />
    </aside>
  );
};