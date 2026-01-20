import React, { useRef, useEffect, useState } from 'react';
import { Send, User, Bot, Loader2, Image as ImageIcon, Copy, Check } from 'lucide-react';
import { Message } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-md overflow-hidden bg-[#1e1e1e] border border-white/10 shadow-lg font-mono text-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 text-xs text-gray-400">
        <span className="uppercase">{language || 'code'}</span>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="text-gray-300">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  // Split by triple backticks
  const parts = text.split(/```(\w*)\n([\s\S]*?)```/g);

  // If no code blocks, just return text
  if (parts.length === 1) {
    return <div className="whitespace-pre-wrap break-words leading-7">{text}</div>;
  }

  // Re-assemble with CodeBlock components
  const elements = [];
  for (let i = 0; i < parts.length; i++) {
    // Even index is normal text
    if (i % 3 === 0) {
      if (parts[i]) {
        elements.push(
           <div key={i} className="whitespace-pre-wrap break-words leading-7 mb-2">{parts[i]}</div>
        );
      }
    } 
    // Odd index is language (due to capture group), next is code
    else if (i % 3 === 1) {
       const lang = parts[i];
       const code = parts[i + 1];
       elements.push(<CodeBlock key={i} language={lang} code={code} />);
       i++; // Skip code part in next iteration as we handled it
    }
  }

  return <div>{elements}</div>;
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  return (
    <div className="flex flex-col h-full w-full min-h-0 relative">
      
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto w-full min-h-0 custom-scrollbar scroll-smooth">
        <div className="flex flex-col pb-40">
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={`w-full border-b border-black/5 ${
                msg.role === 'model' ? 'bg-gpt-light text-gpt-text' : 'bg-transparent text-gpt-text'
              }`}
            >
              <div className="max-w-3xl mx-auto flex gap-4 p-4 md:gap-6 md:py-6">
                
                {/* Avatar */}
                <div className="flex-shrink-0 flex flex-col relative items-end">
                  <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${
                    msg.role === 'model' ? 'bg-green-500' : 'bg-gray-500'
                  }`}>
                    {msg.role === 'model' ? (
                       <Bot className="w-5 h-5 text-white" />
                    ) : (
                       <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="relative flex-1 overflow-hidden min-w-0">
                   <div className="font-bold text-sm mb-1 text-gray-200">
                      {msg.role === 'model' ? 'Nexus' : 'You'}
                   </div>
                   
                   <div className="text-sm md:text-base">
                      <FormattedText text={msg.text} />
                   </div>

                   {/* Image Attachment */}
                   {msg.imageUrl && (
                     <div className="mt-4 max-w-md rounded-lg overflow-hidden border border-white/10 shadow-lg bg-black/20">
                        <div className="p-2 bg-black/40 flex items-center gap-2 text-xs text-gray-400">
                          <ImageIcon className="w-3 h-3" /> Generated Visual
                        </div>
                        <img 
                          src={msg.imageUrl} 
                          alt="Generated" 
                          className="w-full h-auto object-cover hover:opacity-90 transition-opacity cursor-pointer" 
                          onClick={() => window.open(msg.imageUrl, '_blank')}
                        />
                     </div>
                   )}
                </div>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="w-full bg-gpt-light border-b border-black/10">
              <div className="max-w-3xl mx-auto flex gap-4 p-4 md:gap-6 md:py-6">
                 <div className="w-8 h-8 bg-green-500 rounded-sm flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm mb-1 text-gray-200">Nexus</div>
                    <div className="flex items-center mt-2">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce ml-1" style={{animationDelay: '0.2s'}}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce ml-1" style={{animationDelay: '0.4s'}}></span>
                    </div>
                 </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* Input Area (Bottom Fixed) */}
      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-gpt-dark via-gpt-dark to-transparent pt-10 pb-6 px-4 z-20">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end w-full p-3 bg-gpt-input rounded-xl border border-black/10 shadow-md focus-within:ring-1 focus-within:ring-black/20 focus-within:border-gray-500/50">
             
             <textarea
               ref={textareaRef}
               rows={1}
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={handleKeyDown}
               placeholder="Send a message..."
               className="w-full max-h-[200px] py-1 pl-2 pr-10 bg-transparent border-0 focus:ring-0 resize-none text-white placeholder-gray-400 text-sm md:text-base scrollbar-hide focus:outline-none"
             />

             <button 
               onClick={handleSubmit}
               disabled={!input.trim() || isLoading}
               className={`absolute right-3 bottom-3 p-1 rounded-md transition-colors ${
                 input.trim() ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-transparent text-gray-500 cursor-default'
               }`}
             >
               <Send className="w-4 h-4" />
             </button>
          </div>
          <div className="text-center mt-2">
            <p className="text-[10px] text-gray-500">Nexus AI can make mistakes. Consider checking important information.</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ChatInterface;