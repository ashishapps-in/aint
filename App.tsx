
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Eraser, Square, Circle as CircleIcon, Minus, Undo2, Redo2, 
  Download, Trash2, Brush, Type, Pipette, PaintBucket, Search, 
  Triangle, Star, Heart, RotateCcw, FlipHorizontal, FlipVertical, ZoomIn, 
  ZoomOut, Maximize2, Layers, Crop, Plus, Eye, EyeOff, Lock, Unlock, Settings,
  X, FileText, Upload, Save, FolderOpen, HelpCircle, Sparkles, LogIn, User,
  Hexagon, Octagon, Bot, BrainCircuit, Key, MessageSquare, Video, Globe, Image as ImageIcon,
  Send, ExternalLink, Cpu, ShieldCheck, MousePointer2, Move, Frame, ChevronDown, Palette,
  SlidersHorizontal, Layout, Info, Keyboard, Monitor, Share2, MoreHorizontal, History
} from 'lucide-react';
import Canvas from './components/Canvas';
import { Tool, BrushType, CanvasRef, Layer, BrushSettings, BlendingMode, ProjectData, AIProvider, AspectRatio, ImageSize, ChatMessage, Point } from './types';
import * as gemini from './services/geminiService';
import { processAIRequest } from './services/aiService';

const COLORS = [
  '#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8', '#3f48cc', '#a349a4',
  '#ffffff', '#c3c3c3', '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0', '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7',
  '#1a1a1a', '#333333', '#4d4d4d', '#666666', '#999999', '#b3b3b3', '#cccccc', '#e6e6e6', '#f2f2f2', '#ffffff'
];

const STORAGE_KEY = 'aint_ai_key_storage';

// Define the missing PROVIDERS constant to resolve mapping errors in the UI.
const PROVIDERS: { id: AIProvider; label: string; icon: React.ReactNode }[] = [
  { id: 'gemini', label: 'Google Gemini', icon: <Bot size={18} /> },
  { id: 'openai', label: 'OpenAI DALL-E', icon: <Cpu size={18} /> },
  { id: 'anthropic', label: 'Anthropic Claude', icon: <BrainCircuit size={18} /> },
  { id: 'grok', label: 'xAI Grok', icon: <Bot size={18} /> },
  { id: 'deepseek', label: 'DeepSeek', icon: <Cpu size={18} /> },
  { id: 'leonardo', label: 'Leonardo.ai', icon: <Palette size={18} /> },
  { id: 'firefly', label: 'Adobe Firefly', icon: <Sparkles size={18} /> },
  { id: 'copilot', label: 'MS Copilot', icon: <Globe size={18} /> },
];

