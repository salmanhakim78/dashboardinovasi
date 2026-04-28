import { useState, useEffect, useRef } from 'react';
import { Send, Bot, FileDown, Users, Target, Zap, Search, X, AlertCircle, RefreshCw, Sparkles, TrendingUp, CheckCircle, ArrowRight, Loader2, BookOpen, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { CollaborationDetail } from './CollaborationDetail';
import ReportCollaboration from './ReportSingleInnovation';
import { ReportAIRecommendation } from './ReportAIRecommendation';

// ==================== INTERFACES ====================
interface TopRecommendation {
  cluster_id: number;
  skor_kolaborasi: number;
  jumlah_inovasi: number;
  inovasi_1: {
    id: number;
    judul: string;
    urusan: string;
    tahap: string;
    kematangan: string;
    opd: string;
    deskripsi: string;
    tanggal_penerapan?: string;
  };
  inovasi_2: {
    id: number;
    judul: string;
    urusan: string;
    tahap: string;
    kematangan: string;
    opd: string;
    deskripsi: string;
    tanggal_penerapan?: string;
  };
}

interface AIChatbotProps {
  darkMode: boolean;
}

interface Message {
  id: number;
  type: 'user' | 'bot' | 'typing' | 'error';
  text: string;
}

interface Innovation {
  id: number;
  judul: string;
  opd?: string;
  urusan?: string;
  tahap?: string;
  kematangan?: string;
}

interface ExplorationResult {
  title: string;
  score: number;
  manfaat: string[];
  dampak: string[];
  alasan: string;
  tingkat: string;
  judul1?: string;
  judul2?: string;
  opd1?: string;
  opd2?: string;
  urusan1?: string;
  urusan2?: string;
  tahap1?: string;
  tahap2?: string;
  tanggal_penerapan_1?: string;
  tanggal_penerapan_2?: string;
  deskripsi1?: string;
  deskripsi2?: string;
}

interface DetailData {
  inovasi_1_id: number;
  inovasi_2_id: number;
  inovasi_1_judul: string;
  inovasi_2_judul: string;
  opd_1: string;
  opd_2: string;
  urusan_1: string;
  urusan_2: string;
  tahap_1: string;
  tahap_2: string;
  kematangan_1: string;
  kematangan_2: string;
  similarity: number;
  deskripsi_1?: string;
  deskripsi_2?: string;
  tanggal_penerapan_1?: string;
  tanggal_penerapan_2?: string;
}

// ==================== UTILITY FUNCTIONS ====================
const getScoreBadgeColor = (score: number): string => {
  if (score >= 0.9) return 'bg-emerald-500 text-white';
  if (score >= 0.7) return 'bg-blue-500 text-white';
  return 'bg-yellow-500 text-white';
};

const getScoreLabel = (score: number): string => {
  if (score >= 0.9) return 'Sangat Cocok';
  if (score >= 0.7) return 'Potensial';
  return 'Cukup Cocok';
};

const scoreToPercentage = (score: number): number => Math.round(score * 100);

const truncateText = (text: string, maxLength: number = 100): string => {
  if (!text || text.length <= maxLength) return text || '';
  return text.slice(0, maxLength).trimEnd() + '...';
};

// ==================== DESKRIPSI FORMATTER ====================
function formatDeskripsiParagraphs(text: string): string[] {
  if (!text) return [];
  const sentences = text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  if (sentences.length <= 2) return [text];
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    paragraphs.push(sentences.slice(i, i + 3).join(' '));
  }
  return paragraphs;
}

