
import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { encode, decode, decodeAudioData, getAI } from '../../services/gemini';

interface LiveLabProps {
  voice: string;
  userName: string;
  onSelectKey: () => void;
}

const LiveLab: React.FC<LiveLabProps> = ({ voice, userName, onSelectKey }) => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [authError, setAuthError] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Guard to ensure stop logic only runs once per session
  const isStoppingRef = useRef(false);

  const stopSession = useCallback(() => {
    // If we're not active or already stopping, do nothing
    if (isStoppingRef.current) return;
    
    isStoppingRef.current = true;
    setIsActive(false);

    if (sessionRef.current) {
      try {
        sessionRef.current.close?.();
      } catch (e) {
        console.warn("Error closing session:", e);
      }
      sessionRef.current = null;
    }

    setTranscription(prev => {
      // Extra safety check: only add if the last message wasn't already a session end
      if (prev.length > 0 && prev[prev.length - 1] === "[Session Ended]") return prev;
      return [...prev, "[Session Ended]"];
    });
    
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
  }, []);

  const startSession = async () => {
    try {
      setAuthError(false);
      setIsConnecting(true);
      isStoppingRef.current = false;
      const ai = getAI();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            setTranscription(prev => [...prev, "[Connection Established]"]);
            
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(session => {
                // Only send if we haven't started stopping
                if (!isStoppingRef.current) {
                  session.sendRealtimeInput({ media: pcmBlob });
                }
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (isStoppingRef.current) return;

            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setTranscription(prev => [...prev, `AI: ${text}`]);
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: any) => {
            console.error("Live session error:", e);
            if (e?.message?.includes('403') || e?.message?.toLowerCase().includes('permission')) {
              setAuthError(true);
            }
            stopSession();
          },
          onclose: () => stopSession(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          systemInstruction: `You are a helpful AI assistant. The user's name is ${userName}. Keep responses concise and natural.`,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice as any } }
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error("Connection failed:", err);
      if (err?.message?.includes('403') || err?.message?.toLowerCase().includes('permission')) {
        setAuthError(true);
      }
      setIsConnecting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fadeIn relative">
      {authError && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md rounded-3xl flex items-center justify-center p-8 text-center border border-red-500/30">
          <div className="max-w-md space-y-6">
            <div className="text-6xl">🔒</div>
            <h3 className="text-2xl font-bold text-red-400">Permission Denied (403)</h3>
            <p className="text-slate-400 leading-relaxed">
              The Live API requires a Gemini API key from a project with billing enabled. 
              Please select a valid paid project key to continue.
            </p>
            <button
              onClick={() => { setAuthError(false); onSelectKey(); }}
              className="bg-red-500 hover:bg-red-600 px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-900/40"
            >
              Select Premium API Key
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700 shadow-xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">Live Voice Chat</h2>
            <p className="text-slate-400">Talking to you with the <span className="text-indigo-400 font-bold">{voice}</span> voice.</p>
          </div>
          <button
            onClick={isActive ? stopSession : startSession}
            disabled={isConnecting}
            className={`px-8 py-3 rounded-full font-bold transition-all duration-300 text-white disabled:opacity-50 ${
              isActive ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'hover:brightness-110'
            }`}
            style={!isActive ? { backgroundColor: 'var(--primary)' } : {}}
          >
            {isConnecting ? 'Connecting...' : isActive ? 'End Call' : 'Start Conversation'}
          </button>
        </div>

        <div className="h-96 overflow-y-auto bg-slate-900/50 rounded-2xl p-6 border border-slate-800 space-y-4">
          {transcription.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <span className="text-4xl mb-4">🎤</span>
              <p>Welcome, {userName}. Say hello!</p>
            </div>
          )}
          {transcription.map((line, i) => (
            <div 
              key={i} 
              className={`p-3 rounded-lg transition-all duration-500 ${
                line.startsWith('AI:') ? 'text-white ml-8 border' : 'bg-slate-800 text-slate-100 mr-8 border-transparent'
              }`}
              style={line.startsWith('AI:') ? { 
                backgroundColor: 'var(--primary-glow)',
                borderColor: 'var(--primary)',
                boxShadow: 'inset 0 0 20px var(--primary-glow)'
              } : {}}
            >
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LiveLab;
