import React, { useState } from 'react';
import { Icon } from './Icon';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isLoading) {
      onSendMessage(text);
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center p-2 bg-medanna-light-grey rounded-2xl border border-gray-600 focus-within:border-medanna-accent">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything..."
        className="flex-grow bg-transparent text-white placeholder-gray-400 focus:outline-none resize-none px-4 py-2 max-h-40"
        rows={1}
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !text.trim()}
        className="ml-2 p-2 rounded-full bg-medanna-accent text-white disabled:bg-gray-500 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
        ) : (
          <Icon name="send" className="w-5 h-5" />
        )}
      </button>
    </form>
  );
};