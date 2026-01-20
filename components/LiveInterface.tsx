import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Radio } from 'lucide-react';
import { processNexusRequest } from '../services/nexus';
import { supportsSpeech } from '../utils/audio';

const LiveInterface: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'standby' | 'listening' | 'processing' | 'speaking'>('standby');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');

  // Refs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);

  // Check support
  const isSupported = supportsSpeech();

  useEffect(() => {
    if (isSupported) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setStatus('listening');

        recognition.onresult = (event: any) => {
          let current = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            current += event.results[i][0].transcript;
          }
          setTranscript(current);
        };

        recognition.onend = async () => {
          if (!isActive) return;
          if (transcript.trim()) {
            await processInput(transcript);
          } else {
             if (isActive) {
               try { recognition.start(); } catch (e) {}
             }
          }
        };

        recognitionRef.current = recognition;
      }
    }
    return () => stopSession();
  }, [isActive, transcript]); 

  const processInput = async (text: string) => {
    setStatus('processing');
    setTranscript(text);
    const result = await processNexusRequest(text, []); 
    setResponse(result.text);

    setStatus('speaking');
    const utterance = new SpeechSynthesisUtterance(result.text);
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.lang === 'en-US');
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.pitch = 1.0;
    utterance.rate = 1.0;

    utterance.onend = () => {
        setTranscript('');
        if (isActive && recognitionRef.current) {
            setStatus('listening');
            try { recognitionRef.current.start(); } catch(e) {}
        } else {
            setStatus('standby');
        }
    };
    synthRef.current.speak(utterance);
  };

  const startSession = () => {
    if (!isSupported) { alert("Browser does not support Web Speech API"); return; }
    setIsActive(true);
    synthRef.current.cancel(); 
    if (recognitionRef.current) try { recognitionRef.current.start(); } catch(e) {}
  };

  const stopSession = () => {
    setIsActive(false);
    setStatus('standby');
    if (recognitionRef.current) recognitionRef.current.stop();
    synthRef.current.cancel();
  };

  return (
    <div className="flex flex-col h-full items-center justify-center p-6 bg-gpt-dark text-gpt-text relative overflow-hidden">
      
      {/* Background Pulse */}
      {status !== 'standby' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
           <div className={`w-96 h-96 rounded-full blur-[100px] transition-all duration-1000 ${
             status === 'listening' ? 'bg-red-500/10' : 
             status === 'speaking' ? 'bg-green-500/10' : 'bg-blue-500/10'
           }`}></div>
        </div>
      )}

      <div className="z-10 text-center space-y-12 max-w-2xl w-full">
        
        {/* Status Display */}
        <div className="min-h-[120px] flex flex-col items-center justify-end space-y-4">
            <span className={`text-xs font-mono tracking-widest px-3 py-1 rounded-full border ${
              status === 'standby' ? 'border-gray-600 text-gray-500' :
              status === 'listening' ? 'border-red-500/50 text-red-400 bg-red-500/10' :
              status === 'speaking' ? 'border-green-500/50 text-green-400 bg-green-500/10' :
              'border-blue-500/50 text-blue-400 bg-blue-500/10'
            }`}>
              {status === 'standby' ? 'READY' : status.toUpperCase()}
            </span>
            
            <p className="text-2xl md:text-3xl font-light text-white transition-opacity duration-300">
                {status === 'listening' ? `"${transcript}"` : 
                 status === 'speaking' ? response : 
                 status === 'processing' ? "Thinking..." :
                 "Press the microphone to start."}
            </p>
        </div>

        {/* Main Button */}
        <div className="flex justify-center">
            <button
                onClick={isActive ? stopSession : startSession}
                className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive 
                    ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_30px_rgba(239,68,68,0.4)]' 
                    : 'bg-white hover:bg-gray-200 shadow-[0_0_30px_rgba(255,255,255,0.1)]'
                }`}
            >
                {isActive ? (
                    <MicOff className="w-10 h-10 text-white" />
                ) : (
                    <Mic className="w-10 h-10 text-gpt-dark" />
                )}
            </button>
        </div>

        {/* Info Footer */}
        <div className="text-gray-500 text-xs font-mono">
           {isSupported ? (
             <div className="flex items-center justify-center gap-2 opacity-50">
               <Radio className="w-3 h-3" /> Voice Module Active
             </div>
           ) : (
             <span className="text-red-400">Audio Hardware Unavailable</span>
           )}
        </div>
      </div>
    </div>
  );
};

export default LiveInterface;