// Komponen deskripsi dengan expand/collapse — default collapsed (4 baris)
function DeskripsiInovasi({
  deskripsi,
  label,
  color,
  darkMode,
}: {
  deskripsi: string;
  label: string;
  color: 'blue' | 'purple';
  darkMode: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const palette = {
    blue: {
      borderL: 'border-l-blue-400',
      borderBox: darkMode ? 'border-blue-700/60' : 'border-blue-200',
      bg: darkMode ? 'bg-blue-950/40' : 'bg-blue-50',
      iconText: darkMode ? 'text-blue-400' : 'text-blue-600',
      toggleText: darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800',
      divider: darkMode ? 'border-blue-800/50' : 'border-blue-100',
      fadeFrom: darkMode ? 'from-gray-800' : 'from-blue-50',
      bodyText: darkMode ? 'text-gray-300' : 'text-gray-700',
    },
    purple: {
      borderL: 'border-l-purple-400',
      borderBox: darkMode ? 'border-purple-700/60' : 'border-purple-200',
      bg: darkMode ? 'bg-purple-950/40' : 'bg-purple-50',
      iconText: darkMode ? 'text-purple-400' : 'text-purple-600',
      toggleText: darkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-800',
      divider: darkMode ? 'border-purple-800/50' : 'border-purple-100',
      fadeFrom: darkMode ? 'from-gray-800' : 'from-purple-50',
      bodyText: darkMode ? 'text-gray-300' : 'text-gray-700',
    },
  }[color];

  return (
    <div className={`rounded-xl border-l-4 ${palette.borderL} border ${palette.borderBox} ${palette.bg} overflow-hidden mt-3`}>
      <div className={`flex items-center gap-2 px-4 py-2.5 ${palette.iconText}`}>
        <BookOpen size={13} />
        <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
      </div>

      <div className="relative px-4 pb-1">
        <p
          className={`text-sm leading-relaxed text-justify ${palette.bodyText} transition-all duration-300`}
          style={
            expanded
              ? { whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
              : {
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical' as any,
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                }
          }
        >
          {deskripsi}
        </p>
        {!expanded && (
          <div className={`absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t ${palette.fadeFrom} to-transparent pointer-events-none`} />
        )}
      </div>

      <button
        onClick={() => setExpanded(prev => !prev)}
        className={`w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-colors border-t ${palette.divider} ${palette.toggleText}`}
      >
        {expanded
          ? <><ChevronUp size={13} /> Lebih sedikit</>
          : <><ChevronDown size={13} /> Baca selengkapnya</>
        }
      </button>
    </div>
  );
}

// ==================== CARD COLOR PALETTES FOR DARK MODE ====================
const cardDarkStyles = [
  {
    card: { background: 'linear-gradient(135deg, #1e3a5f 0%, #1e1b4b 100%)', borderColor: '#3b82f6' },
    inovasi1Bg: { background: 'rgba(30, 58, 138, 0.6)', borderColor: 'rgba(96, 165, 250, 0.5)' },
    inovasi1LabelColor: '#93c5fd',
    inovasi2Bg: { background: 'rgba(49, 46, 129, 0.6)', borderColor: 'rgba(129, 140, 248, 0.5)' },
    inovasi2LabelColor: '#a5b4fc',
    tag1Color: { background: 'rgba(59, 130, 246, 0.3)', color: '#bfdbfe', borderColor: 'rgba(96, 165, 250, 0.5)' },
    tag2Color: { background: 'rgba(99, 102, 241, 0.3)', color: '#c7d2fe', borderColor: 'rgba(129, 140, 248, 0.5)' },
    hoverBorder: '#60a5fa',
  },
  {
    card: { background: 'linear-gradient(135deg, #134e4a 0%, #164e63 100%)', borderColor: '#14b8a6' },
    inovasi1Bg: { background: 'rgba(19, 78, 74, 0.7)', borderColor: 'rgba(45, 212, 191, 0.5)' },
    inovasi1LabelColor: '#5eead4',
    inovasi2Bg: { background: 'rgba(22, 78, 99, 0.7)', borderColor: 'rgba(34, 211, 238, 0.5)' },
    inovasi2LabelColor: '#67e8f9',
    tag1Color: { background: 'rgba(20, 184, 166, 0.3)', color: '#ccfbf1', borderColor: 'rgba(45, 212, 191, 0.5)' },
    tag2Color: { background: 'rgba(6, 182, 212, 0.3)', color: '#cffafe', borderColor: 'rgba(34, 211, 238, 0.5)' },
    hoverBorder: '#2dd4bf',
  },
  {
    card: { background: 'linear-gradient(135deg, #3b0764 0%, #2e1065 100%)', borderColor: '#a855f7' },
    inovasi1Bg: { background: 'rgba(59, 7, 100, 0.7)', borderColor: 'rgba(192, 132, 252, 0.5)' },
    inovasi1LabelColor: '#d8b4fe',
    inovasi2Bg: { background: 'rgba(46, 16, 101, 0.7)', borderColor: 'rgba(167, 139, 250, 0.5)' },
    inovasi2LabelColor: '#c4b5fd',
    tag1Color: { background: 'rgba(168, 85, 247, 0.3)', color: '#f3e8ff', borderColor: 'rgba(192, 132, 252, 0.5)' },
    tag2Color: { background: 'rgba(139, 92, 246, 0.3)', color: '#ede9fe', borderColor: 'rgba(167, 139, 250, 0.5)' },
    hoverBorder: '#c084fc',
  },
];

// ==================== API CONFIGURATION ====================
const API_BASE_URL = 'http://localhost:8000';

const API_ENDPOINTS = {
  innovations: `${API_BASE_URL}/dashboard/inovasi-list`,
  topRecommendations: `${API_BASE_URL}/api/recommendations/top-clusters`,
  explorationSimulate: `${API_BASE_URL}/ai-input-collaboration/simulate`,
  chatbot: `${API_BASE_URL}/api/chatbot`,
};

// ==================== SEARCHABLE DROPDOWN ====================
function SearchableDropdown({ options, value, onChange, label, darkMode }: {
  options: Innovation[];
  value: number | null;
  onChange: (id: number) => void;
  label: string;
  darkMode: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(o =>
    o.judul.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const selectedLabel = options.find(o => o.id === value)?.judul || 'Pilih inovasi';

  const updateDropdownPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left: rect.left,
        width: Math.max(rect.width, 320),
        maxWidth: 500,
        zIndex: 9999,
      });
    }
  };

  const handleToggle = () => { if (!isOpen) updateDropdownPosition(); setIsOpen(!isOpen); };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) { setIsOpen(false); setSearchTerm(''); }
    };
    const handleScroll = () => { if (isOpen) updateDropdownPosition(); };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  return (
    <div className="relative w-full">
      <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-700'}`}>{label}</label>
      <div ref={triggerRef} onClick={handleToggle}
        className={`w-full px-4 py-2.5 border rounded-xl cursor-pointer flex items-center justify-between transition ${
          darkMode ? 'bg-gray-700 border-gray-600 text-white hover:border-purple-500' : 'bg-white border-gray-300 text-gray-800 hover:border-purple-400'
        }`}>
        <span className="truncate">{selectedLabel}</span>
        <Search size={16} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
      </div>
      {isOpen && (
        <div ref={dropdownRef}
          className={`rounded-xl shadow-2xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}
          style={dropdownStyle}>
          <div className="p-2">
            <div className="relative">
              <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ketik untuk mencari..."
                className={`w-full pl-9 pr-8 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                }`}
                onClick={(e) => e.stopPropagation()} />
              {searchTerm && (
                <button onClick={(e) => { e.stopPropagation(); setSearchTerm(''); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X size={14} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                </button>
              )}
            </div>
          </div>
          <div className="overflow-y-auto py-1" style={{ maxHeight: '320px' }}>
            {filteredOptions.length > 0 ? filteredOptions.map((option) => (
              <div key={option.id}
                onClick={() => { onChange(option.id); setIsOpen(false); setSearchTerm(''); }}
                className={`px-4 py-3 text-sm cursor-pointer transition flex items-start gap-2 ${
                  value === option.id ? 'bg-purple-600 text-white' : darkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-purple-50 text-gray-800'
                }`}>
                <span className="flex-1 leading-snug">{option.judul}</span>
              </div>
            )) : (
              <div className={`px-4 py-3 text-sm text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tidak ada hasil</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== TYPING INDICATOR ====================
const TypingIndicator = () => (
  <div className="flex gap-1">
    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
  </div>
);

// ==================== FORMAT BOT MESSAGE ====================
// Parse line-by-line dan kelompokkan ke dalam "blok":
//   - numbered  : baris yang dimulai dengan "1. 2. 3. ..."
//   - bullet    : baris yang dimulai dengan "- * •" (tapi BUKAN angka)
//   - paragraph : baris teks biasa
// Blok sejenis yang berurutan digabung menjadi satu elemen UI.

const isNumberedLine = (l: string): boolean => /^\d+\.\s+/.test(l);
const isBulletLine   = (l: string): boolean => /^[-*•]\s+/.test(l);

const formatBotMessage = (text: string, darkMode: boolean): React.ReactNode[] => {
  const cleaned = text.replace(/\*\*\*+/g, '').replace(/\*\*/g, '');
  const rawLines = cleaned.split('\n');

  type Block =
    | { type: 'paragraph'; lines: string[] }
    | { type: 'numbered';  items: string[] }
    | { type: 'bullet';    items: string[] };

  const blocks: Block[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const trimmed = rawLines[i].trim();
    if (!trimmed) continue;

    if (isNumberedLine(trimmed)) {
      const content = trimmed.replace(/^\d+\.\s*/, '').trim();
      const last = blocks[blocks.length - 1];
      if (last?.type === 'numbered') {
        last.items.push(content);
      } else {
        blocks.push({ type: 'numbered', items: [content] });
      }
    } else if (isBulletLine(trimmed)) {
      const content = trimmed.replace(/^[-*•]\s*/, '').trim();
      const last = blocks[blocks.length - 1];
      if (last?.type === 'bullet') {
        last.items.push(content);
      } else {
        blocks.push({ type: 'bullet', items: [content] });
      }
    } else {
      // Teks biasa — paragraph break jika baris sebelumnya kosong
      const prevEmpty = i > 0 && rawLines[i - 1].trim() === '';
      const last = blocks[blocks.length - 1];
      if (last?.type === 'paragraph' && !prevEmpty) {
        last.lines.push(trimmed);
      } else {
        blocks.push({ type: 'paragraph', lines: [trimmed] });
      }
    }
  }

  return blocks.map((block, idx) => {
    if (block.type === 'numbered') {
      return (
        <div key={idx} className={`rounded-lg p-3 my-2 border ${darkMode ? 'bg-gray-700/60 border-gray-600' : 'bg-green-50 border-green-200'}`}>
          <ul className="space-y-2">
            {block.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                  {i + 1}
                </span>
                <span className={`flex-1 text-sm leading-relaxed ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    if (block.type === 'bullet') {
      return (
        <ul key={idx} className="space-y-1.5 pl-1 my-1.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`flex-shrink-0 mt-0.5 ${darkMode ? 'text-green-400' : 'text-green-500'}`} style={{ fontSize: '0.45rem', lineHeight: '1.5rem' }}>&#9679;</span>
              <span className={`flex-1 text-sm leading-relaxed ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                {item}
              </span>
            </li>
          ))}
        </ul>
      );
    }

    // paragraph
    return (
      <div key={idx} className="my-1">
        {block.lines.map((line, i) => (
          <p key={i} className={`text-sm leading-relaxed text-justify ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
            {line}
          </p>
        ))}
      </div>
    );
  });
};
// ==================== MAIN COMPONENT ====================
export function AIChatbot({ darkMode }: AIChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [filterInovasi1, setFilterInovasi1] = useState<number | null>(null);
  const [filterInovasi2, setFilterInovasi2] = useState<number | null>(null);
  const [selectedExploration, setSelectedExploration] = useState<ExplorationResult | null>(null);
  const [showExplorationResult, setShowExplorationResult] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<DetailData | null>(null);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'exploration'>('recommendations');
  const [pdfData, setPdfData] = useState<any>(null);
  const [selectedPdfRecommendation, setSelectedPdfRecommendation] = useState<TopRecommendation | null>(null);

  const [topRecommendations, setTopRecommendations] = useState<TopRecommendation[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [explorationError, setExplorationError] = useState<string | null>(null);
  const [innovationList, setInnovationList] = useState<Innovation[]>([]);
  const [isLoadingInnovation, setIsLoadingInnovation] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const [suggestedPrompts] = useState([
    "Apa itu inovasi POP SURGA?",
    "Berapa total inovasi yang terdaftar di Jatim?",
    "Inovasi mana yang paling siap untuk direplikasi?",
    "OPD mana yang paling aktif berinovasi?"
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const explorationResultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => {
    const fetchInnovations = async () => {
      setIsLoadingInnovation(true);
      try {
        const res = await fetch(API_ENDPOINTS.innovations);
        if (!res.ok) throw new Error('Gagal mengambil data inovasi');
        const data = await res.json();
        setInnovationList(data.map((item: any) => ({
          id: item.id,
          judul: item.judul_inovasi,
          opd: item.admin_opd,
          urusan: item.urusan_utama,
          tahap: item.tahapan_inovasi,
          kematangan: item.label_kematangan,
        })));
      } catch (e) { console.error(e); setInnovationList([]); }
      finally { setIsLoadingInnovation(false); }
    };
    fetchInnovations();
  }, []);

  const fetchTopRecommendations = async () => {
    setIsLoadingRecommendations(true);
    setRecommendationError(null);
    try {
      const res = await fetch(`${API_ENDPOINTS.topRecommendations}?limit=3`);
      if (!res.ok) throw new Error('Gagal mengambil rekomendasi');
      const result = await res.json();
      if (result.status === 'empty' || !result.data || result.data.length === 0) {
        setRecommendationError(result.message || 'Belum ada rekomendasi tersedia.');
        setTopRecommendations([]);
        setLastRunTime(null);
        return;
      }
      if (result.last_run) setLastRunTime(result.last_run);
      setTopRecommendations(result.data);
    } catch (e) {
      console.error(e);
      setRecommendationError('Terjadi kesalahan saat mengambil data.');
      setTopRecommendations([]);
    } finally { setIsLoadingRecommendations(false); }
  };

  useEffect(() => { fetchTopRecommendations(); }, []);

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isSendingMessage) return;
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text }]);
    setInput('');
    setIsSendingMessage(true);
    setMessages(prev => [...prev, { id: Date.now() + 1, type: 'typing', text: '' }]);
    try {
      const res = await fetch(API_ENDPOINTS.chatbot, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages(prev => [
        ...prev.filter(m => m.type !== 'typing'),
        { id: Date.now(), type: 'bot', text: data.answer || 'Maaf, tidak ada respons dari AI.' },
      ]);
    } catch (e) {
      setMessages(prev => [
        ...prev.filter(m => m.type !== 'typing'),
        { id: Date.now(), type: 'error', text: 'Gagal terhubung ke AI Assistant. Silakan coba lagi.' },
      ]);
    } finally { setIsSendingMessage(false); }
  };

  const handleRetry = () => {
    const last = [...messages].reverse().find(m => m.type === 'user');
    if (last) { setMessages(prev => prev.filter(m => m.type !== 'error')); setTimeout(() => handleSend(last.text), 100); }
  };

  const handleAnalyze = async () => {
    if (!filterInovasi1 || !filterInovasi2) { setExplorationError("Pilih dua inovasi terlebih dahulu"); return; }
    if (filterInovasi1 === filterInovasi2) { setExplorationError("Pilih dua inovasi yang berbeda"); return; }
    setIsAnalyzing(true);
    setExplorationError(null);
    try {
      const res = await fetch(`${API_ENDPOINTS.explorationSimulate}?inovasi_1_id=${filterInovasi1}&inovasi_2_id=${filterInovasi2}`);
      if (!res.ok) throw new Error("Gagal mengambil analisis AI");
      const data = await res.json();
      const ai = data.hasil_ai;
      setSelectedExploration({
        title: ai.judul_kolaborasi,
        score: data.skor_kecocokan,
        manfaat: Array.isArray(ai.manfaat_kolaborasi) ? ai.manfaat_kolaborasi : [ai.manfaat_kolaborasi],
        dampak: Array.isArray(ai.potensi_dampak) ? ai.potensi_dampak : [ai.potensi_dampak],
        alasan: ai.alasan_sinergi,
        tingkat: ai.tingkat_kolaborasi,
        judul1: data.inovasi_1?.judul,
        judul2: data.inovasi_2?.judul,
        opd1: data.inovasi_1?.opd,
        opd2: data.inovasi_2?.opd,
        urusan1: data.inovasi_1?.urusan,
        urusan2: data.inovasi_2?.urusan,
        tahap1: data.inovasi_1?.tahap,
        tahap2: data.inovasi_2?.tahap,
        tanggal_penerapan_1: data.inovasi_1?.tanggal_penerapan,
        tanggal_penerapan_2: data.inovasi_2?.tanggal_penerapan,
        deskripsi1: data.inovasi_1?.deskripsi || '',
        deskripsi2: data.inovasi_2?.deskripsi || '',
      });
      setShowExplorationResult(true);
      setTimeout(() => explorationResultRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    } catch (e) { setExplorationError("Gagal mengambil analisis kolaborasi AI"); }
    finally { setIsAnalyzing(false); }
  };

  const handleViewDetail = (collaboration: TopRecommendation) => {
    setSelectedDetail({
      inovasi_1_id: collaboration.inovasi_1.id,
      inovasi_2_id: collaboration.inovasi_2.id,
      inovasi_1_judul: collaboration.inovasi_1.judul,
      inovasi_2_judul: collaboration.inovasi_2.judul,
      opd_1: collaboration.inovasi_1.opd || 'N/A',
      opd_2: collaboration.inovasi_2.opd || 'N/A',
      urusan_1: collaboration.inovasi_1.urusan,
      urusan_2: collaboration.inovasi_2.urusan,
      tahap_1: collaboration.inovasi_1.tahap,
      tahap_2: collaboration.inovasi_2.tahap,
      kematangan_1: collaboration.inovasi_1.kematangan,
      kematangan_2: collaboration.inovasi_2.kematangan,
      similarity: collaboration.skor_kolaborasi,
      deskripsi_1: collaboration.inovasi_1.deskripsi,
      deskripsi_2: collaboration.inovasi_2.deskripsi,
      tanggal_penerapan_1: collaboration.inovasi_1.tanggal_penerapan,
      tanggal_penerapan_2: collaboration.inovasi_2.tanggal_penerapan,
    });
    setActiveTab('exploration');
  };

  if (activeTab === 'exploration' && selectedDetail) {
    return (
      <CollaborationDetail
        darkMode={darkMode}
        inovasi_1_id={selectedDetail.inovasi_1_id}
        inovasi_2_id={selectedDetail.inovasi_2_id}
        inovasi_1_judul={selectedDetail.inovasi_1_judul}
        inovasi_2_judul={selectedDetail.inovasi_2_judul}
        opd_1={selectedDetail.opd_1}
        opd_2={selectedDetail.opd_2}
        urusan_1={selectedDetail.urusan_1}
        urusan_2={selectedDetail.urusan_2}
        tahap_1={selectedDetail.tahap_1}
        tahap_2={selectedDetail.tahap_2}
        kematangan_1={selectedDetail.kematangan_1}
        kematangan_2={selectedDetail.kematangan_2}
        similarity={selectedDetail.similarity}
        deskripsi_1={selectedDetail.deskripsi_1}
        deskripsi_2={selectedDetail.deskripsi_2}
        tanggal_penerapan_1={selectedDetail.tanggal_penerapan_1}
        tanggal_penerapan_2={selectedDetail.tanggal_penerapan_2}
        onBack={() => { setSelectedDetail(null); setActiveTab('recommendations'); }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-6 max-w-7xl mx-auto px-4">
      {/* Header */}
      <div>
        <h2 className={`text-2xl md:text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          AI Rekomendasi Kolaborasi Inovasi
        </h2>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Sistem rekomendasi berbasis clustering untuk kolaborasi inovasi daerah
        </p>
        {lastRunTime && (
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            Terakhir diperbarui: {new Date(lastRunTime).toLocaleString('id-ID')}
          </p>
        )}
      </div>

      <div className="space-y-32">

        {/* ============= SECTION 1: TOP REKOMENDASI ============= */}
        <div className="rounded-3xl p-3 bg-white/40 dark:bg-gray-900/40">
          <section className={`rounded-2xl shadow-2xl overflow-hidden ${
            darkMode ? 'bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-800' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200'
          }`}>
            <div className={`px-6 py-5 border-b ${darkMode ? 'border-blue-800 bg-blue-900/60' : 'border-blue-200 bg-white/80'}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500 rounded-lg"><Sparkles className="text-white" size={20} /></div>
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Top Rekomendasi Kolaborasi</h3>
              </div>
              <p className={`text-sm ${darkMode ? 'text-blue-200' : 'text-gray-600'}`}>3 pasangan inovasi dengan skor similarity tertinggi</p>
            </div>

            <div className="p-6">
              {isLoadingRecommendations && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Memuat rekomendasi...</p>
                </div>
              )}

              {recommendationError && !isLoadingRecommendations && (
                <div className={`rounded-lg p-6 text-center ${darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
                  <AlertCircle className={`mx-auto mb-3 ${darkMode ? 'text-red-400' : 'text-red-600'}`} size={48} />
                  <p className={`text-sm font-medium mb-3 ${darkMode ? 'text-red-300' : 'text-red-800'}`}>{recommendationError}</p>
                  <button onClick={fetchTopRecommendations} className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium mx-auto">
                    <RefreshCw size={16} /> Coba Lagi
                  </button>
                </div>
              )}

              {!isLoadingRecommendations && !recommendationError && topRecommendations.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topRecommendations.map((item, index) => {
                    const ds = cardDarkStyles[index % cardDarkStyles.length];
                    const scorePercent = scoreToPercentage(item.skor_kolaborasi);

                    return (
                      <div
                        key={index}
                        className="relative rounded-xl p-5 transition-all hover:scale-[1.02] flex flex-col border shadow-xl"
                        style={darkMode ? {
                          background: ds.card.background, borderColor: ds.card.borderColor,
                          borderWidth: '1px', borderStyle: 'solid',
                        } : { background: '#ffffff', borderColor: '#f3f4f6', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                        onMouseEnter={darkMode ? (e) => {
                          (e.currentTarget as HTMLDivElement).style.borderColor = ds.hoverBorder;
                          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 24px ${ds.hoverBorder}44`;
                        } : undefined}
                        onMouseLeave={darkMode ? (e) => {
                          (e.currentTarget as HTMLDivElement).style.borderColor = ds.card.borderColor;
                          (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                        } : undefined}
                      >
                        {/* Header card */}
                        <div className="flex items-center justify-between mb-2">
                          <h4 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            Rekomendasi {index + 1}
                          </h4>
                          <div className="flex flex-col items-center ml-3 flex-shrink-0">
                            <div className={`px-4 py-1.5 rounded-lg text-base font-bold ${getScoreBadgeColor(item.skor_kolaborasi)}`}>
                              {scorePercent}%
                            </div>
                            <div className={`text-xs font-semibold text-center whitespace-nowrap mt-0.5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {getScoreLabel(item.skor_kolaborasi)}
                            </div>
                          </div>
                        </div>

                        {/* Inovasi Cards */}
                        <div className="space-y-2 mb-3 flex-1">
                          {[
                            { data: item.inovasi_1, label: 'Inovasi 1', labelColor: darkMode ? ds.inovasi1LabelColor : '#6b7280', bg: darkMode ? ds.inovasi1Bg : null, tag: darkMode ? ds.tag1Color : null },
                            { data: item.inovasi_2, label: 'Inovasi 2', labelColor: darkMode ? ds.inovasi2LabelColor : '#6b7280', bg: darkMode ? ds.inovasi2Bg : null, tag: darkMode ? ds.tag2Color : null },
                          ].map(({ data: inn, label, labelColor, bg, tag }) => (
                            <div key={label} className="px-3 py-2 rounded-lg border"
                              style={bg ? { background: bg.background, borderColor: bg.borderColor, borderWidth: '1px', borderStyle: 'solid' } : { background: '#f9fafb', border: 'none' }}>
                              <p className="text-xs mb-1 font-semibold uppercase tracking-wide" style={{ color: labelColor }}>{label}</p>
                              <p className={`text-sm font-semibold mb-1 line-clamp-2 min-h-[40px] ${darkMode ? 'text-white' : 'text-gray-800'}`}>{inn.judul}</p>
                              {inn.opd && (
                                <p className={`text-xs mb-2 truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{inn.opd}</p>
                              )}
                              {/* Preview 2 baris deskripsi di card */}
                              {inn.deskripsi && (
                                <p className={`text-xs mb-2 leading-relaxed line-clamp-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  {truncateText(inn.deskripsi, 80)}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-1">
                                <span className="text-xs px-2 py-0.5 rounded font-medium border"
                                  style={tag ? { background: tag.background, color: tag.color, borderColor: tag.borderColor } : { background: '#dbeafe', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
                                  {inn.urusan}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded font-medium border"
                                  style={tag ? { background: ds.tag2Color.background, color: ds.tag2Color.color, borderColor: ds.tag2Color.borderColor } : { background: '#ede9fe', color: '#6d28d9', borderColor: '#ddd6fe' }}>
                                  {inn.tahap}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* HAPUS badge kematangan — tidak ditampilkan lagi */}

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button onClick={() => handleViewDetail(item)} className="flex-1 flex items-center justify-center gap-1.5 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors text-xs font-medium">
                            Detail <ArrowRight size={14} />
                          </button>
                          <button onClick={() => setSelectedPdfRecommendation(item)} className="flex items-center justify-center gap-1.5 bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-colors text-xs font-medium">
                            <FileDown size={14} /> PDF
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ============= SECTION 2: EXPLORATION ============= */}
        <div className="rounded-3xl p-3 bg-white/40 dark:bg-gray-900/40">
          <section className="rounded-2xl shadow-2xl overflow-hidden" style={darkMode ? {
            background: 'linear-gradient(135deg, #1e1535 0%, #16102e 100%)', border: '1px solid #4c3580',
          } : { background: 'linear-gradient(135deg, #f5f3ff 0%, #fdf2f8 100%)', border: '1px solid #e9d5ff' }}>
            <div className="px-6 py-5 border-b" style={darkMode ? { borderColor: '#3d2a6e', background: 'rgba(60,40,100,0.25)' } : { borderColor: '#ddd6fe', background: 'rgba(255,255,255,0.8)' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500 rounded-lg"><Target className="text-white" size={20} /></div>
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Eksplorasi Kolaborasi Khusus</h3>
              </div>
              <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-600'}`}>Analisis potensi kolaborasi antara dua inovasi pilihan Anda</p>
            </div>

            <div className="p-6 space-y-4" style={{ overflow: 'visible' }}>
              {isLoadingInnovation ? (
                <div className="text-center py-8">
                  <Loader2 className={`mx-auto mb-3 animate-spin ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} size={32} />
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Memuat daftar inovasi...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SearchableDropdown options={innovationList} value={filterInovasi1} onChange={setFilterInovasi1} label="Inovasi Pertama" darkMode={darkMode} />
                    <SearchableDropdown options={innovationList} value={filterInovasi2} onChange={setFilterInovasi2} label="Inovasi Kedua" darkMode={darkMode} />
                  </div>
                  {explorationError && (
                    <div className="p-3 rounded-lg border" style={darkMode ? { background: 'rgba(220,38,38,0.15)', borderColor: 'rgba(248,113,113,0.6)' } : { background: '#fef2f2', borderColor: '#fecaca' }}>
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} style={{ color: darkMode ? '#f87171' : '#dc2626', flexShrink: 0 }} />
                        <span className="text-sm font-medium" style={{ color: darkMode ? '#fca5a5' : '#b91c1c' }}>{explorationError}</span>
                      </div>
                    </div>
                  )}
                  <button onClick={handleAnalyze}
                    disabled={isAnalyzing || !filterInovasi1 || !filterInovasi2}
                    className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                      isAnalyzing || !filterInovasi1 || !filterInovasi2
                        ? darkMode ? 'bg-purple-900/60 text-white cursor-not-allowed border border-purple-700' : 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-purple-500 text-white hover:bg-purple-600'
                    }`}>
                    {isAnalyzing ? <><Loader2 className="animate-spin" size={20} /> Menganalisis...</> : <><Sparkles size={20} /> Analisis dengan AI</>}
                  </button>
                </>
              )}
            </div>
          </section>
        </div>

        {/* ============= EXPLORATION RESULT ============= */}
        {showExplorationResult && selectedExploration && (
          <div className="rounded-3xl p-3 bg-white/40 dark:bg-gray-900/40">
            <div ref={explorationResultRef}>
              <section className={`rounded-2xl shadow-2xl overflow-hidden animate-fadeIn ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>

                {/* Header */}
                <div style={{ backgroundColor: '#a855f7', padding: '24px' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={20} className="text-white flex-shrink-0" />
                        <span className="text-sm font-medium text-white opacity-90">Hasil Analisis AI</span>
                      </div>
                      <h4 className="text-xl font-bold text-white mb-3 leading-snug">{selectedExploration.title}</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedExploration.opd1 && <span className="px-3 py-1 bg-white/20 rounded-full text-sm text-white font-medium border border-white/30">{selectedExploration.opd1}</span>}
                        {selectedExploration.opd2 && <span className="px-3 py-1 bg-white/20 rounded-full text-sm text-white font-medium border border-white/30">{selectedExploration.opd2}</span>}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-center">
                      <div className="bg-white text-purple-700 px-4 py-2 rounded-xl text-2xl font-extrabold shadow-md">{Math.round(selectedExploration.score * 100)}%</div>
                      <div className="text-xs mt-1.5 text-white font-semibold opacity-90">Skor Kecocokan</div>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">

                  {/* ===== DETAIL INOVASI ===== */}
                  <div>
                    <h5 className={`font-bold mb-4 flex items-center gap-2 text-base ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      <BookOpen size={18} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
                      Detail Inovasi
                    </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {[
                          {
                            judul: selectedExploration.judul1,
                            opd: selectedExploration.opd1,
                            urusan: selectedExploration.urusan1,
                            tahap: selectedExploration.tahap1,
                            tanggal: selectedExploration.tanggal_penerapan_1,
                            deskripsi: selectedExploration.deskripsi1,
                            label: 'Inovasi 1',
                            color: 'blue' as const,
                            headerBg: darkMode ? 'bg-blue-900/50 border-blue-700' : 'bg-blue-50 border-blue-200',
                            labelColor: darkMode ? 'text-blue-300' : 'text-blue-600',
                          },
                          {
                            judul: selectedExploration.judul2,
                            opd: selectedExploration.opd2,
                            urusan: selectedExploration.urusan2,
                            tahap: selectedExploration.tahap2,
                            tanggal: selectedExploration.tanggal_penerapan_2,
                            deskripsi: selectedExploration.deskripsi2,
                            label: 'Inovasi 2',
                            color: 'blue' as const,
                            headerBg: darkMode ? 'bg-blue-900/50 border-blue-700' : 'bg-blue-50 border-blue-200',
                            labelColor: darkMode ? 'text-blue-300' : 'text-blue-600',
                          },
                        ].map(({ judul, opd, urusan, tahap, tanggal, deskripsi, label, color, headerBg, labelColor }) => (
                          <div key={label} className={`rounded-xl border overflow-hidden ${darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
                            <div className={`px-4 py-3 border-b ${headerBg}`}>
                              <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${labelColor}`}>{label}</p>
                              <p className={`text-sm font-bold leading-snug ${darkMode ? 'text-white' : 'text-gray-800'}`}>{judul}</p>
                            </div>
                            <div className="px-4 pt-3 pb-2 space-y-2 text-sm">
                              {opd && (
                                <div className="flex items-start gap-2">
                                  <span className={`font-medium flex-shrink-0 w-28 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>OPD:</span>
                                  <span className={darkMode ? 'text-gray-200' : 'text-gray-700'}>{opd}</span>
                                </div>
                              )}
                              {urusan && (
                                <div className="flex items-start gap-2">
                                  <span className={`font-medium flex-shrink-0 w-28 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Urusan:</span>
                                  <span className={darkMode ? 'text-gray-200' : 'text-gray-700'}>{urusan}</span>
                                </div>
                              )}
                              {tahap && (
                                <div className="flex items-start gap-2">
                                  <span className={`font-medium flex-shrink-0 w-28 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tahap:</span>
                                  <span className={darkMode ? 'text-gray-200' : 'text-gray-700'}>{tahap}</span>
                                </div>
                              )}
                              <div className="flex items-start gap-2">
                                <span className={`font-medium flex-shrink-0 w-28 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tgl. Penerapan:</span>
                                <span className={darkMode ? 'text-gray-200' : 'text-gray-700'}>
                                  {tanggal ? new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                </span>
                              </div>
                            </div>
                            {deskripsi && (
                              <div className="px-4 pb-4">
                                <DeskripsiInovasi deskripsi={deskripsi} label={label} color={color} darkMode={darkMode} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                  {/* Tingkat + Judul Kolaborasi */}
                  <div className={`p-4 rounded-xl ${darkMode ? 'bg-purple-900/20 border border-purple-600' : 'bg-purple-50 border-2 border-purple-400'}`}>
                    <p className={`text-base font-bold mb-2 leading-snug ${darkMode ? 'text-white' : 'text-gray-800'}`}>🤝 {selectedExploration.title}</p>
                    <p className={`text-sm font-semibold ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                      Tingkat Kolaborasi: <span className="font-bold">{selectedExploration.tingkat}</span>
                    </p>
                  </div>

                  {/* Alasan Sinergi — dipecah paragraf, rata kanan-kiri */}
                  <div>
                    <h5 className={`font-semibold mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}
                      style={{ paddingLeft: '10px', borderLeft: '4px solid #3B82F6' }}>
                      🔗 Alasan Sinergi
                    </h5>
                    <div className={`rounded-lg p-4 border-2 ${darkMode ? 'border-blue-700 bg-blue-900/20' : 'border-blue-300 bg-blue-50'}`}>
                      {formatDeskripsiParagraphs(selectedExploration.alasan).map((para, i, arr) => (
                        <p key={i} className={`text-sm leading-relaxed text-justify ${i < arr.length - 1 ? 'mb-3' : ''} ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {para}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Manfaat */}
                  <div>
                    <h5 className={`font-semibold mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}
                      style={{ paddingLeft: '10px', borderLeft: '4px solid #16A34A' }}>
                      ✅ Manfaat Kolaborasi
                    </h5>
                    <div className="space-y-2">
                      {selectedExploration.manfaat.map((m, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${darkMode ? 'bg-green-900/20 border-green-700/30' : 'bg-green-50 border-green-200'}`}>
                          <span className="flex-shrink-0 text-lg leading-none mt-0.5">✅</span>
                          <span className={`leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dampak */}
                  <div>
                    <h5 className={`font-semibold mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}
                      style={{ paddingLeft: '10px', borderLeft: '4px solid #3B82F6' }}>
                      ⚡ Potensi Dampak
                    </h5>
                    <div className="space-y-2">
                      {selectedExploration.dampak.map((d, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${darkMode ? 'bg-blue-900/20 border-blue-700/30' : 'bg-blue-50 border-blue-200'}`}>
                          <span className="flex-shrink-0 text-lg leading-none mt-0.5">⚡</span>
                          <span className={`leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Langkah Selanjutnya */}
                  <div>
                    <h5 className={`font-semibold mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}
                      style={{ paddingLeft: '10px', borderLeft: '4px solid #EAB308' }}>
                      💡 Langkah Selanjutnya
                    </h5>
                    <div className="space-y-2">
                      {[
                        'Koordinasikan pertemuan antara pihak-pihak terkait untuk membahas kolaborasi',
                        'Buat proposal kolaborasi dengan detail manfaat dan target capaian yang terukur',
                        'Susun timeline implementasi dan alokasi sumber daya',
                        'Monitor dan evaluasi progress kolaborasi secara berkala',
                      ].map((step, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${darkMode ? 'bg-yellow-900/20 border-yellow-700/30' : 'bg-yellow-50 border-yellow-200'}`}>
                          <Lightbulb size={18} className={`flex-shrink-0 mt-0.5 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
                          <span className={`leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 pt-0">
                  <button
                    onClick={() => setPdfData({
                      inovasi_1: {
                        judul: selectedExploration.judul1,
                        opd: selectedExploration.opd1,
                        urusan: selectedExploration.urusan1,
                        tahap: selectedExploration.tahap1,
                        tanggal_penerapan: selectedExploration.tanggal_penerapan_1,
                        deskripsi: selectedExploration.deskripsi1 || '',
                      },
                      inovasi_2: {
                        judul: selectedExploration.judul2,
                        opd: selectedExploration.opd2,
                        urusan: selectedExploration.urusan2,
                        tahap: selectedExploration.tahap2,
                        tanggal_penerapan: selectedExploration.tanggal_penerapan_2,
                        deskripsi: selectedExploration.deskripsi2 || '',
                      },
                      skor_kecocokan: Math.round(selectedExploration.score * 100),
                      kategori: getScoreLabel(selectedExploration.score),
                      hasil_ai: {
                        judul_kolaborasi: selectedExploration.title,
                        tingkat_kolaborasi: selectedExploration.tingkat,
                        manfaat: selectedExploration.manfaat,
                        alasan: [selectedExploration.alasan],
                        dampak: selectedExploration.dampak,
                      },
                    })}
                    className="w-full flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium shadow"
                  >
                    <FileDown size={16} /> Export PDF Hasil Eksplorasi
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ============= SECTION 3: CHATBOT ============= */}
        <div className="rounded-3xl p-3 bg-white/40 dark:bg-gray-900/40">
          <section className={`rounded-2xl shadow-xl overflow-hidden ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white p-2 rounded-lg"><Bot className="text-green-600" size={24} /></div>
                <div>
                  <h3 className="font-bold text-xl">AI Assistant BRIDA</h3>
                  <p className="text-sm text-green-100">{isSendingMessage ? 'Mengetik...' : 'Online - Siap Membantu'}</p>
                </div>
              </div>
              <p className="text-sm text-green-50 mt-2">Tanyakan tentang inovasi daerah Jawa Timur</p>
            </div>

            <div className="overflow-y-auto p-6 space-y-4" style={{ minHeight: '400px', maxHeight: '600px' }}>
              {messages.length === 0 && (
                <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Bot size={56} className="mx-auto mb-4 opacity-50" />
                  <p className="text-base mb-2 font-semibold">Selamat datang di AI Assistant BRIDA!</p>
                  <p className="text-sm">Ketik pertanyaan Anda atau pilih contoh pertanyaan di bawah</p>
                </div>
              )}
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.type === 'typing' ? (
                    <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}><TypingIndicator /></div>
                  ) : message.type === 'error' ? (
                    <div className="max-w-[85%] rounded-lg p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700">
                      <div className="flex items-start gap-2 mb-3">
                        <AlertCircle size={18} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-red-800 dark:text-red-200 font-semibold mb-1">Terjadi Kesalahan</p>
                          <p className="text-sm text-red-700 dark:text-red-300">{message.text}</p>
                        </div>
                      </div>
                      <button onClick={handleRetry} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors">
                        <RefreshCw size={14} /> Coba Lagi
                      </button>
                    </div>
                  ) : (
                    <div className={`max-w-[85%] rounded-lg p-4 ${message.type === 'user' ? 'bg-green-500 text-white' : darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
                      {message.type === 'bot' && (
                        <div className="flex items-center gap-2 mb-2">
                          <Bot size={16} className="text-green-500 flex-shrink-0" />
                          <span className="text-sm font-semibold text-green-500">BRIDA AI</span>
                        </div>
                      )}
                      {message.type === 'bot'
                        ? <div className="space-y-2">{formatBotMessage(message.text, darkMode)}</div>
                        : <p className="text-sm leading-relaxed whitespace-pre-line break-words">{message.text}</p>
                      }
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className={`p-6 border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
              <div className="mb-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {suggestedPrompts.map((prompt, idx) => (
                  <button key={idx} onClick={() => handleSend(prompt)} disabled={isSendingMessage}
                    className={`text-left px-3 py-2 rounded-lg text-xs transition-all ${
                      darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 hover:border-green-500' : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-green-400 hover:shadow-sm'
                    } ${isSendingMessage ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}`}>
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isSendingMessage && handleSend()}
                  placeholder="Tanyakan tentang inovasi..." disabled={isSendingMessage}
                  className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800'
                  } ${isSendingMessage ? 'opacity-50 cursor-not-allowed' : ''}`} />
                <button onClick={() => handleSend()} disabled={!input.trim() || isSendingMessage}
                  className={`px-6 py-3 rounded-lg transition-colors flex items-center justify-center ${input.trim() && !isSendingMessage ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}>
                  {isSendingMessage ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </div>
            </div>
          </section>
        </div>

      </div>

      {pdfData && <ReportCollaboration onClose={() => setPdfData(null)} data={pdfData} />}
      {selectedPdfRecommendation && <ReportAIRecommendation onClose={() => setSelectedPdfRecommendation(null)} data={selectedPdfRecommendation} />}
    </div>
  );
}

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <AIChatbot darkMode={darkMode} />
    </div>
  );
}
