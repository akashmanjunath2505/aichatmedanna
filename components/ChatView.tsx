import React, { useState, useEffect, useRef } from 'react';
import { Chat, Message, UserRole, Citation, StructuredDataType } from '../types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { streamChatResponse, checkForControlledSubstances } from '../services/geminiService';
import { PRE_CODED_GPTS } from '../constants';

interface ChatViewProps {
  chat: Chat | null;
  onNewChat: () => void;
  // FIX: Update `updateChat` signature to accept partial updates for more flexibility (e.g., updating title).
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  isDoctorVerified: boolean;
  setShowVerificationModal: (show: boolean) => void;
  setPendingVerificationMessage: (message: string | null) => void;
  pendingVerificationMessage: string | null;
}

const WelcomeScreen: React.FC<{ onNewChat: () => void }> = ({ onNewChat }) => {
  const homeopathyGpt = PRE_CODED_GPTS[0];
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-20 h-20 bg-medanna-light-grey rounded-2xl flex items-center justify-center mb-6">
        {React.cloneElement(homeopathyGpt.icon, { className: 'w-10 h-10' })}
      </div>
      <h1 className="text-4xl font-bold mb-2">{homeopathyGpt.title}</h1>
      <p className="text-xl text-gray-400 max-w-xl">{homeopathyGpt.description}</p>
      <button
        onClick={onNewChat}
        className="mt-8 px-6 py-3 bg-medanna-accent rounded-lg font-semibold hover:bg-purple-700 transition-colors"
      >
        Start New Case Analysis
      </button>
    </div>
  );
};


export const ChatView: React.FC<ChatViewProps> = ({ 
  chat, 
  onNewChat, 
  updateChat,
  isDoctorVerified,
  setShowVerificationModal,
  setPendingVerificationMessage,
  pendingVerificationMessage
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages]);
  
  const streamResponseForChat = async (activeChat: Chat, text: string) => {
    // FIX: Correctly update the chat title using the `updateChat` prop. This resolves the `setChats is not defined` error.
    if (activeChat.title === 'New Case Analysis' && text) {
        const newTitle = text.substring(0, 40) + (text.length > 40 ? '...' : '');
        updateChat(activeChat.id, { title: newTitle });
    }

    const userMessage: Message = { id: `msg-${Date.now()}`, sender: 'USER', text };
    const messagesWithUser = [...activeChat.messages, userMessage];
    updateChat(activeChat.id, { messages: messagesWithUser });
    setIsLoading(true);

    try {
      const history = activeChat.messages.map(m => ({
        role: m.sender === 'USER' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      const activeGpt = activeChat.gptId ? PRE_CODED_GPTS.find(g => g.id === activeChat.gptId) : undefined;
      
      const stream = streamChatResponse({
          message: text,
          history,
          userRole: UserRole.DOCTOR,
          language: "English",
          activeGpt,
          isDoctorVerified
      });

      let aiResponseText = '';
      let finalCitations: Citation[] = [];
      let finalStructuredData: StructuredDataType | undefined = undefined;
      const aiMessageId = `msg-${Date.now()}-ai`;
      
      updateChat(activeChat.id, { messages: [...messagesWithUser, { id: aiMessageId, sender: 'AI', text: '...' }] });
      
      for await (const result of stream) {
        if (result.textChunk) {
          aiResponseText += result.textChunk;
          updateChat(activeChat.id, { messages: [...messagesWithUser, { id: aiMessageId, sender: 'AI', text: aiResponseText }] });
        }
        // FIX: This code is now correct as `geminiService` will yield citations.
        if (result.citations) {
          finalCitations = result.citations;
        }
        if (result.structuredData) {
            finalStructuredData = result.structuredData;
            aiResponseText = result.structuredData.summary; // Use summary as the main text
            updateChat(activeChat.id, { messages: [...messagesWithUser, { 
                id: aiMessageId, 
                sender: 'AI', 
                text: aiResponseText, 
                structuredData: finalStructuredData
            }]});
        }
        if (result.error) {
           aiResponseText = result.error;
           updateChat(activeChat.id, { messages: [...messagesWithUser, { id: aiMessageId, sender: 'AI', text: aiResponseText }] });
           break;
        }
      }
      
      if (finalCitations.length > 0) {
        updateChat(activeChat.id, { messages: [...messagesWithUser, { 
            id: aiMessageId, 
            sender: 'AI', 
            text: aiResponseText, 
            citations: finalCitations,
            structuredData: finalStructuredData 
        }]});
      }

    } catch (error) {
      console.error('Error streaming response:', error);
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        sender: 'AI',
        text: 'Sorry, I encountered a critical error. Please try again.',
      };
      updateChat(activeChat.id, { messages: [...messagesWithUser, errorMessage] });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Effect to send a pending message after successful verification
  useEffect(() => {
    if (isDoctorVerified && pendingVerificationMessage && chat) {
      const text = pendingVerificationMessage;
      setPendingVerificationMessage(null); // Clear ref
      streamResponseForChat(chat, text);
    }
  }, [isDoctorVerified, pendingVerificationMessage, chat]);


  const handleSendMessage = (text: string) => {
    if (isLoading) return;

    // Gatekeeping for controlled substances
    if (checkForControlledSubstances(text) && !isDoctorVerified) {
      setPendingVerificationMessage(text);
      setShowVerificationModal(true);
      return;
    }

    if (!chat) {
      onNewChat();
      setPendingVerificationMessage(text);
    } else {
      streamResponseForChat(chat, text);
    }
  };
  
  // A dedicated effect for sending the first message in a new chat.
  useEffect(() => {
    if (chat && chat.messages.length === 0 && pendingVerificationMessage) {
        if (!checkForControlledSubstances(pendingVerificationMessage) || isDoctorVerified) {
           const text = pendingVerificationMessage;
           setPendingVerificationMessage(null);
           streamResponseForChat(chat, text);
        }
    }
  }, [chat, pendingVerificationMessage, isDoctorVerified]);


  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto h-full">
            {chat ? (
                <>
                    {chat.messages.map((message) => (
                        <ChatMessage key={message.id} message={message} />
                    ))}
                    <div ref={messagesEndRef} />
                </>
            ) : (
                <WelcomeScreen onNewChat={onNewChat} />
            )}
        </div>
      </div>
      <div className="w-full px-6 pb-6">
        <div className="max-w-4xl mx-auto">
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
             <p className="text-xs text-center text-gray-500 mt-2">
                Medanna can make mistakes. Consider checking important information. This is a simulation for educational and informational purposes only.
            </p>
        </div>
      </div>
    </div>
  );
};