const App: React.FC = () => {
  const [tool, setTool] = useState<Tool>('brush');
  const [brushType, setBrushType] = useState<BrushType>('normal');
  const [color1, setColor1] = useState('#000000');
  const [color2, setColor2] = useState('#ffffff');
  const [activeColorSlot, setActiveColorSlot] = useState<1 | 2>(1);
  const [brushSize, setBrushSize] = useState(5);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [layers, setLayers] = useState<Layer[]>([
    { id: '1', name: 'Background', visible: true, dataUrl: '', locked: false, blendMode: 'source-over', opacity: 1 }
  ]);
  const [activeLayerId, setActiveLayerId] = useState('1');
  const [brushSettings, setBrushSettings] = useState<BrushSettings>({ hardness: 0.8, spacing: 0.2, jitter: 0 });
  const [cursorPos, setCursorPos] = useState<Point>({ x: 0, y: 0 });
  
  // AI Params
  const [aiProvider, setAiProvider] = useState<AIProvider>('gemini');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  
  // UI States
  const [showBrushSettings, setShowBrushSettings] = useState(false);
  const [showAIKeysModal, setShowAIKeysModal] = useState(false);
  const [showColorMaker, setShowColorMaker] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [customRGB, setCustomRGB] = useState({ r: 0, g: 0, b: 0 });

  const canvasRef = useRef<CanvasRef>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setApiKeys(JSON.parse(saved)); } catch (e) { console.error("Key restore failed", e); }
    }
  }, []);

  const saveKeys = (newKeys: Record<string, string>) => {
    setApiKeys(newKeys);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newKeys));
    setShowAIKeysModal(false);
  };

  const updateApiKey = (provider: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
  };

  useEffect(() => {
    const checkLogin = async () => {
      if (window.aistudio) {
        setIsLoggedIn(await window.aistudio.hasSelectedApiKey());
      }
    };
    checkLogin();
  }, []);

  const ensureLogin = async () => {
    if (aiProvider === 'gemini') {
      if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
        await window.aistudio.openSelectKey();
        setIsLoggedIn(true);
      }
      return true;
    }
    if (!apiKeys[aiProvider]) {
      setShowAIKeysModal(true);
      return false;
    }
    return true;
  };

  const handleStateChange = (dataUrl: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(dataUrl);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      canvasRef.current?.loadFromDataUrl(history[newIndex]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      canvasRef.current?.loadFromDataUrl(history[newIndex]);
    }
  }, [history, historyIndex]);

  const exportCanvas = (format: 'png' | 'jpeg' | 'webp') => {
    const url = canvasRef.current?.getCompositeDataUrl(`image/${format}`);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `aint_pro_export.${format}`;
      a.click();
    }
  };

  const runUniversalAI = async (type: 'generate' | 'edit') => {
    const ready = await ensureLogin();
    if (!ready) return;
    const prompt = window.prompt(type === 'generate' ? `Generate using ${aiProvider}:` : `Edit using ${aiProvider}:`);
    if (!prompt) return;
    setIsAILoading(true);
    try {
      const current = canvasRef.current?.getCanvas()?.toDataURL();
      const url = await processAIRequest(type, prompt, { provider: aiProvider, apiKey: apiKeys[aiProvider] }, current);
      canvasRef.current?.loadFromDataUrl(url);
      handleStateChange(url);
    } catch (e) { alert(`${aiProvider.toUpperCase()} Error: ` + (e as Error).message); }
    finally { setIsAILoading(false); }
  };

  const aiAnimate = async () => {
    await ensureLogin();
    const prompt = window.prompt("Animate this scene with Veo:");
    if (!prompt) return;
    const current = canvasRef.current?.getCanvas()?.toDataURL();
    setIsAILoading(true);
    try {
      const videoUrl = await gemini.generateVideoVeo(prompt, current);
      const a = document.createElement('a');
      a.href = videoUrl; a.download = 'veo_video.mp4'; a.click();
    } catch (e) { alert("Video Error: " + (e as Error).message); }
    finally { setIsAILoading(false); }
  };

  const aiAnalyze = async () => {
    await ensureLogin();
    const prompt = window.prompt("Ask Gemini Vision about this image:");
    if (!prompt) return;
    const current = canvasRef.current?.getCanvas()?.toDataURL();
    if (!current) return;
    setIsAILoading(true);
    try {
      const analysis = await gemini.analyzeImageGemini(prompt, current);
      setChatHistory(prev => [...prev, { role: 'user', text: prompt }, { role: 'model', text: analysis }]);
      setShowChat(true);
    } catch (e) { alert("Analysis Error: " + (e as Error).message); }
    finally { setIsAILoading(false); }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput; setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
    try {
      const historyFormatted = chatHistory.map(h => ({ role: h.role, parts: [{ text: h.text }] }));
      const response = await gemini.chatWithGemini(msg, historyFormatted);
      setChatHistory(prev => [...prev, { role: 'model', text: response.text, sources: response.sources }]);
    } catch (e) { setChatHistory(prev => [...prev, { role: 'model', text: "Error: " + (e as Error).message }]); }
  };

  const updateRGB = (ch: 'r'|'g'|'b', v: number) => {
    const n = { ...customRGB, [ch]: v };
    setCustomRGB(n);
    const hex = `#${n.r.toString(16).padStart(2,'0')}${n.g.toString(16).padStart(2,'0')}${n.b.toString(16).padStart(2,'0')}`;
    if (activeColorSlot === 1) setColor1(hex); else setColor2(hex);
  };

  const MenuDropdown: React.FC<{ label: string; items: { label: string; action: () => void; icon?: React.ReactNode }[] }> = ({ label, items }) => (
    <div className="relative h-full flex items-center group">
      <button 
        className={`px-4 h-full flex items-center gap-1.5 transition-all text-zinc-300 hover:text-white font-medium ${activeMenu === label ? 'bg-zinc-800 text-blue-400' : ''}`}
        onClick={() => setActiveMenu(activeMenu === label ? null : label)}
      >
        {label} <ChevronDown size={12} className={`opacity-40 transition-transform ${activeMenu === label ? 'rotate-180' : ''}`} />
      </button>
      {activeMenu === label && (
        <div className="absolute top-full left-0 w-64 bg-[#1e1e1e] border border-zinc-700 shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[150] py-2 rounded-b-xl animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-md">
          {items.map((it, i) => (
            <button key={i} className="group w-full text-left px-5 py-2.5 hover:bg-blue-600 flex items-center gap-4 text-xs font-semibold text-zinc-300 hover:text-white" onClick={() => { it.action(); setActiveMenu(null); }}>
              <span className="text-zinc-500 group-hover:text-white/80">{it.icon}</span> {it.label}
            </button>
          ))}
          <div className="fixed inset-0 z-[-1]" onClick={() => setActiveMenu(null)} />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-screen w-full bg-[#080808] text-zinc-300 font-sans overflow-hidden select-none antialiased">
      {/* Premium Header */}
      <header className="h-12 bg-[#121212] border-b border-zinc-800/50 flex items-center px-6 justify-between text-xs z-[110] shadow-sm">
        <div className="flex items-center h-full gap-2">
          <div className="flex items-center gap-3 mr-8">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-md opacity-20"></div>
              <div className="relative p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                <Palette size={18} className="text-white" />
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-black tracking-tighter text-white text-lg italic uppercase">Aint<span className="text-blue-500">Pro</span></span>
              <span className="text-[8px] font-bold text-zinc-500 tracking-[0.3em] uppercase">Creative Engine</span>
            </div>
          </div>
          
          <MenuDropdown label="File" items={[
            { label: 'New Workspace', action: () => canvasRef.current?.clear(), icon: <FileText size={16}/> },
            { label: 'Export as PNG (Lossless)', action: () => exportCanvas('png'), icon: <ImageIcon size={16}/> },
            { label: 'Export as JPG (Compact)', action: () => exportCanvas('jpeg'), icon: <ImageIcon size={16}/> },
            { label: 'Export as WebP (Web Optimized)', action: () => exportCanvas('webp'), icon: <Globe size={16}/> },
            { label: 'Canvas Properties', action: () => setShowInfo(true), icon: <Settings size={16}/> },
            { label: 'Clear Everything', action: () => canvasRef.current?.clear(), icon: <Trash2 size={16}/> }
          ]} />
          
          <MenuDropdown label="Edit" items={[
            { label: 'Undo Action', action: undo, icon: <Undo2 size={16}/> },
            { label: 'Redo Action', action: redo, icon: <Redo2 size={16}/> },
            { label: 'Rotate 90° CCW', action: () => canvasRef.current?.rotate(-90), icon: <RotateCcw size={16}/> },
            { label: 'Flip Horizontally', action: () => canvasRef.current?.flip(true), icon: <FlipHorizontal size={16}/> }
          ]} />
          
          <MenuDropdown label="Workspace" items={[
            { label: 'Keyboard Shortcuts', action: () => setShowHelp(true), icon: <Keyboard size={16}/> },
            { label: 'Reset Viewport', action: () => setZoom(1), icon: <Monitor size={16}/> },
            { label: 'Toggle AI Panel', action: () => setShowChat(!showChat), icon: <MessageSquare size={16}/> }
          ]} />
        </div>
        
        <div className="flex items-center gap-5">
          <div className="flex items-center bg-[#1a1a1a] rounded-full border border-zinc-700/50 pl-4 pr-1 py-1 gap-3 hover:border-zinc-500 transition-colors">
             <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Core Engine</span>
             <select 
              value={aiProvider} onChange={(e) => setAiProvider(e.target.value as AIProvider)}
              className="bg-zinc-900 border border-zinc-700 rounded-full px-4 py-1.5 outline-none font-bold text-blue-400 text-[11px] appearance-none cursor-pointer hover:text-white transition-colors"
            >
              {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <ChevronDown size={10} className="mr-2 text-zinc-600" />
          </div>
          <button 
            onClick={ensureLogin}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full border text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 ${isLoggedIn || apiKeys[aiProvider] ? 'bg-green-600/10 border-green-500 text-green-400 shadow-green-900/10' : 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700 hover:shadow-blue-500/20'}`}
          >
            {isLoggedIn || apiKeys[aiProvider] ? <ShieldCheck size={14}/> : <User size={14}/>}
            {aiProvider === 'gemini' ? (isLoggedIn ? 'Verified' : 'Connect') : (apiKeys[aiProvider] ? 'Secured' : 'Auth Required')}
          </button>
        </div>
      </header>

      {/* Main Ribbon Toolbar */}
      <div className="bg-[#101010] border-b border-zinc-800/30 px-6 py-3 flex gap-2 h-[155px] shrink-0 z-40 shadow-xl items-stretch overflow-x-auto custom-scrollbar">
        <RibbonGroup label="Flow">
          <div className="grid grid-cols-2 gap-2 p-1">
            <IconButton icon={<Undo2 size={20}/>} onClick={undo} disabled={historyIndex <= 0} tooltip="Undo Action" />
            <IconButton icon={<Redo2 size={20}/>} onClick={redo} disabled={historyIndex >= history.length - 1} tooltip="Redo Action" />
            <IconButton icon={<Trash2 size={20}/>} onClick={() => canvasRef.current?.clear()} tooltip="Wipe Canvas" />
            <IconButton icon={<Layout size={20}/>} onClick={() => setShowChat(!showChat)} tooltip="Toggle AI Intelligence" />
          </div>
        </RibbonGroup>

        <RibbonGroup label="Canvas">
          <div className="grid grid-cols-2 gap-2 p-1">
            <ToolIcon active={tool === 'select'} icon={<Move size={20}/>} onClick={() => setTool('select')} tooltip="Selection Box" />
            <IconButton icon={<Crop size={20}/>} onClick={() => canvasRef.current?.crop()} tooltip="Crop to Selection" />
            <IconButton icon={<RotateCcw size={20}/>} onClick={() => canvasRef.current?.rotate(-90)} tooltip="Rotate Left" />
            <IconButton icon={<FlipHorizontal size={20}/>} onClick={() => canvasRef.current?.flip(true)} tooltip="Mirror" />
          </div>
        </RibbonGroup>

        <RibbonGroup label="Precision">
          <div className="grid grid-cols-3 gap-2 p-1">
            <ToolIcon active={tool === 'pencil'} icon={<Minus size={20} className="rotate-45" />} onClick={() => setTool('pencil')} tooltip="Pencil Tool" />
            <ToolIcon active={tool === 'fill'} icon={<PaintBucket size={20} />} onClick={() => setTool('fill')} tooltip="Smart Fill" />
            <ToolIcon active={tool === 'text'} icon={<Type size={20} />} onClick={() => setTool('text')} tooltip="Type Engine" />
            <ToolIcon active={tool === 'eraser'} icon={<Eraser size={20} />} onClick={() => setTool('eraser')} tooltip="Eraser" />
            <ToolIcon active={tool === 'picker'} icon={<Pipette size={20} />} onClick={() => setTool('picker')} tooltip="Eye Dropper" />
            <ToolIcon active={tool === 'zoom'} icon={<Search size={20} />} onClick={() => setTool('zoom')} tooltip="Magnify Tool" />
          </div>
        </RibbonGroup>

        <RibbonGroup label="Engine Stroke">
          <div className="flex flex-col gap-2 p-1 min-w-[150px]">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-zinc-800/80 rounded-xl border border-zinc-700/50 shadow-inner group-hover:border-blue-500/30 transition-colors">
                <Brush size={24} className="text-blue-500" />
              </div>
              <div className="flex flex-col flex-1 gap-1.5">
                <div className="flex justify-between text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                  <span>Stroke Mass</span>
                  <span className="text-blue-500">{brushSize}px</span>
                </div>
                <input type="range" min="1" max="100" value={brushSize} onChange={(e)=>setBrushSize(Number(e.target.value))} className="w-full accent-blue-600 h-1 rounded-full cursor-pointer bg-zinc-800" />
              </div>
            </div>
            <div className="flex gap-2">
               <select 
                className="flex-1 bg-zinc-800/50 text-[10px] rounded-lg p-2.5 outline-none border border-zinc-700/50 font-black uppercase text-zinc-400 cursor-pointer hover:bg-zinc-800 hover:text-white transition-all" 
                value={brushType} 
                onChange={(e)=>setBrushType(e.target.value as BrushType)}
              >
                <option value="normal">Ink Master</option>
                <option value="watercolor">Fluid Color</option>
                <option value="oil">Heavy Impasto</option>
                <option value="crayon">Wax Texture</option>
                <option value="marker">Graphic Marker</option>
                <option value="sketch">Soft Graphite</option>
              </select>
              <button 
                onClick={() => setShowBrushSettings(!showBrushSettings)} 
                className={`p-2.5 rounded-lg border transition-all ${showBrushSettings ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'}`}
              >
                <SlidersHorizontal size={16}/>
              </button>
            </div>
          </div>
        </RibbonGroup>

        <RibbonGroup label="Primitives">
          <div className="grid grid-cols-4 gap-2 p-1 w-40 overflow-y-auto custom-scrollbar-thin bg-zinc-900/30 rounded-xl border border-zinc-800/30">
            <ToolIcon active={tool === 'line'} icon={<Minus size={16}/>} onClick={()=>setTool('line')} />
            <ToolIcon active={tool === 'rectangle'} icon={<Square size={16}/>} onClick={()=>setTool('rectangle')} />
            <ToolIcon active={tool === 'rounded-rect'} icon={<Frame size={16}/>} onClick={()=>setTool('rounded-rect')} />
            <ToolIcon active={tool === 'circle'} icon={<CircleIcon size={16}/>} onClick={()=>setTool('circle')} />
            <ToolIcon active={tool === 'triangle'} icon={<Triangle size={16}/>} onClick={()=>setTool('triangle')} />
            <ToolIcon active={tool === 'star'} icon={<Star size={16}/>} onClick={()=>setTool('star')} />
            <ToolIcon active={tool === 'hexagon'} icon={<Hexagon size={16}/>} onClick={()=>setTool('hexagon')} />
            <ToolIcon active={tool === 'polygon'} icon={<Plus size={16}/>} onClick={()=>setTool('polygon')} />
          </div>
        </RibbonGroup>

        <RibbonGroup label="Neural Lab">
          <div className="flex flex-col gap-2 p-1">
            <div className="flex gap-2.5">
              <button onClick={() => runUniversalAI('generate')} className="group relative p-3.5 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-2xl text-white shadow-[0_4px_20px_rgba(124,58,237,0.3)] hover:scale-105 active:scale-95 transition-all" title="AI Asset Creation">
                <ImageIcon size={22}/>
                <div className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                </div>
              </button>
              <button onClick={() => runUniversalAI('edit')} className="p-3.5 bg-gradient-to-tr from-blue-600 to-emerald-600 rounded-2xl text-white shadow-[0_4px_20px_rgba(5,150,105,0.3)] hover:scale-105 active:scale-95 transition-all" title="Neural Canvas Edit"><BrainCircuit size={22}/></button>
              <button onClick={aiAnimate} className="p-3.5 bg-gradient-to-tr from-indigo-600 to-fuchsia-600 rounded-2xl text-white shadow-[0_4px_20px_rgba(192,38,211,0.3)] hover:scale-105 active:scale-95 transition-all" title="Veo Motion Synthesis"><Video size={22}/></button>
            </div>
            <button onClick={aiAnalyze} className="group w-full py-2 bg-[#1a1a1a] border border-zinc-700 hover:border-blue-500/50 hover:bg-zinc-800 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 transition-all">
              <Sparkles size={14} className="text-blue-500 group-hover:animate-pulse" /> Multimodal Analysis
            </button>
          </div>
        </RibbonGroup>

        <RibbonGroup label="Spectral Palette">
          <div className="flex gap-5 items-center h-full px-5 bg-[#141414] rounded-2xl border border-zinc-800/50 shadow-inner">
            <div className="flex flex-col gap-2 items-center">
              <div 
                className={`w-14 h-14 border-2 rounded-2xl cursor-pointer shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center transition-all relative group/color ${activeColorSlot === 1 ? 'border-blue-500 scale-110 ring-4 ring-blue-500/10' : 'border-zinc-800 opacity-40 hover:opacity-100 hover:scale-105'}`}
                style={{backgroundColor: color1}} onClick={()=>setActiveColorSlot(1)}
              >
                <span className="text-[8px] font-black mix-blend-difference text-white opacity-50">C1</span>
              </div>
              <div 
                className={`w-11 h-11 border-2 rounded-xl cursor-pointer shadow-xl flex flex-col items-center justify-center transition-all relative ${activeColorSlot === 2 ? 'border-blue-500 scale-110 ring-4 ring-blue-500/10' : 'border-zinc-800 opacity-20 hover:opacity-60 hover:scale-105'}`}
                style={{backgroundColor: color2}} onClick={()=>setActiveColorSlot(2)}
              >
                <span className="text-[7px] font-black mix-blend-difference text-white opacity-40">C2</span>
              </div>
            </div>
            <div className="grid grid-cols-10 gap-1.5 w-[180px]">
              {COLORS.map(c => (
                <button 
                  key={c} 
                  className="w-4 h-4 rounded-[4px] border border-black/50 hover:scale-150 transition-transform shadow-sm relative z-10" 
                  style={{backgroundColor: c}} 
                  onClick={()=>{if(activeColorSlot===1) setColor1(c); else setColor2(c);}} 
                />
              ))}
            </div>
            <div className="h-full py-4 border-l border-zinc-800/50 pl-5 flex flex-col justify-center gap-2">
              <button onClick={()=>setShowColorMaker(!showColorMaker)} className="flex flex-col items-center gap-2 group/btn active:scale-95 transition-all">
                <div className="w-10 h-10 rounded-full border-2 border-zinc-700/50 bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)] shadow-2xl group-hover/btn:rotate-180 transition-transform duration-1000" />
                <span className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter group-hover/btn:text-blue-400">Spectrum</span>
              </button>
            </div>
          </div>
        </RibbonGroup>
      </div>

      <main className="flex-1 flex bg-[#060606] relative overflow-hidden">
        {/* Layer Manager Panel */}
        <aside className="w-64 bg-[#0d0d0d] border-r border-zinc-800/50 flex flex-col shrink-0 shadow-2xl z-30">
          <div className="p-5 border-b border-zinc-800/50 flex justify-between items-center bg-[#111111]/80 backdrop-blur-md">
            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] flex items-center gap-3">
              <Layers size={16} className="text-blue-500"/> Scene Graph
            </span>
            <button className="p-2 hover:bg-zinc-800 rounded-xl text-blue-500 transition-all hover:scale-110 active:scale-90 shadow-md">
              <Plus size={18}/>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {layers.map(l => (
              <div key={l.id} onClick={()=>setActiveLayerId(l.id)} className={`group p-3 rounded-2xl border transition-all cursor-pointer ${activeLayerId === l.id ? 'bg-blue-600/10 border-blue-500/40 shadow-xl shadow-blue-500/5' : 'bg-zinc-900/30 border-transparent hover:border-zinc-800 hover:bg-zinc-900/50'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center font-black text-[10px] text-zinc-600 group-hover:text-blue-500 transition-colors">
                    L-{l.id}
                  </div>
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <span className="text-[12px] font-bold text-zinc-200 group-hover:text-white truncate">{l.name}</span>
                    <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tight">Active Object</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                    <Eye size={16} className="text-zinc-400 hover:text-blue-500" />
                    <MoreHorizontal size={16} className="text-zinc-600" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-5 border-t border-zinc-800/50 bg-[#111111]">
            <button className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:text-white">
              <History size={16} className="text-blue-500" /> Session History
            </button>
          </div>
        </aside>

        {/* Creative Viewport */}
        <div className="flex-1 overflow-auto p-24 flex items-start justify-center bg-[radial-gradient(#151515_1px,transparent_1px)] [background-size:32px_32px] relative custom-scrollbar">
          {isAILoading && (
            <div className="absolute inset-0 z-[150] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
              <div className="relative mb-10">
                <div className="w-32 h-32 border-2 border-blue-500/5 rounded-full" />
                <div className="absolute top-0 w-32 h-32 border-t-2 border-blue-500 rounded-full animate-spin shadow-[0_0_40px_rgba(59,130,246,0.2)]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Bot size={40} className="text-blue-500 animate-pulse" />
                </div>
              </div>
              <h2 className="text-3xl font-black text-white tracking-[0.4em] uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">Gemini Synthesis</h2>
              <p className="text-[11px] font-black text-blue-400/60 uppercase mt-4 tracking-[0.3em] animate-pulse">Calculating Multi-layered Neurons...</p>
            </div>
          )}
          
          <div className="relative group/canvas">
            <Canvas 
              ref={canvasRef} tool={tool} brushType={brushType} color={color1} color2={color2} brushSize={brushSize} zoom={zoom} 
              brushSettings={brushSettings} onStateChange={handleStateChange} onColorPick={(hex)=>activeColorSlot===1?setColor1(hex):setColor2(hex)} 
              onZoomChange={setZoom} onMouseMove={setCursorPos}
            />
            {/* Quick Canvas Overlay Info */}
            <div className="absolute -top-10 left-0 text-[10px] font-black text-zinc-600 uppercase tracking-widest opacity-0 group-hover/canvas:opacity-100 transition-opacity">
              Viewport Stage • Ready
            </div>
          </div>
          
          {/* Dynamic Floating Panel: Engine Configuration */}
          {showBrushSettings && (
            <div className="absolute top-12 right-12 w-80 bg-[#161616]/95 border border-zinc-700/50 shadow-[0_30px_60px_rgba(0,0,0,0.8)] rounded-3xl p-8 z-[120] animate-in slide-in-from-right-8 fade-in duration-300 backdrop-blur-2xl">
               <div className="flex justify-between items-center mb-8">
                 <div className="flex flex-col">
                   <span className="text-[11px] font-black uppercase text-white tracking-[0.1em]">Engine Config</span>
                   <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-tighter">Physics & Flow</span>
                 </div>
                 <button onClick={()=>setShowBrushSettings(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors"><X size={20}/></button>
               </div>
               <div className="space-y-8">
                 {Object.entries(brushSettings).map(([key, val]) => (
                   <div key={key} className="space-y-3">
                     <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                       <span className="text-zinc-500">{key}</span>
                       <span className="text-blue-400">{Math.round((val as number) * 100)}%</span>
                     </div>
                     <input type="range" min="0" max="1" step="0.01" value={val as number} onChange={(e)=>setBrushSettings({...brushSettings, [key]: Number(e.target.value)})} className="w-full accent-blue-600 h-1.5 bg-zinc-800/50 rounded-full cursor-pointer" />
                   </div>
                 ))}
               </div>
               <div className="mt-10 pt-6 border-t border-zinc-800/50 flex justify-between items-center">
                 <span className="text-[9px] font-black text-zinc-700 uppercase">Aint Engine v2.5</span>
                 <button onClick={() => setBrushSettings({ hardness: 0.8, spacing: 0.2, jitter: 0 })} className="text-[9px] font-black uppercase text-blue-500 hover:text-blue-400 transition-colors">Reset Defaults</button>
               </div>
            </div>
          )}

          {/* Dynamic Floating Panel: Spectral Mixer */}
          {showColorMaker && (
            <div className="absolute bottom-12 left-12 w-72 bg-[#161616]/95 border border-zinc-700/50 shadow-[0_30px_60px_rgba(0,0,0,0.8)] rounded-3xl p-8 z-[120] animate-in slide-in-from-left-8 fade-in duration-300 backdrop-blur-2xl">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[11px] font-black uppercase text-white tracking-widest">Spectral Mixer</span>
                  <button onClick={()=>setShowColorMaker(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors"><X size={20}/></button>
                </div>
                <div className="space-y-6">
                  {['r','g','b'].map(ch => (
                    <div key={ch} className="flex flex-col gap-3">
                      <div className="flex justify-between text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                        <span>{ch === 'r' ? 'Infrared' : ch === 'g' ? 'Visible' : 'Ultraviolet'}</span>
                        <span className="text-blue-400">{(customRGB as any)[ch]}</span>
                      </div>
                      <input type="range" min="0" max="255" value={(customRGB as any)[ch]} onChange={(e)=>updateRGB(ch as any, Number(e.target.value))} className="w-full accent-blue-600 h-1.5 bg-zinc-800/50 rounded-full cursor-pointer" />
                    </div>
                  ))}
                  <div className="pt-4 flex items-center gap-5">
                    <div className="flex-1 h-14 rounded-2xl border-2 border-zinc-800 shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)] transition-all duration-300 scale-100 hover:scale-105" style={{backgroundColor: activeColorSlot === 1 ? color1 : color2}} />
                    <button onClick={()=>setShowColorMaker(false)} className="bg-blue-600 hover:bg-blue-700 px-6 py-3.5 rounded-2xl text-[11px] font-black uppercase shadow-lg shadow-blue-600/20 active:scale-90 transition-all text-white">Commit</button>
                  </div>
                </div>
            </div>
          )}
        </div>

        {/* Neural AI Sidebar */}
        {showChat && (
          <aside className="w-[420px] bg-[#0d0d0d] border-l border-zinc-800/50 flex flex-col shrink-0 animate-in slide-in-from-right-12 duration-500 shadow-[0_0_60px_rgba(0,0,0,0.5)] z-[100] backdrop-blur-md">
            <div className="p-6 border-b border-zinc-800/50 flex justify-between items-center bg-[#111111]/80 backdrop-blur-lg">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-600 blur-lg opacity-30 animate-pulse"></div>
                  <div className="relative p-2.5 bg-blue-600 rounded-2xl shadow-xl shadow-blue-900/20"><Bot size={24} className="text-white" /></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-black uppercase tracking-[0.2em] text-zinc-100">Neural Assistant</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                    <span className="text-[10px] font-bold text-blue-500 uppercase italic tracking-tighter">Brain Sync Active</span>
                  </div>
                </div>
              </div>
              <button onClick={()=>setShowChat(false)} className="hover:bg-zinc-800 p-2.5 rounded-2xl text-zinc-500 hover:text-white transition-all active:scale-90"><X size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#080808]">
              {chatHistory.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center px-12 opacity-30 select-none">
                  <div className="p-8 bg-zinc-900/50 rounded-full mb-6 border border-zinc-800/50">
                    <MessageSquare size={56} className="text-zinc-600" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-[0.3em] mb-3 text-white">Creative Dialog</h3>
                  <p className="text-[11px] font-medium leading-relaxed">Ask Gemini to critique your composition, suggest color theory palettes, or explain artistic movements.</p>
                </div>
              )}
              {chatHistory.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                  <div className={`max-w-[92%] p-5 rounded-[24px] text-[13px] leading-relaxed shadow-2xl ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none shadow-blue-900/10' : 'bg-[#181818] text-zinc-100 rounded-bl-none border border-zinc-800/50'}`}>
                    {m.text}
                  </div>
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 px-1">
                      {m.sources.map((s, idx) => (
                        <a key={idx} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black uppercase bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-md text-blue-400 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1">
                          <ExternalLink size={10} /> {s.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="p-6 border-t border-zinc-800/50 bg-[#111111]/80 backdrop-blur-md">
              <div className="flex gap-3 p-2.5 bg-[#080808] border border-zinc-800 rounded-3xl focus-within:border-blue-500/50 transition-all shadow-inner relative group">
                <input 
                  type="text" 
                  value={chatInput} 
                  onChange={(e)=>setChatInput(e.target.value)} 
                  onKeyDown={(e)=>e.key === 'Enter' && sendChatMessage()} 
                  placeholder="Ask for creative guidance..." 
                  className="flex-1 bg-transparent px-5 py-3 text-xs outline-none text-zinc-100 placeholder-zinc-700" 
                />
                <button 
                  onClick={sendChatMessage} 
                  className="bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-2xl shadow-xl shadow-blue-600/10 active:scale-90 transition-all"
                >
                  <Send size={20}/>
                </button>
              </div>
            </div>
          </aside>
        )}
      </main>

      {/* AI Access Hub Modal */}
      {showAIKeysModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-6 animate-in fade-in duration-500">
          <div className="bg-[#111111] border border-zinc-800 shadow-[0_0_150px_rgba(0,0,0,1)] max-w-2xl w-full p-12 rounded-[40px] transform transition-all animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-10">
              <div className="flex flex-col">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                  <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-900/30"><Key size={32}/></div>
                  Neural Access Hub
                </h2>
                <p className="text-[11px] text-zinc-500 font-bold uppercase mt-3 tracking-[0.2em] italic">Encrypted Persistence Stage • Session 01</p>
              </div>
              <button onClick={()=>setShowAIKeysModal(false)} className="text-zinc-700 hover:text-red-500 transition-all p-3 hover:rotate-90"><X size={36}/></button>
            </div>
            
            <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-6 custom-scrollbar">
              {PROVIDERS.filter(p => p.id !== 'gemini').map(p => (
                <div key={p.id} className="bg-[#161616] border border-zinc-800/50 p-6 rounded-3xl hover:border-blue-500/30 transition-all group focus-within:ring-4 ring-blue-500/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-black rounded-xl group-hover:text-blue-400 transition-colors shadow-inner">{p.icon}</div>
                      <label className="text-[12px] font-black text-zinc-300 uppercase tracking-[0.1em]">{p.label}</label>
                    </div>
                    {apiKeys[p.id] && (
                      <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-[9px] font-black text-green-400 uppercase">Secured</span>
                      </div>
                    )}
                  </div>
                  <input 
                    type="password" 
                    value={apiKeys[p.id] || ''} 
                    onChange={(e) => updateApiKey(p.id, e.target.value)} 
                    className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:border-blue-500 outline-none font-mono text-zinc-300 placeholder-zinc-800 transition-all shadow-inner" 
                    placeholder={`Paste Secret Token for ${p.label}...`}
                  />
                </div>
              ))}
            </div>
            
            <div className="mt-12 flex gap-5">
               <button 
                onClick={()=>saveKeys(apiKeys)} 
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-6 rounded-3xl text-sm uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/30 active:scale-95 transition-all flex items-center justify-center gap-4 group"
              >
                <Save size={20} className="group-hover:rotate-12 transition-transform" /> Commit to Storage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal / Properties */}
      {showInfo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6 animate-in fade-in duration-300">
          <div className="bg-[#121212] border border-zinc-800 rounded-[32px] max-w-md w-full p-10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-xl font-black text-white tracking-[0.1em] uppercase flex items-center gap-3"><Info size={24} className="text-blue-500"/> Project Manifest</h2>
              <button onClick={()=>setShowInfo(false)}><X size={24}/></button>
            </div>
            <div className="space-y-6 text-sm">
               <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                 <span className="text-zinc-500 font-bold uppercase text-[10px]">Dimensions</span>
                 <span className="text-white font-black">1200 × 800 PX</span>
               </div>
               <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                 <span className="text-zinc-500 font-bold uppercase text-[10px]">History Stack</span>
                 <span className="text-white font-black">{history.length} Snapshots</span>
               </div>
               <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                 <span className="text-zinc-500 font-bold uppercase text-[10px]">Active Layers</span>
                 <span className="text-white font-black">{layers.length}</span>
               </div>
               <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                 <span className="text-zinc-500 font-bold uppercase text-[10px]">Format Support</span>
                 <div className="flex gap-2 text-[9px] font-black uppercase text-blue-500">
                   <span className="bg-blue-600/10 px-2 py-1 rounded">PNG</span>
                   <span className="bg-blue-600/10 px-2 py-1 rounded">JPG</span>
                   <span className="bg-blue-600/10 px-2 py-1 rounded">WEBP</span>
                 </div>
               </div>
            </div>
            <button onClick={()=>setShowInfo(false)} className="mt-12 w-full bg-zinc-800 hover:bg-zinc-700 py-5 rounded-2xl font-black uppercase tracking-widest transition-all">Dismiss Manifest</button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6 animate-in fade-in duration-300">
          <div className="bg-[#121212] border border-zinc-800 rounded-[40px] max-w-2xl w-full p-12 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-black text-white tracking-widest uppercase flex items-center gap-4"><Keyboard className="text-blue-500" size={32}/> Power Directives</h2>
              <button onClick={()=>setShowHelp(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors"><X size={28}/></button>
            </div>
            <div className="grid grid-cols-2 gap-12 text-sm">
              <section className="space-y-6">
                <h3 className="font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2"><Sparkles size={16}/> AI Workflow</h3>
                <ul className="space-y-4">
                  <li className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800/50 leading-relaxed text-zinc-400"><strong>Neural Generation:</strong> Trigger DALL-E 3 or Gemini 3 Pro with deep contextual prompts.</li>
                  <li className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800/50 leading-relaxed text-zinc-400"><strong>Vision Sync:</strong> Shift-click to analyze canvas region using Gemini Vision.</li>
                </ul>
              </section>
              <section className="space-y-6">
                <h3 className="font-black text-white uppercase tracking-[0.2em]">Hotkeys</h3>
                <div className="space-y-3 font-bold text-zinc-500 uppercase text-[11px]">
                  <div className="flex justify-between border-b border-zinc-800/50 pb-3"><span>Undo Redo</span> <span className="text-blue-500 font-mono">Ctrl+Z / Y</span></div>
                  <div className="flex justify-between border-b border-zinc-800/50 pb-3"><span>Precision Zoom</span> <span className="text-blue-500 font-mono">Mouse Scroll</span></div>
                  <div className="flex justify-between border-b border-zinc-800/50 pb-3"><span>Toggle Assistant</span> <span className="text-blue-500 font-mono">Ctrl+H</span></div>
                  <div className="flex justify-between border-b border-zinc-800/50 pb-3"><span>Quick Pick</span> <span className="text-blue-500 font-mono">Alt + Click</span></div>
                </div>
              </section>
            </div>
            <button onClick={()=>setShowHelp(false)} className="mt-12 w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 transition-all active:scale-95 text-white">Enter Workspace</button>
          </div>
        </div>
      )}

      {/* Footer Branding & Status */}
      <footer className="h-9 bg-[#0c0c0c] border-t border-zinc-800/50 flex items-center px-6 justify-between text-[10px] text-zinc-600 font-black tracking-widest uppercase z-[110]">
        <div className="flex items-center h-full gap-8">
          <div className="flex items-center gap-3 px-4 py-1.5 bg-black/40 rounded-full border border-zinc-800/50 shadow-inner">
            <MousePointer2 size={14} className="text-blue-500 animate-pulse"/> 
            <span className="text-zinc-400 font-mono">{cursorPos.x}, {cursorPos.y} PX</span>
          </div>
          <div className="flex items-center gap-2 opacity-40">
            <Monitor size={14}/> <span>1200 × 800 ARTBOARD</span>
          </div>
        </div>
        <div className="flex items-center gap-8 h-full">
          <div className="flex items-center gap-3">
             <Bot size={14} className="text-blue-500" />
             <span className="text-zinc-400">{aiProvider} ENGINE ACTIVE</span>
          </div>
          <div className="flex items-center gap-4 border-l border-zinc-800/50 pl-8 h-1/2">
            <div className="flex items-center gap-2">
              <ZoomIn size={14} className="text-zinc-700" />
              <span className="w-12 text-center text-zinc-400 font-mono">{Math.round(zoom * 100)}%</span>
            </div>
            <input 
              type="range" min="0.1" max="5" step="0.1" value={zoom} 
              onChange={(e)=>setZoom(Number(e.target.value))} 
              className="w-28 accent-blue-600 h-1 bg-zinc-800 rounded-full cursor-pointer" 
            />
          </div>
        </div>
      </footer>
    </div>
  );
};

const RibbonGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col items-center px-5 border-r border-zinc-800/30 last:border-0 min-w-[140px] group/ribbon">
    <div className="flex-1 flex items-center justify-center gap-2.5 h-full bg-[#181818]/40 rounded-3xl p-3 group-hover/ribbon:bg-[#181818]/80 transition-all duration-300 shadow-inner group-hover/ribbon:shadow-[0_4px_15px_rgba(0,0,0,0.3)]">{children}</div>
    <span className="text-[10px] uppercase font-black text-zinc-700 mt-2.5 tracking-[0.25em] group-hover/ribbon:text-zinc-400 transition-colors">{label}</span>
  </div>
);

const IconButton: React.FC<{ icon: React.ReactNode; onClick: () => void; disabled?: boolean; tooltip?: string }> = ({ icon, onClick, disabled, tooltip }) => (
  <button onClick={onClick} disabled={disabled} title={tooltip} className="p-3 bg-zinc-800/50 hover:bg-zinc-700 active:bg-zinc-600 rounded-2xl disabled:opacity-20 transition-all text-zinc-400 hover:text-white border border-transparent hover:border-zinc-600 shadow-sm hover:shadow-lg focus:outline-none">
    <span className="active:scale-90 transition-transform flex items-center justify-center">{icon}</span>
  </button>
);

const ToolIcon: React.FC<{ active: boolean; icon: React.ReactNode; onClick: () => void; tooltip?: string }> = ({ active, icon, onClick, tooltip }) => (
  <button onClick={onClick} title={tooltip} className={`p-3 rounded-2xl transition-all border shadow-lg flex items-center justify-center group ${active ? 'bg-blue-600 border-blue-400 text-white shadow-[0_4px_15px_rgba(37,99,235,0.3)] ring-4 ring-blue-500/10' : 'bg-zinc-800/50 hover:bg-zinc-700 border-transparent text-zinc-500 hover:text-zinc-300'}`}>
    <span className="active:scale-90 transition-transform">{icon}</span>
  </button>
);

export default App;
