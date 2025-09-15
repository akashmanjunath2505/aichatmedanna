import React from 'react';
import { Message, HomeopathicRemedyItem, SoapNote, SymptomCheckResult } from '../types';
import { Icon } from './Icon';

interface ChatMessageProps {
  message: Message;
}

const Citations: React.FC<{ citations: NonNullable<Message['citations']> }> = ({ citations }) => {
    if (citations.length === 0) return null;

    return (
        <div className="mt-4 pt-3 border-t border-gray-500/50">
            <h4 className="text-xs font-semibold text-gray-300 mb-2">Sources</h4>
            <div className="flex flex-wrap gap-2">
                {citations.map((citation, index) => (
                    <a
                        key={index}
                        href={citation.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-gray-600/50 hover:bg-gray-600 text-gray-200 rounded-full px-2 py-1 transition-colors truncate max-w-xs"
                        title={citation.title}
                    >
                        {index + 1}. {citation.title}
                    </a>
                ))}
            </div>
        </div>
    );
};

// --- Structured Data Renderers ---

const RenderHomeopathyAnalysis: React.FC<{ items: HomeopathicRemedyItem[] }> = ({ items }) => (
    <div className="mt-4 pt-3 border-t border-medanna-light-grey/80">
        <h4 className="text-sm font-semibold text-gray-200 mb-3">Potential Remedies</h4>
        <div className="space-y-3">
            {items.map((item, index) => (
                <div key={index} className="p-3 bg-medanna-grey/50 rounded-lg">
                    <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-white">{item.remedy} (Potency: {item.potencySuggestion})</h5>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            item.confidence === 'Strong Match' ? 'bg-green-500/20 text-green-300' :
                            item.confidence === 'Good Match' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-orange-500/20 text-orange-300'
                        }`}>{item.confidence}</span>
                    </div>
                    <p className="text-xs text-gray-300 mt-1"><strong className="font-medium">Keynotes:</strong> {item.keynotes}</p>
                </div>
            ))}
        </div>
    </div>
);


const RenderSoapNote: React.FC<{ note: SoapNote }> = ({ note }) => (
    <div className="mt-4 pt-3 border-t border-medanna-light-grey/80">
        <h4 className="text-sm font-semibold text-gray-200 mb-3">SOAP Note</h4>
        <div className="space-y-2 text-xs">
            <p><strong className="text-gray-300">S:</strong> {note.subjective}</p>
            <p><strong className="text-gray-300">O:</strong> {note.objective}</p>
            <p><strong className="text-gray-300">A:</strong> {note.assessment}</p>
            <p><strong className="text-gray-300">P:</strong> {note.plan}</p>
        </div>
    </div>
);

const RenderSymptomCheck: React.FC<{ result: SymptomCheckResult }> = ({ result }) => (
     <div className="mt-4 pt-3 border-t border-medanna-light-grey/80">
        <div className={`p-3 rounded-lg border-l-4 ${
            result.triageLevel === 'Emergency' ? 'bg-red-500/20 border-red-500' :
            result.triageLevel === 'Urgent' ? 'bg-yellow-500/20 border-yellow-500' :
            result.triageLevel === 'Routine' ? 'bg-blue-500/20 border-blue-500' :
            'bg-green-500/20 border-green-500'
        }`}>
            <h4 className="font-bold text-white">{result.triageLevel}</h4>
            <p className="text-sm text-gray-200">{result.triageAdvice}</p>
        </div>
         <div className="mt-3">
            <h5 className="text-xs font-semibold text-gray-300 mb-1">Possible Conditions</h5>
            <p className="text-xs text-gray-400">{result.possibleConditions.join(', ')}</p>
         </div>
    </div>
);


const StructuredContent: React.FC<{ message: Message }> = ({ message }) => {
    if (!message.structuredData) return null;

    switch (message.structuredData.type) {
        case 'homeopathy':
            return <RenderHomeopathyAnalysis items={message.structuredData.data} />;
        case 'soap':
            return <RenderSoapNote note={message.structuredData.data} />;
        case 'symptom':
            return <RenderSymptomCheck result={message.structuredData.data} />;
        default:
            return null;
    }
};


export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === 'USER';

  const renderMarkdown = (text: string) => {
    const processedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    const blocks = processedText.split('\n\n');

    const formattedElements = blocks.map((block, i) => {
      const trimmedBlock = block.trim();
      if (trimmedBlock.length === 0) return null;

      // Headings
      if (trimmedBlock.startsWith('# ')) {
        return <h1 key={i} className="text-2xl font-bold my-4" dangerouslySetInnerHTML={{ __html: trimmedBlock.substring(2) }} />;
      }
      if (trimmedBlock.startsWith('## ')) {
        return <h2 key={i} className="text-xl font-bold my-3" dangerouslySetInnerHTML={{ __html: trimmedBlock.substring(3) }} />;
      }
      if (trimmedBlock.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-bold my-2" dangerouslySetInnerHTML={{ __html: trimmedBlock.substring(4) }} />;
      }

      // Unordered List
      if (trimmedBlock.split('\n').every(line => line.trim().startsWith('* '))) {
        const listItems = trimmedBlock.split('\n').map((item, j) => {
          const itemContent = item.trim().substring(2);
          return <li key={j} dangerouslySetInnerHTML={{ __html: itemContent }} />;
        });
        return <ul key={i} className="list-disc list-inside space-y-1 my-2">{listItems}</ul>;
      }

      // Paragraph
      return <p key={i} className="my-2" dangerouslySetInnerHTML={{ __html: block.replace(/\n/g, '<br />') }} />;
    });

    return <>{formattedElements.filter(Boolean)}</>;
  };


  return (
    <div className={`flex items-start gap-4 my-6 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-medanna-accent flex items-center justify-center">
            <Icon name="ai" className="w-5 h-5 text-white" />
        </div>
      )}
      <div className={`max-w-2xl p-4 rounded-lg shadow-md ${isUser ? 'bg-medanna-accent text-white' : 'bg-medanna-light-grey'}`}>
        <div className="text-sm prose prose-invert max-w-none">
          {isUser ? message.text : renderMarkdown(message.text)}
        </div>
        <StructuredContent message={message} />
        {message.citations && <Citations citations={message.citations} />}
      </div>
      {isUser && (
         <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gray-600 flex items-center justify-center">
            <Icon name="user" className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
};