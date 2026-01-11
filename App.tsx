
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Bus, MapPin, Search, Bot, Info, ChevronRight, Menu, X, ArrowRightLeft, Sparkles, Send, Map as MapIcon, Zap, ExternalLink, RefreshCcw, Globe, ShieldCheck, Flag, Navigation, Filter, Repeat, Clock, Locate, ChevronDown, ChevronUp, CircleDot, Building2, Star, Languages, History, ArrowLeft, Wallet, Timer, Calendar, User, MessageSquare, Clock3 } from 'lucide-react';
import { ViewState, BusLine, BusStop, Language } from './types';
import { BUS_LINES, BUS_STOPS } from './data/busData';
import { askYBSAssistant } from './services/geminiService';

const news = [
  { id: 'n1', time: '10:30 AM', title: 'YBS 12 လမ်းကြောင်းအခြေအနေ ကောင်းမွန်ပါသည်။' },
  { id: 'n2', time: '10:00 AM', title: 'လှည်းတန်းတွင် ယာဉ်ကြောအနည်းငယ် ပိတ်ဆို့မှုရှိပါသည်။' },
  { id: 'n3', time: '09:15 AM', title: 'လေဆိပ်အထူးလိုင်းများ (Airport Shuttle) ပုံမှန်ပြေးဆွဲနေပါသည်။' }
];

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const cleanText = (text: string) => {
  return text
    .replace(/\*\*/g, '') 
    .replace(/#/g, '')   
    .replace(/^\s*[\*•-]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewState>('home');
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('ybs-lang') as Language) || 'mm');
  const [favorites, setFavorites] = useState<string[]>(() => JSON.parse(localStorage.getItem('ybs-favs') || '[]'));

  const [fromStop, setFromStop] = useState('');
  const [toStop, setToStop] = useState('');
  const [smartQuery, setSmartQuery] = useState('');
  const [smartResult, setSmartResult] = useState<{text: string, sources: any[]} | null>(null);
  const [isSmartLoading, setIsSmartLoading] = useState(false);

  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [lineSearchQuery, setLineSearchQuery] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'bot', text: string, time: string, sources?: any[]}[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const nearbyStops = useMemo(() => {
    if (!userLocation) return [];
    return BUS_STOPS.map(stop => ({
      ...stop,
      distance: stop.coordinates 
        ? getDistance(userLocation.lat, userLocation.lng, stop.coordinates.lat, stop.coordinates.lng) 
        : Infinity
    })).sort((a, b) => (a.distance || 0) - (b.distance || 0)).slice(0, 10);
  }, [userLocation]);

  const t = {
    home: lang === 'mm' ? 'ပင်မစနစ်' : 'Smart Hub',
    routes: lang === 'mm' ? 'လမ်းကြောင်းများ' : 'Bus Lines',
    nearby: lang === 'mm' ? 'အနီးရှိ' : 'Nearby',
    ai: lang === 'mm' ? 'AI အကူအညီ' : 'AI Assistant',
    searchPlaceholder: lang === 'mm' ? 'သွားမည့်နေရာ ရှာဖွေပါ...' : 'Search destination...',
    routeSearchPlaceholder: lang === 'mm' ? 'လိုင်းနံပါတ် သို့မဟုတ် လမ်းကြောင်းရှာရန်...' : 'Search line or route...',
    aiRouteBtn: lang === 'mm' ? 'လမ်းကြောင်းထုတ်ယူပါ' : 'Get Route Plan',
    liveTitle: lang === 'mm' ? 'ရန်ကုန်မြို့၏ တိုက်ရိုက်' : 'Yangon Live',
    liveSubtitle: lang === 'mm' ? 'လမ်းကြောင်းပြစနစ်။' : 'Transit Engine.',
    favTitle: lang === 'mm' ? 'စိတ်ကြိုက်လိုင်းများ' : 'Your Favorites',
    recentNews: lang === 'mm' ? 'နောက်ဆုံးရသတင်း' : 'Live Updates',
    transfers: lang === 'mm' ? 'အခြားလိုင်းသို့ ပြောင်းရန်' : 'Transfers',
    stops: lang === 'mm' ? 'မှတ်တိုင်များ' : 'Stops',
    fare: lang === 'mm' ? 'ယာဉ်စီးခ' : 'Fare',
    hours: lang === 'mm' ? 'ပြေးဆွဲချိန်' : 'Hours',
    frequency: lang === 'mm' ? 'အချိန်ကြားကွာ' : 'Frequency',
    back: lang === 'mm' ? 'နောက်သို့' : 'Back',
    sources: lang === 'mm' ? 'အချက်အလက် အရင်းအမြစ်များ' : 'Sources',
    aiDisclaimer: lang === 'mm' ? 'AI သည် အမှားအယွင်းရှိနိုင်ပါသည်။ လမ်းကြောင်းများကို ပြန်လည်စစ်ဆေးပါ။' : 'AI may make mistakes. Verify important routes.'
  };

  useEffect(() => { localStorage.setItem('ybs-lang', lang); }, [lang]);
  useEffect(() => { localStorage.setItem('ybs-favs', JSON.stringify(favorites)); }, [favorites]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAiLoading]);

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const locateUser = () => {
    setIsLocating(true);
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported.");
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setIsLocating(false); },
      () => { setLocationError("Unable to retrieve location."); setIsLocating(false); }
    );
  };

  useEffect(() => { if (activeView === 'nearby' && !userLocation) locateUser(); }, [activeView]);

  const filteredLines = useMemo(() => {
    const sorted = [...BUS_LINES].sort((a, b) => {
      const aFav = favorites.includes(a.id);
      const bFav = favorites.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });

    const query = lineSearchQuery.toLowerCase().trim();
    if (!query) return sorted;

    return sorted.filter(line => 
      line.number.toLowerCase().includes(query) ||
      line.startPoint.toLowerCase().includes(query) ||
      line.endPoint.toLowerCase().includes(query)
    );
  }, [lineSearchQuery, favorites]);

  const selectedBus = useMemo(() => BUS_LINES.find(l => l.id === selectedBusId), [selectedBusId]);

  const handleSmartSearch = async (e?: React.FormEvent, directQuery?: string) => {
    if (e) e.preventDefault();
    const queryToUse = directQuery || smartQuery;
    if (!queryToUse.trim()) return;
    
    setIsSmartLoading(true);
    setSmartResult(null);
    const response = await askYBSAssistant(queryToUse);
    setSmartResult({
      text: cleanText(response.text),
      sources: response.sources
    });
    setIsSmartLoading(false);
  };

  const handleAiAsk = async () => {
    if (!aiMessage.trim()) return;
    const userText = aiMessage;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setChatHistory(prev => [...prev, { role: 'user', text: userText, time: now }]);
    setAiMessage('');
    setIsAiLoading(true);
    
    const response = await askYBSAssistant(userText);
    const botNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setChatHistory(prev => [...prev, { 
      role: 'bot', 
      text: cleanText(response.text), 
      time: botNow,
      sources: response.sources 
    }]);
    setIsAiLoading(false);
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => { setActiveView(view); setIsSidebarOpen(false); setSelectedBusId(null); }}
      className={`flex items-center space-x-3 w-full p-4 rounded-2xl transition-all duration-300 ${
        activeView === view 
          ? 'bg-yellow-400 text-slate-900 shadow-xl shadow-yellow-200/50 scale-[1.02]' 
          : 'hover:bg-slate-100 text-slate-500'
      }`}
    >
      <Icon size={20} className={activeView === view ? 'animate-pulse' : ''} />
      <span className="font-bold tracking-tight">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900 font-['Inter']">
      <div className="md:hidden flex items-center justify-between p-5 bg-white/90 backdrop-blur-md border-b sticky top-0 z-50 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-slate-900 p-2 rounded-xl">
            <Bus size={22} className="text-yellow-400" />
          </div>
          <h1 className="text-xl font-black italic tracking-tighter">YBS<span className="text-yellow-500">.</span>Wayfinder</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-slate-100 rounded-xl">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-80 bg-white border-r transform transition-transform duration-500 ease-out ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-10 hidden md:block">
          <div className="flex items-center space-x-3 mb-12">
            <div className="bg-slate-900 p-3.5 rounded-[1.25rem] shadow-2xl shadow-slate-200">
              <Bus size={32} className="text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter italic leading-none">YBS<span className="text-yellow-500">.</span>2026</h1>
              <div className="flex items-center space-x-1 mt-1.5">
                <ShieldCheck size={10} className="text-green-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{lang === 'mm' ? '၂၀၂၆ စနစ်' : '2026 Engine'}</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="px-6 space-y-3">
          <NavItem view="home" icon={Zap} label={t.home} />
          <NavItem view="bus-list" icon={MapIcon} label={t.routes} />
          <NavItem view="nearby" icon={MapPin} label={t.nearby} />
          <NavItem view="ai-assistant" icon={Bot} label={t.ai} />
        </nav>

        <div className="absolute bottom-8 left-0 w-full px-6 space-y-4">
          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl">
            <button onClick={() => setLang('mm')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${lang === 'mm' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>မြန်မာ</button>
            <button onClick={() => setLang('en')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${lang === 'en' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>EN</button>
          </div>
          <div className="p-6 bg-slate-900 rounded-[2.5rem] shadow-2xl relative overflow-hidden group border border-slate-800">
            <div className="relative z-10 space-y-3">
              <div className="flex items-center space-x-2">
                <Globe size={14} className="text-yellow-400" />
                <span className="text-[10px] font-black text-yellow-400 uppercase tracking-[0.2em]">Live Data</span>
              </div>
              <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">Ref: yangonbusroute.com</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 lg:p-14 pb-24 sm:pb-28 md:pb-14 space-y-8 sm:space-y-10 md:space-y-12">
        {activeView === 'bus-detail' && selectedBus && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
            <button 
              onClick={() => setActiveView('bus-list')}
              className="inline-flex items-center space-x-2 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>{t.back}</span>
            </button>

            <header className="bg-white p-6 sm:p-8 md:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] border border-slate-100 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-6 sm:p-10 opacity-5 -rotate-12">
                  <Bus size={120} className="sm:w-[180px] sm:h-[180px]" />
               </div>
               <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 sm:gap-8">
                  <div className="flex items-center space-x-4 sm:space-x-6 md:space-x-8">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center text-white text-2xl sm:text-3xl md:text-4xl font-black shadow-2xl" style={{ backgroundColor: selectedBus.color }}>
                      {selectedBus.number.replace('YBS ', '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter mb-2 break-words">{selectedBus.number}</h2>
                      <div className="flex flex-wrap gap-2">
                        {selectedBus.hasYPS && (
                          <span className="px-2 sm:px-3 py-1 bg-yellow-400 text-slate-900 text-[9px] sm:text-[10px] font-black uppercase rounded-full flex items-center space-x-1">
                            <Wallet size={8} className="sm:w-2.5 sm:h-2.5" />
                            <span>YPS Supported</span>
                          </span>
                        )}
                        <span className="px-2 sm:px-3 py-1 bg-slate-900 text-white text-[9px] sm:text-[10px] font-black uppercase rounded-full">၂၀၂၆ စနစ်</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={(e) => toggleFavorite(selectedBus.id, e)} className={`p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] transition-all shadow-lg touch-manipulation ${favorites.includes(selectedBus.id) ? 'bg-yellow-400 text-slate-900' : 'bg-slate-50 text-slate-200 hover:bg-slate-100'}`}>
                    <Star size={24} className="sm:w-8 sm:h-8" fill={favorites.includes(selectedBus.id) ? 'currentColor' : 'none'} />
                  </button>
               </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center space-x-4">
                  <div className="p-4 bg-green-50 text-green-600 rounded-2xl"><Wallet size={24} /></div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.fare}</div>
                    <div className="text-xl font-black">{selectedBus.fare || '၂၀၀-၄၀၀ MMK'}</div>
                  </div>
               </div>
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center space-x-4">
                  <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Timer size={24} /></div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.frequency}</div>
                    <div className="text-xl font-black">{selectedBus.frequency || '၁၀-၁၅ မိနစ်'}</div>
                  </div>
               </div>
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center space-x-4">
                  <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl"><Calendar size={24} /></div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.hours}</div>
                    <div className="text-xl font-black">{selectedBus.hours || '05:00 - 21:00'}</div>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
               <section className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8">
                  <div className="flex items-center space-x-2 text-sm font-black text-slate-900 uppercase tracking-widest">
                    <Navigation size={18} className="text-yellow-500" />
                    <span>{t.stops} ({selectedBus.route.length})</span>
                  </div>
                  <div className="relative pl-8 space-y-6">
                    <div className="absolute left-[9px] top-4 bottom-4 w-[4px] bg-slate-100 rounded-full"></div>
                    {selectedBus.route.map((stop, i) => {
                       const meta = BUS_STOPS.find(s => s.name === stop);
                       return (
                         <div key={i} className="relative flex items-center justify-between group">
                            <div className="flex items-center space-x-6">
                               <div className={`absolute left-[-2.05rem] w-6 h-6 flex items-center justify-center rounded-full bg-white border-2 z-10 ${i === 0 ? 'border-green-500' : i === selectedBus.route.length - 1 ? 'border-red-500' : 'border-slate-200'}`}>
                                  <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-green-500 animate-pulse' : i === selectedBus.route.length - 1 ? 'bg-red-500' : 'bg-slate-200'}`}></div>
                               </div>
                               <div>
                                  <div className="font-black text-slate-800 group-hover:text-yellow-600 transition-colors">{stop}</div>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase">{meta?.township || 'Yangon'}</div>
                               </div>
                            </div>
                            <div className="text-[10px] font-black text-slate-300">#{i + 1}</div>
                         </div>
                       );
                    })}
                  </div>
               </section>

               <section className="space-y-10">
                  <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white space-y-8">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center space-x-2 text-sm font-black uppercase tracking-widest">
                          <Zap size={18} className="text-yellow-400" />
                          <span>Live Board</span>
                       </div>
                       <span className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-full uppercase">Realtime Sim</span>
                    </div>
                    <div className="space-y-4">
                       {[
                         { time: '4m', id: '1A', status: 'On Track' },
                         { time: '12m', id: '1B', status: 'Delayed' },
                         { time: '21m', id: '1C', status: 'On Track' }
                       ].map((bus, i) => (
                         <div key={i} className="flex items-center justify-between p-6 bg-white/5 rounded-[2rem] border border-white/10">
                            <div className="flex items-center space-x-4">
                               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center font-black">{bus.id}</div>
                               <div>
                                  <div className="font-black">{bus.status}</div>
                                  <div className="text-[10px] text-white/40 uppercase font-bold">Updated Just Now</div>
                               </div>
                            </div>
                            <div className="text-right">
                               <div className="text-2xl font-black text-yellow-400">{bus.time}</div>
                               <div className="text-[10px] text-white/40 uppercase font-bold">Estimated</div>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-10 rounded-[3.5rem] border border-yellow-100/50 space-y-4">
                    <div className="flex items-center space-x-2 text-sm font-black text-yellow-700 uppercase tracking-widest">
                      <Bot size={18} />
                      <span>AI Insights</span>
                    </div>
                    <p className="text-sm font-bold text-yellow-800 leading-relaxed italic">
                      "YBS {selectedBus.number} is best for travelers from {selectedBus.startPoint} to {selectedBus.endPoint}. Expect heavy traffic near Junction Square around 5 PM."
                    </p>
                  </div>
               </section>
            </div>
          </div>
        )}

        {activeView === 'home' && (
          <div className="max-w-4xl mx-auto space-y-14">
            <header className="space-y-10">
              <div className="space-y-4">
                <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-yellow-50 border border-yellow-100 rounded-full text-yellow-700 text-[10px] font-black uppercase tracking-widest">
                  <Sparkles size={12} />
                  <span>AI Powered Transit Hub</span>
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                  {t.liveTitle} <br/>
                  <span className="text-yellow-500 italic">{t.liveSubtitle}</span>
                </h2>
              </div>

              <form onSubmit={handleSmartSearch} className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 rounded-[2rem] sm:rounded-[3rem] blur opacity-15 group-hover:opacity-30 transition duration-1000"></div>
                <div className="relative bg-white p-2 sm:p-3 rounded-[2rem] sm:rounded-[2.75rem] shadow-2xl flex items-center border border-slate-100">
                  <div className="pl-4 sm:pl-6 text-slate-300"><Search size={24} className="sm:w-7 sm:h-7" /></div>
                  <input type="text" value={smartQuery} onChange={(e) => setSmartQuery(e.target.value)} placeholder={t.searchPlaceholder} className="flex-1 p-4 sm:p-6 bg-transparent outline-none text-slate-800 font-bold text-lg sm:text-xl placeholder:text-slate-200" />
                  <button type="submit" className="bg-slate-900 text-yellow-400 px-6 sm:px-10 py-4 sm:py-5 rounded-[1.5rem] sm:rounded-[2.25rem] font-black transition-all flex items-center space-x-2 sm:space-x-3 active:scale-[0.97]">
                    <Zap size={20} className="sm:w-6 sm:h-6" /><span className="hidden sm:inline">{lang === 'mm' ? 'ရှာဖွေပါ' : 'Search'}</span>
                  </button>
                </div>
              </form>
            </header>

            {isSmartLoading && (
              <div className="flex items-center justify-center p-12 bg-white rounded-[3rem] border border-slate-100 shadow-xl animate-pulse">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
              </div>
            )}

            {smartResult && (
              <section className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-slate-900 rounded-[1rem] text-yellow-400"><Sparkles size={24} /></div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">{lang === 'mm' ? 'AI လေ့လာချက်' : 'AI Analysis'}</h4>
                  </div>
                  <button onClick={() => setSmartResult(null)} className="p-3 hover:bg-slate-50 rounded-full text-slate-200 transition-colors"><X size={24} /></button>
                </div>
                <div className="prose prose-slate max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed font-semibold text-lg">{smartResult.text}</div>
                {smartResult.sources && smartResult.sources.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-slate-100">
                    <div className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                      <ExternalLink size={12} />
                      <span>Sources</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {smartResult.sources.map((chunk: any, idx: number) => chunk.web && (
                        <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 px-4 py-2 bg-slate-50 hover:bg-yellow-50 hover:text-yellow-700 rounded-xl text-[11px] font-bold text-slate-500 transition-all border border-transparent hover:border-yellow-100">
                          <Globe size={12} />
                          <span className="truncate max-w-[150px]">{chunk.web.title || chunk.web.uri}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-8">
                {favorites.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-black text-slate-400 uppercase text-[11px] tracking-[0.4em] flex items-center space-x-2">
                      <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      <span>{t.favTitle}</span>
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      {BUS_LINES.filter(l => favorites.includes(l.id)).map(line => (
                        <button key={line.id} onClick={() => { setSelectedBusId(line.id); setActiveView('bus-detail'); }} className="bg-white p-4 px-6 rounded-2xl border border-slate-100 shadow-sm hover:border-yellow-400 transition-all flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black" style={{ backgroundColor: line.color }}>{line.number.replace('YBS ', '')}</div>
                          <span className="font-black text-sm">{line.number}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-10">
                  <h3 className="font-black text-3xl text-slate-900 tracking-tight">{t.ai}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                    <input type="text" value={fromStop} onChange={(e) => setFromStop(e.target.value)} placeholder={lang === 'mm' ? 'လက်ရှိနေရာ...' : 'Current location...'} className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[1.75rem] outline-none font-bold text-slate-700" />
                    <input type="text" value={toStop} onChange={(e) => setToStop(e.target.value)} placeholder={lang === 'mm' ? 'သွားမည့်နေရာ...' : 'Destination...'} className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[1.75rem] outline-none font-bold text-slate-700" />
                  </div>
                  <button onClick={async () => { 
                    const prompt = `${fromStop} မှ ${toStop} သို့ အကောင်းဆုံးလမ်းကြောင်းကို ရှင်းပြပါ။`; 
                    setSmartQuery(prompt); 
                    await handleSmartSearch(undefined, prompt); 
                  }} className="w-full bg-yellow-400 text-slate-900 font-black py-6 rounded-[2rem] shadow-2xl flex items-center justify-center space-x-4">
                    <Bot size={24} /><span>{t.aiRouteBtn}</span>
                  </button>
                </div>
              </div>
              <div className="space-y-8">
                <h3 className="font-black text-slate-400 uppercase text-[11px] tracking-[0.4em] flex items-center space-x-2"><History size={12} /><span>{t.recentNews}</span></h3>
                <div className="space-y-5">{news.map(item => (<div key={item.id} className="bg-white p-7 rounded-[2.25rem] border border-slate-100 shadow-sm group hover:border-yellow-400 transition-all"><span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[9px] font-black uppercase tracking-widest">{item.time}</span><h4 className="font-bold text-slate-800 leading-tight mt-3">{item.title}</h4></div>))}</div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'bus-list' && (
          <div className="max-w-5xl mx-auto space-y-12">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-4">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">{t.routes}</h2>
                <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">YBS 2026 Directory</p>
              </div>
              <div className="relative w-full md:w-96">
                <input 
                  type="text" 
                  value={lineSearchQuery} 
                  onChange={(e) => setLineSearchQuery(e.target.value)} 
                  placeholder={t.routeSearchPlaceholder} 
                  className="w-full p-4 pl-12 bg-white border border-slate-100 rounded-2xl shadow-sm font-bold text-sm outline-none focus:ring-2 focus:ring-yellow-400 transition-all" 
                />
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              </div>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 animate-in fade-in duration-500">
              {filteredLines.map(line => (
                <div key={line.id} onClick={() => { setSelectedBusId(line.id); setActiveView('bus-detail'); }} className={`bg-white p-8 rounded-[3rem] border transition-all duration-500 flex flex-col h-full group cursor-pointer ${favorites.includes(line.id) ? 'border-yellow-200 shadow-xl shadow-yellow-50' : 'border-slate-100 shadow-sm hover:shadow-2xl'}`}>
                  <div className="flex items-center space-x-6 mb-8">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg group-hover:scale-110 transition-transform" style={{ backgroundColor: line.color }}>{line.number.replace('YBS ', '')}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{line.number}</h3>
                        <button onClick={(e) => toggleFavorite(line.id, e)} className={`p-2 rounded-xl transition-all ${favorites.includes(line.id) ? 'bg-yellow-400 text-white' : 'bg-slate-50 text-slate-200'}`}><Star size={18} fill={favorites.includes(line.id) ? 'white' : 'none'} /></button>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center space-x-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest"><span>{line.startPoint}</span><ArrowRightLeft size={10} /><span>{line.endPoint}</span></div>
                        {line.hasYPS && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[8px] font-black uppercase rounded">YPS</span>}
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8 italic">"{line.description}"</p>
                  <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-100">
                     <div className="flex items-center space-x-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest"><Clock size={12} /><span>{line.estimatedTripDuration}</span></div>
                     <ChevronRight size={20} className="text-slate-300 group-hover:text-yellow-500 transform group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
              {filteredLines.length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <Filter size={48} className="opacity-20" />
                  <p className="font-bold">{lang === 'mm' ? 'ရှာဖွေမှုမတွေ့ရှိပါ။' : 'No lines or routes found.'}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'nearby' && (
          <div className="max-w-4xl mx-auto space-y-12">
            <header className="flex items-center justify-between">
              <div className="space-y-4">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">{t.nearby}</h2>
                <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">{lang === 'mm' ? 'အနီးဆုံးမှတ်တိုင်များ' : 'Stops near you'}</p>
              </div>
              <button onClick={locateUser} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 flex items-center space-x-2">
                <RefreshCcw size={20} className={isLocating ? 'animate-spin' : ''} /><span className="font-bold text-sm hidden sm:inline">{lang === 'mm' ? 'ပြန်ရှာ' : 'Refresh'}</span>
              </button>
            </header>
            {userLocation && (
              <div className="grid grid-cols-1 gap-6">
                {nearbyStops.map((stop) => (
                  <div key={stop.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 hover:shadow-xl transition-all group">
                    <div className="flex items-center space-x-6">
                      <div className="p-5 bg-slate-900 rounded-[1.25rem] text-yellow-400"><MapPin size={32} /></div>
                      <div className="space-y-1">
                        <h4 className="text-2xl font-black text-slate-900">{stop.name}</h4>
                        <div className="flex items-center space-x-3 text-slate-400 font-bold text-xs uppercase tracking-widest"><span className="text-yellow-500">{stop.township}</span><span>•</span><span>{stop.landmark}</span></div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right">
                        <div className="text-3xl font-black text-slate-900">{stop.distance! === Infinity ? '???' : stop.distance! < 1000 ? `${Math.round(stop.distance!)}m` : `${(stop.distance! / 1000).toFixed(1)}km`}</div>
                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{lang === 'mm' ? 'အကွာအဝေး' : 'Distance'}</div>
                      </div>
                      <button onClick={() => { setLineSearchQuery(stop.name); setActiveView('bus-list'); }} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-yellow-400 hover:text-slate-900"><ChevronRight size={24} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'ai-assistant' && (
           <div className="max-w-4xl mx-auto flex flex-col min-h-[calc(100vh-12rem)] sm:min-h-[calc(100vh-16rem)]">
              <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{t.ai}</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Yangon Smart Engine</p>
                </div>
                <div className="flex items-center space-x-2 text-green-500 bg-green-50 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border border-green-100 shadow-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
                </div>
              </header>

              <div className="flex-1 bg-white border border-slate-100 rounded-[2rem] sm:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden relative min-h-[400px] sm:min-h-[500px]">
                <div className="flex-1 overflow-y-auto p-5 md:p-10 space-y-10 custom-scrollbar scroll-smooth">
                  {chatHistory.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-8 py-20">
                      <div className="p-10 bg-slate-50 rounded-[3.5rem] text-slate-200 shadow-inner">
                        <Bot size={80} strokeWidth={1} />
                      </div>
                      <div className="space-y-3 max-w-xs">
                        <p className="font-black text-2xl text-slate-800">{lang === 'mm' ? 'မင်္ဂလာပါရှင်' : 'Mingalarpar'}</p>
                        <p className="font-bold text-slate-400 leading-relaxed text-sm">
                          {lang === 'mm' ? 'ဘယ်မှတ်တိုင်ကနေ ဘယ်သွားချင်ပါသလဲ။ YBS လမ်းကြောင်းများအားလုံးကို ကူညီပေးနိုင်ပါတယ်။' : 'Where are you heading today? I can help with all YBS route plans.'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {chatHistory.map((chat, i) => (
                    <div key={i} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'} items-start space-x-3`}>
                      {chat.role === 'bot' && (
                        <div className="hidden sm:flex w-10 h-10 bg-slate-900 text-yellow-400 rounded-2xl items-center justify-center shadow-lg shrink-0 mt-1">
                          <Bot size={20} />
                        </div>
                      )}
                      <div className={`flex flex-col ${chat.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
                        <div className={`p-6 rounded-[2.25rem] shadow-sm relative transition-all duration-300 ${
                          chat.role === 'user' 
                            ? 'bg-yellow-400 text-slate-900 rounded-tr-none shadow-yellow-100' 
                            : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100'
                        }`}>
                          <div className="whitespace-pre-wrap font-bold text-lg leading-relaxed">{chat.text}</div>
                          
                          {chat.role === 'bot' && chat.sources && chat.sources.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-slate-200/40">
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center space-x-2">
                                <Globe size={10} className="text-slate-300" />
                                <span>{t.sources}</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {chat.sources.map((chunk: any, idx: number) => chunk.web && (
                                  <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-yellow-50 rounded-xl text-[10px] font-bold text-slate-500 hover:text-yellow-700 transition-all border border-slate-100/50 hover:border-yellow-200">
                                    <ExternalLink size={10} />
                                    <span className="truncate max-w-[140px]">{chunk.web.title || 'Source'}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-2 px-4 opacity-40">
                           <Clock3 size={10} />
                           <span className="text-[10px] font-black uppercase tracking-widest">{chat.time}</span>
                           <span className="text-[10px] font-black uppercase tracking-widest">• {chat.role === 'user' ? 'You' : 'YBS AI'}</span>
                        </div>
                      </div>
                      {chat.role === 'user' && (
                        <div className="hidden sm:flex w-10 h-10 bg-yellow-100 text-yellow-600 rounded-2xl items-center justify-center shadow-md shrink-0 mt-1 border border-yellow-200">
                          <User size={20} />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isAiLoading && (
                    <div className="flex justify-start items-start space-x-3 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="hidden sm:flex w-10 h-10 bg-slate-900 text-yellow-400 rounded-2xl items-center justify-center shrink-0 mt-1">
                        <Sparkles size={20} className="animate-spin duration-1000" />
                      </div>
                      <div className="bg-slate-50 p-6 px-10 rounded-[2rem] border border-slate-100 flex items-center space-x-2.5">
                        <div className="w-2.5 h-2.5 bg-slate-200 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-2.5 h-2.5 bg-slate-200 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-2.5 h-2.5 bg-slate-200 rounded-full animate-bounce" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                
                <div className="p-6 md:p-8 bg-slate-50/50 border-t border-slate-100 backdrop-blur-xl">
                  <div className="flex items-center space-x-4 bg-white p-2.5 rounded-[2.5rem] shadow-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-yellow-400 transition-all">
                    <input 
                      type="text" 
                      value={aiMessage} 
                      onChange={(e) => setAiMessage(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleAiAsk()} 
                      placeholder={lang === 'mm' ? 'မေးမြန်းပါ...' : 'Type your question...'} 
                      className="flex-1 p-4 px-6 bg-transparent outline-none text-slate-800 font-bold text-xl placeholder:text-slate-200" 
                    />
                    <button 
                      onClick={handleAiAsk} 
                      disabled={isAiLoading || !aiMessage.trim()}
                      className="bg-slate-900 text-yellow-400 p-5 rounded-[2rem] hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all shadow-lg"
                    >
                      <Send size={28} />
                    </button>
                  </div>
                  <div className="flex items-center justify-center space-x-2 mt-6 opacity-30">
                    <ShieldCheck size={12} />
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      {t.aiDisclaimer}
                    </p>
                  </div>
                </div>
              </div>
           </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-4 sm:bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center bg-slate-900/90 backdrop-blur-xl p-2 sm:p-2.5 rounded-full shadow-2xl border border-slate-800 z-50">
        {[
          { v: 'home', i: Zap },
          { v: 'bus-list', i: Bus },
          { v: 'nearby', i: MapPin },
          { v: 'ai-assistant', i: Bot }
        ].map(item => (
          <button key={item.v} onClick={() => { setActiveView(item.v as ViewState); setSelectedBusId(null); }} className={`p-3 sm:p-4 rounded-full transition-all touch-manipulation ${activeView === item.v ? 'bg-yellow-400 text-slate-900' : 'text-slate-500 hover:text-slate-300'}`}><item.i size={20} className="sm:w-6 sm:h-6" /></button>
        ))}
      </nav>
    </div>
  );
};

export default App;
