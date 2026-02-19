import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, Volume2, BookOpen, Sparkles, User, StopCircle, CheckCheck, Lightbulb, Ear, Eye, Target, Box, Gamepad2, Camera, Zap, Star, Flame, LayoutGrid } from 'lucide-react';

// --- CONFIGURACIÓN DE ESCENARIOS ---
const SCENARIOS = {
    gamer: {
        id: 'gamer',
        name: 'Gamer Quest',
        personality: 'Pixel (Pro Gamer)',
        avatar: <Gamepad2 size={20} />,
        color: 'indigo',
        accent: 'purple',
        bg: 'bg-indigo-950',
        description: 'Habla sobre el nuevo torneo mundial y estrategias de juego.',
        systemPrompt: `You are "Pixel", a pro gamer and streamer. You speak like a cool 14-year-old using gamer slang (GG, glitch, lag, skin, level up, epic). 
                   Use lots of emojis (🎮, 🔥, 🕹️, 👾). Be very energetic and encouraging.
                   STORY: You are building a team for a huge tournament. Ask the user about their favorite games and skill level.`,
        missions: [
            { word: 'glitch', label: 'Glitch', completed: false, desc: 'Usa "Glitch" para un error' },
            { word: 'level up', label: 'Level up', completed: false, desc: 'Usa "Level up" al ganar' },
            { word: 'respawn', label: 'Respawn', completed: false, desc: 'Usa "Respawn" para reaparecer' },
            { word: 'strategy', label: 'Strategy', completed: false, desc: 'Habla de tu estrategia' },
        ],
        grammarMission: { type: 'question', desc: '¡Hazle una pregunta a Pixel!', completed: false }
    },
    social: {
        id: 'social',
        name: 'Social Star',
        personality: 'Skye (Influencer)',
        avatar: <Camera size={20} />,
        color: 'rose',
        accent: 'pink',
        bg: 'bg-rose-950',
        description: '¡Planea un video viral y elige los mejores efectos!',
        systemPrompt: `You are "Skye", a famous teen influencer. You are super trendy, use words like (viral, vibes, aesthetic, cringe, caption, trending).
                   Use emojis (📸, ✨, 💖, 🤳). Be very friendly and obsessed with "good vibes".
                   STORY: You need help choosing a challenge for your next video. Ask the user for ideas for a viral Tik-Tok.`,
        missions: [
            { word: 'viral', label: 'Viral', completed: false, desc: 'Usa "Viral" para el video' },
            { word: 'caption', label: 'Caption', completed: false, desc: 'Usa "Caption" (subtítulo)' },
            { word: 'trending', label: 'Trending', completed: false, desc: 'Usa "Trending" (tendencia)' },
            { word: 'cringe', label: 'Cringe', completed: false, desc: 'Usa "Cringe" para algo raro' },
        ],
        grammarMission: { type: 'adjective', desc: '¡Usa un adjetivo (cool, amazing...)!', completed: false }
    }
};

