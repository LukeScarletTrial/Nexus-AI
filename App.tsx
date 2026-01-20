import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Mic, Plus, Settings, Menu, 
  Trash2, ChevronLeft, LogOut, Code
} from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import LiveInterface from './components/LiveInterface';
import { AppMode, Conversation, Message, NexusSystemConfig } from './types';
import { processNexusRequest, validateApiKey } from './services/nexus';

const App: React.FC = () => {
  // --- STATE ---
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Store the actual URL where the app is running for the API guide
  const [endpointUrl, setEndpointUrl] = useState('');

  // API Key Config
  const [systemConfig, setSystemConfig] = useState<NexusSystemConfig>(() => {
    const savedKey = localStorage.getItem('nexus_api_key');
    return { userApiKey: savedKey || '', remoteEndpoint: '' };
  });

  // --- INITIALIZATION ---
  useEffect(() => {
    // 1. Determine the stable endpoint URL (removing query params)
    if (typeof window !== 'undefined') {
      const current = window.location.href.split(/[?#]/)[0];
      setEndpointUrl(current);
    }

    // 2. API Request Handling (URL Params)
    const params = new URLSearchParams(window.location.search);
    if (params.get('key') && (params.get('prompt') || params.get('q'))) {
       handleApiRequest(params);
       return; 
    }

    // 3. Initialize with one empty chat if none exist
    if (conversations.length === 0) {
      createNewChat();
    }
    
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  // --- CONVERSATION LOGIC ---
  const createNewChat = () => {
    const newChat: Conversation = {
      id: Date.now().toString(),
      title: 'New conversation',
      messages: [{
        id: 'init',
        role: 'model',
        text: "Nexus Online.\nHow can I help you today?",
        timestamp: new Date()
      }],
      updatedAt: new Date()
    };
    setConversations(prev => [newChat, ...prev]);
    setCurrentId(newChat.id);
    setMode(AppMode.CHAT);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const deleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newConvos = conversations.filter(c => c.id !== id);
    setConversations(newConvos);
    if (currentId === id) {
      if (newConvos.length > 0) setCurrentId(newConvos[0].id);
      else createNewChat();
    }
  };

  const updateCurrentChat = (msg: Message) => {
    if (!currentId) return;
    setConversations(prev => prev.map(c => {
      if (c.id === currentId) {
        let newTitle = c.title;
        if (c.messages.length === 1 && msg.role === 'user') {
          newTitle = msg.text.slice(0, 30) + (msg.text.length > 30 ? '...' : '');
        }
        return { ...c, messages: [...c.messages, msg], title: newTitle, updatedAt: new Date() };
      }
      return c;
    }));
  };

  const handleSendMessage = async (text: string) => {
    if (!currentId || isLoading) return;

    // 1. Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: new Date()
    };
    updateCurrentChat(userMsg);
    setIsLoading(true);

    try {
      const currentChat = conversations.find(c => c.id === currentId);
      const history = currentChat ? [...currentChat.messages, userMsg] : [userMsg];

      // 2. Process via Nexus Service
      const result = await processNexusRequest(text, history);

      // 3. Add Model Message
      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: result.text,
        imageUrl: result.imageUrl,
        timestamp: new Date()
      };
      updateCurrentChat(modelMsg);

    } catch (e) {
      updateCurrentChat({
        id: Date.now().toString(),
        role: 'model',
        text: "I encountered an error processing your request.",
        timestamp: new Date()
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- API KEY UTILS ---
  const generateNewApiKey = () => {
    const newKey = 'NEXUS-' + Math.random().toString(36).substr(2, 9).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    setSystemConfig(prev => ({ ...prev, userApiKey: newKey }));
    localStorage.setItem('nexus_api_key', newKey);
  };

  const handleApiRequest = async (params: URLSearchParams) => {
      const key = params.get('key') || '';
      const prompt = params.get('prompt') || params.get('q') || '';
      if (!validateApiKey(key)) {
        document.body.innerHTML = `<pre style="color:red; padding:20px;">Error 401: Unauthorized. Invalid API Key.</pre>`;
        return;
      }
      const res = await processNexusRequest(prompt);
      document.body.style.backgroundColor = '#111';
      document.body.style.color = '#fff';
      document.body.innerHTML = `<pre style="padding:20px; font-family:monospace;">${JSON.stringify(res, null, 2)}</pre>`;
  };

  const activeConversation = conversations.find(c => c.id === currentId);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-gpt-dark font-sans text-gpt-text">
      
      {/* --- SIDEBAR --- */}
      <div 
        className={`${
          sidebarOpen ? 'w-[260px]' : 'w-0'
        } bg-gpt-sidebar flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col border-r border-black/10 relative overflow-hidden`}
      >
        <div className={`flex-1 flex flex-col w-[260px] h-full ${!sidebarOpen && 'invisible'}`}>
          <div className="p-3">
            <button 
              onClick={createNewChat}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-md border border-white/20 text-sm text-white hover:bg-gpt-hover transition-colors text-left"
            >
              <Plus className="w-4 h-4" />
              New chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-2 min-h-0">
             <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Today</div>
             {conversations.map(chat => (
               <button
                 key={chat.id}
                 onClick={() => { setCurrentId(chat.id); setMode(AppMode.CHAT); }}
                 className={`group flex items-center gap-3 w-full px-3 py-3 text-sm rounded-md transition-colors relative ${
                   currentId === chat.id && mode === AppMode.CHAT ? 'bg-gpt-hover text-white' : 'text-gray-300 hover:bg-gpt-hover'
                 }`}
               >
                 <MessageSquare className="w-4 h-4 flex-shrink-0 text-gray-400" />
                 <span className="truncate flex-1 text-left">{chat.title}</span>
                 {(currentId === chat.id) && (
                   <div 
                    onClick={(e) => deleteChat(e, chat.id)}
                    className="absolute right-2 text-gray-400 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                   >
                     <Trash2 className="w-4 h-4" />
                   </div>
                 )}
               </button>
             ))}
          </div>

          <div className="border-t border-white/20 p-2 space-y-1 bg-gpt-sidebar">
             <button
               onClick={() => setMode(AppMode.LIVE)}
               className={`flex items-center gap-3 w-full px-3 py-3 text-sm rounded-md transition-colors ${
                 mode === AppMode.LIVE ? 'bg-gpt-hover text-white' : 'text-gray-300 hover:bg-gpt-hover'
               }`}
             >
               <Mic className="w-4 h-4" />
               Live Voice Mode
             </button>
             <button 
               onClick={() => setShowSettings(true)}
               className="flex items-center gap-3 w-full px-3 py-3 text-sm text-gray-300 hover:bg-gpt-hover rounded-md transition-colors"
             >
               <Settings className="w-4 h-4" />
               Settings & API Key
             </button>
          </div>
        </div>
      </div>

      {/* --- MAIN AREA --- */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        
        {/* Top Bar */}
        <div className="sticky top-0 z-10 bg-gpt-dark text-gray-300 p-2 flex items-center gap-2 border-b border-white/5 sm:border-none shrink-0">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gpt-hover rounded-md transition-colors"
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? <ChevronLeft className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
          </button>
          <span className="sm:hidden font-medium text-gray-200 truncate">
            {mode === AppMode.LIVE ? 'Nexus Live' : activeConversation?.title || 'New Chat'}
          </span>
          <div className="flex-1"></div>
          <div className="px-4 text-xs font-mono text-gray-500 hidden sm:block">Nexus</div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          {mode === AppMode.CHAT ? (
            <ChatInterface 
              messages={activeConversation?.messages || []} 
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          ) : (
            <LiveInterface />
          )}
        </div>
      </div>

      {/* --- SETTINGS MODAL --- */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-gpt-sidebar w-full max-w-2xl rounded-lg shadow-2xl border border-white/10 p-6 flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between mb-6 shrink-0">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5" /> Settings
                </h2>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
                
                {/* API Key Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Authentication</h3>
                    <div className="bg-gpt-dark p-4 rounded-md border border-white/5">
                      <label className="block text-xs uppercase text-gray-500 font-semibold mb-2">Your API Key</label>
                      <div className="flex gap-2">
                        <code className="flex-1 bg-black/30 p-2 rounded text-sm text-green-400 font-mono truncate border border-white/5 select-all">
                          {systemConfig.userApiKey || "Not generated"}
                        </code>
                        <button 
                          onClick={generateNewApiKey}
                          className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm text-white transition-colors"
                        >
                          {systemConfig.userApiKey ? 'Regenerate' : 'Generate'}
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-2">
                        Keep this key private. It allows external access to the Nexus engine.
                      </p>
                    </div>
                </div>

                {/* Developer Guide Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider flex items-center gap-2">
                      <Code className="w-4 h-4" /> Developer Guide
                  </h3>
                  
                  <div className="text-sm text-gray-400 space-y-2">
                    <p>Nexus exposes a lightweight HTTP GET endpoint for programmatic access.</p>
                  </div>

                  {!systemConfig.userApiKey ? (
                    <div className="p-6 rounded-md border border-white/5 bg-white/5 text-center flex flex-col items-center justify-center space-y-2">
                        <div className="p-2 bg-white/5 rounded-full mb-1"><Code className="w-5 h-5 text-gray-500" /></div>
                        <p className="text-gray-300 font-medium text-sm">Developer Access Locked</p>
                        <p className="text-xs text-gray-500 max-w-xs">
                           Generate an API Key in the section above to unlock the implementation guide and code snippets.
                        </p>
                    </div>
                  ) : (
                    <div className="bg-black/30 p-4 rounded-md border border-white/5 space-y-4">
                      
                      {/* Endpoint Structure */}
                      <div>
                        <span className="text-xs uppercase text-gray-500 font-semibold">Base Endpoint</span>
                        <div className="mt-1 p-2 bg-gpt-dark rounded text-xs text-gray-300 font-mono break-all border border-white/5">
                          {endpointUrl || '...' }?key=<span className="text-green-400 font-bold">{systemConfig.userApiKey}</span>&prompt=<span className="text-blue-400 font-bold">YOUR_QUERY</span>
                        </div>
                      </div>
                      
                      {/* Code Example */}
                      <div>
                        <span className="text-xs uppercase text-gray-500 font-semibold">JavaScript Example</span>
                        <pre className="mt-1 p-3 bg-gpt-dark rounded text-xs text-gray-300 font-mono overflow-x-auto border border-white/5 leading-5">
{`const apiKey = "${systemConfig.userApiKey}";
const prompt = "What is the capital of France?";
const url = \`\${"${endpointUrl || window.location.origin}"}?key=\${apiKey}&prompt=\${encodeURIComponent(prompt)}\`;

// Make the request
fetch(url)
  .then(response => response.json())
  .then(data => {
    console.log("Nexus Response:", data.text);
    if (data.imageUrl) console.log("Image:", data.imageUrl);
  })
  .catch(console.error);`}
                        </pre>
                      </div>

                      {/* Test Button */}
                      <div className="pt-2">
                        <a 
                          href={`${endpointUrl}?key=${systemConfig.userApiKey}&prompt=What%20is%20Nexus%3F`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-2 rounded hover:bg-blue-600/30 transition-colors"
                        >
                          Open Test Request <span className="text-[10px] opacity-70">↗</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              <div className="mt-6 flex justify-end shrink-0 pt-4 border-t border-white/10">
                <button onClick={() => setShowSettings(false)} className="px-4 py-2 bg-white text-black font-medium rounded hover:bg-gray-200">
                  Done
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;