const App = () => {
    // --- STATE ---
    const [currentScenario, setCurrentScenario] = useState(SCENARIOS.gamer);
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'model',
            text: "Yo! Welcome to the crew! 🎮 I'm Pixel. Are you ready to dominate the tournament? What's your favorite game right now? 🔥",
            translation: "¡Ey! ¡Bienvenido al equipo! 🎮 Soy Pixel. ¿Estás listo para dominar el torneo? ¿Cuál es tu juego favorito ahora mismo? 🔥",
            correction: null,
            explanation: null,
            blurred: false
        }
    ]);

    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [listeningMode, setListeningMode] = useState(false);
    const [showTranslation, setShowTranslation] = useState(false);
    const [showTreasures, setShowTreasures] = useState(false);

    // Gamification State
    const [xp, setXp] = useState(0);
    const [level, setLevel] = useState(1);
    const [streak, setStreak] = useState(3);
    const [treasureBox, setTreasureBox] = useState([]);
    const [missions, setMissions] = useState(SCENARIOS.gamer.missions);
    const [grammarGoal, setGrammarGoal] = useState(SCENARIOS.gamer.grammarMission);
    const [suggestedReplies, setSuggestedReplies] = useState([]);

    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);
    const audioRef = useRef(null);
    const textareaRef = useRef(null);

    const apiKey = ""; // Injected by environment

    // --- LOGIC: Scenario Changer ---
    const changeScenario = (id) => {
        const sc = SCENARIOS[id];
        setCurrentScenario(sc);
        setMissions(sc.missions);
        setGrammarGoal(sc.grammarMission);
        setMessages([{
            id: Date.now(),
            role: 'model',
            text: id === 'gamer' ? "Yo! Let's get those wins! 🎮" : "Hi bestie! Let's make something viral! ✨",
            translation: id === 'gamer' ? "¡Ey! ¡Vamos a por esas victorias!" : "¡Hola! ¡Hagamos algo viral!",
            correction: null,
            blurred: false
        }]);
    };

    const addXP = (amount) => {
        setXp(prev => {
            const newXP = prev + amount;
            if (newXP >= 100) {
                setLevel(l => l + 1);
                return newXP - 100;
            }
            return newXP;
        });
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // --- AUDIO LOGIC ---
    const playTTS = async (text) => {
        if (isPlayingAudio) return;
        setIsPlayingAudio(true);
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: text }] }],
                    generationConfig: {
                        responseModalities: ["AUDIO"],
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: currentScenario.id === 'gamer' ? "Puck" : "Charon" } } }
                    }
                })
            });
            if (!response.ok) throw new Error('TTS API Error');
            const data = await response.json();
            const audioContent = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (audioContent) {
                audioRef.current.src = `data:audio/wav;base64,${audioContent}`;
                audioRef.current.play();
                audioRef.current.onended = () => setIsPlayingAudio(false);
            }
        } catch (error) {
            console.error(error);
            setIsPlayingAudio(false);
        }
    };

    const handleMicClick = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return alert("Usa Chrome.");
        if (isListening) { recognitionRef.current.stop(); return; }
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (e) => setInputText(Array.from(e.results).map(r => r[0].transcript).join(''));
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
        recognition.start();
    };

    // --- CORE LOGIC ---
    const handleSend = async (textOverride = null) => {
        const textToSend = textOverride || inputText;
        if (!textToSend.trim()) return;
        if (isListening) recognitionRef.current.stop();

        const currentMsgId = Date.now();
        setMessages(prev => [...prev, { id: currentMsgId, role: 'user', text: textToSend }]);
        setInputText('');
        setIsLoading(true);

        try {
            const history = messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })).slice(-8);
            const activeMissions = missions.filter(m => !m.completed).map(m => m.word);

            const systemPrompt = `
        ${currentScenario.systemPrompt}
        PEDAGOGICAL TASKS:
        1. Grammar analysis.
        2. Translation.
        3. MISSION CHECK: Did user use: ${JSON.stringify(activeMissions)}?
        4. GRAMMAR GOAL: Check if user achieved "${grammarGoal.desc}". Target type: ${grammarGoal.type}.
        
        OUTPUT JSON:
        {
          "response": "Reply with emojis",
          "translation": "Spanish",
          "user_correction": "Correction or null",
          "feedback_explanation": "Short tip in Spanish or null",
          "suggested_replies": ["Short reply 1", "..."],
          "missions_achieved": ["word"],
          "grammar_achieved": boolean
        }
      `;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [...history, { role: 'user', parts: [{ text: textToSend }] }],
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    generationConfig: { responseMimeType: "application/json" }
                })
            });

            const data = await response.json();
            const content = JSON.parse(data.candidates[0].content.parts[0].text);

            let earnedXP = 10;
            if (content.missions_achieved?.length > 0) {
                earnedXP += content.missions_achieved.length * 20;
                setMissions(prev => prev.map(m => {
                    if (content.missions_achieved.includes(m.word) && !m.completed) {
                        setTreasureBox(t => [...new Set([...t, m.word])]);
                        return { ...m, completed: true };
                    }
                    return m;
                }));
            }

            if (content.grammar_achieved && !grammarGoal.completed) {
                earnedXP += 30;
                setGrammarGoal(prev => ({ ...prev, completed: true }));
            }

            addXP(earnedXP);

            setMessages(prev => prev.map(msg =>
                msg.id === currentMsgId ? { ...msg, userCorrection: content.user_correction, translation: content.translation } : msg
            ));

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'model',
                text: content.response,
                translation: content.translation,
                explanation: content.feedback_explanation,
                blurred: listeningMode
            }]);
            setSuggestedReplies(content.suggested_replies || []);
            if (listeningMode) playTTS(content.response);

        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { id: Date.now(), role: 'model', text: "Error connection! 📡" }]);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleBlur = (id) => setMessages(prev => prev.map(m => m.id === id ? { ...m, blurred: !m.blurred } : m));

    const LevelUpBadge = () => (
        <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 rounded-full text-white text-xs font-black shadow-lg animate-bounce">
            <Star size={14} fill="white" />
            <span>LVL {level}</span>
        </div>
    );

    const TreasureModal = () => (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5">
                <div className={`bg-${currentScenario.accent}-500 p-6 text-white text-center`}>
                    <Box size={40} className="mx-auto mb-2 text-white" />
                    <h2 className="text-2xl font-black italic uppercase">Treasure Box</h2>
                    <p className="opacity-90 font-bold">¡Tu vocabulario coleccionado!</p>
                </div>
                <div className="p-6 grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto">
                    {treasureBox.length === 0 ? (
                        <p className="col-span-2 text-center text-slate-400 italic">Todavía no has recolectado tesoros...</p>
                    ) : (
                        treasureBox.map((word, i) => (
                            <div key={i} className="bg-slate-50 border-2 border-slate-100 rounded-xl p-3 flex flex-col items-center gap-1">
                                <Box size={24} className="text-orange-400" />
                                <span className="font-bold text-slate-700 capitalize">{word}</span>
                            </div>
                        ))
                    )}
                </div>
                <div className="p-4 flex justify-center border-t">
                    <button onClick={() => setShowTreasures(false)} className={`bg-${currentScenario.accent}-500 text-white font-black px-8 py-3 rounded-2xl`}>Cerrar</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`flex flex-col h-screen ${currentScenario.bg} font-sans transition-colors duration-700 text-slate-900`}>
            <audio ref={audioRef} className="hidden" />
            {showTreasures && <TreasureModal />}

            <header className="bg-white/10 backdrop-blur-md border-b border-white/10 p-4 sticky top-0 z-30">
                <div className="max-w-4xl mx-auto flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className={`bg-${currentScenario.accent}-500 p-2.5 rounded-2xl text-white shadow-lg shadow-${currentScenario.accent}-500/30 animate-pulse`}>
                                {currentScenario.avatar}
                            </div>
                            <div>
                                <h1 className="text-white font-black italic text-lg leading-tight uppercase tracking-tighter">
                                    English Buddy <span className={`text-${currentScenario.accent}-400`}>PRO</span>
                                </h1>
                                <p className="text-[10px] text-white/60 font-black uppercase tracking-widest">{currentScenario.personality}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
                                <Flame size={18} className="text-orange-500 fill-orange-500" />
                                <span className="text-white font-black">{streak}</span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-2">
                                    <LevelUpBadge />
                                    <div className="w-24 sm:w-32 h-3 bg-white/10 rounded-full overflow-hidden">
                                        <div className={`h-full bg-gradient-to-r from-${currentScenario.accent}-400 to-${currentScenario.accent}-600 transition-all duration-1000`} style={{ width: `${xp}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
                        <button onClick={() => changeScenario(currentScenario.id === 'gamer' ? 'social' : 'gamer')} className="flex-shrink-0 bg-white/5 p-2 rounded-xl text-white border border-white/10">
                            <LayoutGrid size={20} />
                        </button>
                        <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/10 pr-3">
                            <div className="bg-orange-500 p-1.5 rounded-xl ml-0.5"><Target size={14} className="text-white" /></div>
                            <div className="flex gap-2">
                                {missions.map((m, i) => (
                                    <div key={i} className={`text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-tighter transition-all duration-300 ${m.completed ? 'bg-green-500 border-green-500 text-white' : 'bg-white/5 border-white/10 text-white/20'}`}>
                                        {m.word}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar">
                <div className="max-w-3xl mx-auto space-y-8 py-6">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group transition-all`}>
                            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center mt-1 shadow-lg border-2 ${msg.role === 'user' ? 'bg-slate-900 border-slate-700' : `bg-${currentScenario.accent}-500 border-${currentScenario.accent}-400`}`}>
                                    {msg.role === 'user' ? <User size={18} className="text-white" /> : currentScenario.avatar}
                                </div>

                                <div className="relative">
                                    <div className={`p-4 rounded-3xl text-sm sm:text-base leading-relaxed font-medium shadow-xl transition-all duration-300 ${msg.role === 'user' ? `bg-${currentScenario.accent}-600 text-white rounded-tr-none border-b-4 border-${currentScenario.accent}-800` : 'bg-white text-slate-800 rounded-tl-none'}`}>
                                        {msg.role === 'model' && msg.blurred ? (
                                            <div onClick={() => toggleBlur(msg.id)} className="cursor-pointer py-2 flex flex-col items-center gap-4">
                                                <p className="blur-md select-none opacity-20">{msg.text}</p>
                                                <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-3xl backdrop-blur-sm">
                                                    <div className={`bg-${currentScenario.accent}-100 text-${currentScenario.accent}-600 px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2`}>
                                                        <Ear size={16} /> Revelar Audio
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="animate-in fade-in zoom-in-95 duration-500">{msg.text}</p>
                                        )}

                                        {showTranslation && msg.translation && !msg.blurred && (
                                            <div className={`mt-3 pt-3 border-t text-xs italic ${msg.role === 'user' ? 'border-white/20 text-white/60' : 'border-slate-100 text-slate-400'}`}>
                                                {msg.translation}
                                            </div>
                                        )}
                                    </div>

                                    {msg.role === 'user' && msg.userCorrection && (
                                        <div className="mt-2 flex items-center gap-2 bg-green-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg">
                                            <Zap size={10} fill="white" /> Pro Tip: {msg.userCorrection}
                                        </div>
                                    )}

                                    {msg.role === 'model' && msg.explanation && (
                                        <div className="mt-2 ml-1 bg-amber-400 text-slate-900 text-[10px] font-black uppercase p-3 rounded-2xl rounded-tl-none shadow-xl border-l-4 border-amber-600 max-w-[180px] flex gap-2">
                                            <Lightbulb size={12} className="flex-shrink-0" />
                                            <span>{msg.explanation}</span>
                                        </div>
                                    )}

                                    {msg.role === 'model' && (
                                        <button
                                            onClick={() => playTTS(msg.text)}
                                            className={`absolute -right-12 top-0 p-3 rounded-2xl bg-white shadow-xl border border-slate-100 transition-all ${isPlayingAudio ? 'text-indigo-500 animate-pulse' : 'text-slate-400 hover:text-indigo-600 hover:scale-110'}`}
                                        >
                                            <Volume2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-4 animate-pulse">
                            <div className="w-10 h-10 bg-white/20 rounded-2xl"></div>
                            <div className="h-14 w-32 bg-white/10 rounded-3xl rounded-tl-none"></div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <footer className="bg-slate-900/80 backdrop-blur-xl border-t border-white/10 p-4 sm:p-6 pb-8 md:pb-6">
                <div className="max-w-4xl mx-auto space-y-4">
                    <div className="flex flex-wrap gap-2 justify-between items-center">
                        <div className="flex gap-2">
                            {suggestedReplies.map((r, i) => (
                                <button key={i} onClick={() => handleSend(r)} className="bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl border border-white/5 transition-all">
                                    {r}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowTreasures(true)} className="p-3 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-2xl">
                                <Box size={20} />
                            </button>
                            <button onClick={() => setShowTranslation(!showTranslation)} className={`p-3 rounded-2xl border transition-all ${showTranslation ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-white/5 text-white border-white/10'}`}>
                                <BookOpen size={20} />
                            </button>
                            <button onClick={() => setListeningMode(!listeningMode)} className={`p-3 rounded-2xl border transition-all ${listeningMode ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-white/5 text-white border-white/10'}`}>
                                {listeningMode ? <Ear size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div className={`p-3 rounded-2xl border-2 flex items-center justify-between transition-all ${grammarGoal.completed ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-white/5 border-white/10 text-white/50'}`}>
                        <div className="flex items-center gap-3">
                            <Star size={18} fill={grammarGoal.completed ? "currentColor" : "none"} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Mastery Goal: {grammarGoal.desc}</span>
                        </div>
                        {grammarGoal.completed && <CheckCheck size={18} />}
                    </div>

                    <div className="flex gap-3 items-end">
                        <button onClick={handleMicClick} className={`p-4 rounded-3xl transition-all shadow-2xl ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-white/10 text-white border border-white/20'}`}>
                            {isListening ? <StopCircle size={26} /> : <Mic size={26} />}
                        </button>

                        <div className="flex-1 relative group">
                            <textarea
                                ref={textareaRef}
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                                placeholder={isListening ? "Listening..." : "Type a message..."}
                                className="w-full bg-white/10 border-2 border-white/10 focus:border-indigo-500/50 focus:bg-white focus:text-slate-900 rounded-3xl px-6 py-4 text-white text-base transition-all resize-none max-h-32 min-h-[60px]"
                                rows={1}
                            />
                            <Sparkles size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-400 transition-colors pointer-events-none" />
                        </div>

                        <button onClick={() => handleSend()} disabled={!inputText.trim() || isLoading} className={`bg-${currentScenario.accent}-500 hover:bg-${currentScenario.accent}-600 p-4 rounded-3xl text-white shadow-2xl`}>
                            <Send size={26} />
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default App;
