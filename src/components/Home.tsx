import { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, Cell
} from 'recharts';
import {
  TrendingUp, Award, Sparkles, Calendar,
  FileDown, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import { SkeletonLoader } from './SkeletonLoader';
import { ReportDashboard } from './ReportDashboard';

const API_URL = import.meta.env.VITE_API_URL;
const AUTO_REFRESH_MS = 5 * 60 * 1000; // auto-refresh setiap 5 menit

interface HomeProps {
  darkMode: boolean;
}

const MONTHS = [
  { num: 1, label: 'Jan' },
  { num: 2, label: 'Feb' },
  { num: 3, label: 'Mar' },
  { num: 4, label: 'Apr' },
  { num: 5, label: 'Mei' },
  { num: 6, label: 'Jun' },
  { num: 7, label: 'Jul' },
  { num: 8, label: 'Agu' },
  { num: 9, label: 'Sep' },
  { num: 10, label: 'Okt' },
  { num: 11, label: 'Nov' },
  { num: 12, label: 'Des' },
];

export function Home({ darkMode }: HomeProps) {

  // ================== STATE ==================
  const [selectedYear, setSelectedYear] = useState<'all' | number>('all');
  const [availableYears, setAvailableYears] = useState<number[]>([]); // ← dinamis dari API
  const [trendData, setTrendData] = useState<any[]>([]);
  const [maturityData, setMaturityData] = useState<any[]>([]);
  const [topOPD, setTopOPD] = useState<any[]>([]);
  const [topUrusan, setTopUrusan] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState(false);
  const [loading, setLoading] = useState(true);

  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showReport, setShowReport] = useState(false);

  // ================== FETCH DASHBOARD ==================
  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const [maturityRes, opdRes, urusanRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/dashboard/maturity`),
        fetch(`${API_URL}/dashboard/top-opd`),
        fetch(`${API_URL}/dashboard/top-urusan`),
        fetch(`${API_URL}/dashboard/stats`),
      ]);

      const maturityRaw = await maturityRes.json();
      const opdRaw      = await opdRes.json();
      const urusanRaw   = await urusanRes.json();
      const stat        = await statsRes.json();

      setMaturityData(maturityRaw.map((d: any) => ({ level: d.level, jumlah: Number(d.jumlah) })));
      setTopOPD(opdRaw.map((d: any) => ({ name: d.name, jumlah: Number(d.jumlah) })));
      setTopUrusan(urusanRaw.map((d: any) => ({ name: d.name, jumlah: Number(d.jumlah) })));

      setStats([
        { icon: TrendingUp, title: 'Total Inovasi',          value: stat.total_inovasi    },
        { icon: Award,      title: 'Rata-rata Kematangan',   value: stat.rata_kematangan  },
        { icon: Sparkles,   title: 'Inovasi Digital',        value: stat.inovasi_digital  },
        { icon: Calendar,   title: 'Inovasi Baru Tahun Ini', value: stat.inovasi_tahun_ini },
      ]);

    } catch (err) {
      console.error("Gagal load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  // ================== FETCH TREND + TAHUN DINAMIS ==================
  const fetchTrend = async (year: 'all' | number) => {
    try {
      if (year === 'all') {
        const res = await fetch(`${API_URL}/dashboard/trend`);
        const raw = await res.json();

        const normalized = raw.map((d: any) => ({
          tahun:      Number(d.tahun),
          digital:    Number(d.digital),
          nondigital: Number(d.nondigital ?? 0),
          teknologi:  Number(d.teknologi),
        }));

        setTrendData(normalized);

        // ← ambil daftar tahun dari data yang ada, urutkan ascending
        const years = [...new Set(normalized.map((d: any) => d.tahun as number))]
          .sort((a, b) => a - b);
        setAvailableYears(years);

      } else {
        const res = await fetch(`${API_URL}/dashboard/trend?tahun=${year}`);
        const raw = await res.json();

        const normalized = MONTHS.map(m => {
          const found = raw.find((d: any) => Number(d.bulan) === m.num);
          return {
            bulan:      m.label,
            digital:    found ? Number(found.digital)           : 0,
            nondigital: found ? Number(found.nondigital ?? 0)   : 0,
            teknologi:  found ? Number(found.teknologi)         : 0,
          };
        });

        setTrendData(normalized);
      }
    } catch (err) {
      console.error('Gagal load trend:', err);
      setTrendData([]);
    }
  };

  // ================== FETCH AI INSIGHT ==================
  const fetchAIInsight = async (forceRefresh = false) => {
    try {
      setAiLoading(true);
      setAiError(false);
      const url = forceRefresh
        ? `${API_URL}/dashboard/ai-insight?force_refresh=true`
        : `${API_URL}/dashboard/ai-insight`;
      const res  = await fetch(url);
      const data = await res.json();
      const insights = Array.isArray(data) ? data : (data.insights ?? []);
      setAiInsights(insights);
    } catch (err) {
      console.error("Gagal load AI Insight:", err);
      setAiError(true);
      setAiInsights([{ icon: "⚠️", text: "AI Insight tidak dapat dimuat saat ini", type: "warning" }]);
    } finally {
      setAiLoading(false);
    }
  };

  // ================== MOUNT — fetch semua data ==================
  useEffect(() => {
    fetchDashboard();
    fetchTrend('all');
    fetchAIInsight(false);
  }, []);

  // ================== AUTO-REFRESH setiap 5 menit ==================
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboard();
      fetchTrend(selectedYear); // refresh trend sesuai filter aktif
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [selectedYear]); // restart interval kalau filter tahun berubah

  // ================== FILTER TAHUN BERUBAH ==================
  useEffect(() => {
    fetchTrend(selectedYear);
  }, [selectedYear]);

  // ================== SCROLL ==================
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      const newPosition = direction === 'left'
        ? scrollPosition - scrollAmount
        : scrollPosition + scrollAmount;
      scrollContainerRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  // ================== LOADING ==================
  if (loading) return <SkeletonLoader />;

  return (
    <div className="space-y-4 md:space-y-6 max-w-full pb-6 overflow-x-hidden">

      {/* Summary Cards */}
      <div>
        <h2 className={`text-base md:text-lg font-bold mb-3 md:mb-4 ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>
          Ringkasan Statistik Inovasi
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className={`rounded-lg shadow-md p-3 md:p-4 transition-all hover:scale-105 cursor-pointer ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center justify-between mb-2">
                  <Icon className="text-[#2563EB]" size={20} />
                </div>
                <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>{stat.title}</p>
                <p className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{stat.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts */}
      <div>
        <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>
          Analisis Data Inovasi
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">

          {/* Trend Chart */}
          <div className={`rounded-lg shadow-md p-4 md:p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
              <h3 className={`text-base md:text-lg font-bold ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>
                {selectedYear === 'all'
                  ? 'Tren Penerapan Inovasi Per Tahun'
                  : `Tren Penerapan Inovasi Per Bulan (${selectedYear})`}
              </h3>
              <div className="flex items-center gap-2">
                <Filter size={16} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  <option value="all">Semua Tahun</option>
                  {/* ← tahun dinamis dari data, otomatis tambah 2026, 2027, dst */}
                  {availableYears.map(year => (
                    <option key={year} value={year}>Tahun {year}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="w-full h-[300px] md:h-[350px]">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis
                      dataKey={selectedYear === 'all' ? 'tahun' : 'bulan'}
                      stroke={darkMode ? '#9ca3af' : '#6b7280'}
                      style={{ fontSize: '12px' }}
                      interval={0}
                      label={{ value: selectedYear === 'all' ? 'Tahun' : 'Bulan', position: 'insideBottom', offset: -10, fill: darkMode ? '#9ca3af' : '#6b7280' }}
                    />
                    <YAxis
                      stroke={darkMode ? '#9ca3af' : '#6b7280'}
                      style={{ fontSize: '12px' }}
                      label={{ value: 'Jumlah Inovasi', angle: -90, position: 'insideLeft', fill: darkMode ? '#9ca3af' : '#6b7280', style: { textAnchor: 'middle' }, offset: 10 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, color: darkMode ? '#ffffff' : '#000000', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                      labelFormatter={value => selectedYear === 'all' ? `Tahun ${value}` : `${value} ${selectedYear}`}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
                    <Line type="monotone" dataKey="digital"    stroke="#2563EB" strokeWidth={3} name="Digital"     dot={{ fill: '#2563EB', r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="nondigital" stroke="#10b981" strokeWidth={3} name="Non-Digital"  dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="teknologi"  stroke="#f59e0b" strokeWidth={3} name="Teknologi"   dot={{ fill: '#f59e0b', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className={`flex items-center justify-center h-full ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <div className="text-center">
                    <p className="text-lg font-medium mb-2">Tidak ada data</p>
                    <p className="text-sm">{selectedYear === 'all' ? 'Data tidak tersedia' : `Tidak ada data untuk tahun ${selectedYear}`}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Maturity Distribution */}
          <div className={`rounded-lg shadow-md p-4 md:p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-base md:text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>
              Jumlah Inovasi Berdasarkan Tahapan
            </h3>
            <div className="w-full h-[300px] md:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maturityData} barSize={60} margin={{ top: 20, right: 30, left: 60, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis dataKey="level" stroke={darkMode ? '#9ca3af' : '#6b7280'} style={{ fontSize: '12px' }} interval={0} label={{ value: 'Tahapan Inovasi', position: 'insideBottom', offset: -15, fill: darkMode ? '#9ca3af' : '#6b7280' }} />
                  <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} style={{ fontSize: '12px' }} label={{ value: 'Jumlah Inovasi', angle: -90, position: 'center', fill: darkMode ? '#9ca3af' : '#6b7280', style: { textAnchor: 'middle' }, dx: -25 }} />
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, color: darkMode ? '#ffffff' : '#000000' }} />
                  <Bar dataKey="jumlah" fill="#2563EB" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Top OPD & Urusan */}
      <div>
        <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>
          Kinerja Perangkat Daerah dan Fokus Sektor Unggulan
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`rounded-lg shadow-md p-4 md:p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-base md:text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>Top 5 OPD Berdasarkan Jumlah Inovasi</h3>
            <div className="w-full h-[300px] md:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topOPD} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 30 }} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis type="number" stroke={darkMode ? '#9ca3af' : '#6b7280'} style={{ fontSize: '12px' }} label={{ value: 'Jumlah Inovasi', position: 'insideBottom', offset: -10, fill: darkMode ? '#9ca3af' : '#6b7280', dy: 10 }} />
                  <YAxis dataKey="name" type="category" stroke={darkMode ? '#9ca3af' : '#6b7280'} width={240} style={{ fontSize: '11px' }} label={{ value: 'OPD', angle: -90, position: 'insideLeft', fill: darkMode ? '#9ca3af' : '#6b7280', style: { textAnchor: 'middle' }, dx: -30 }} />
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, color: darkMode ? '#ffffff' : '#000000' }} />
                  <Bar dataKey="jumlah" radius={[0, 8, 8, 0]} fill="#2563EB" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className={`rounded-lg shadow-md p-4 md:p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-base md:text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>Top 5 Urusan Berdasarkan Jumlah Inovasi</h3>
            <div className="w-full h-[300px] md:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topUrusan} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 30 }} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis type="number" stroke={darkMode ? '#9ca3af' : '#6b7280'} style={{ fontSize: '12px' }} label={{ value: 'Jumlah Inovasi', position: 'insideBottom', offset: -10, fill: darkMode ? '#9ca3af' : '#6b7280', dy: 10 }} />
                  <YAxis dataKey="name" type="category" stroke={darkMode ? '#9ca3af' : '#6b7280'} width={200} style={{ fontSize: '11px' }} label={{ value: 'Urusan', angle: -90, position: 'insideLeft', fill: darkMode ? '#9ca3af' : '#6b7280', style: { textAnchor: 'middle' }, dx: -5 }} />
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, color: darkMode ? '#ffffff' : '#000000' }} />
                  <Bar dataKey="jumlah" radius={[0, 8, 8, 0]} fill="#2563EB" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* AI Auto Insight */}
      <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>
            <span></span> AI Auto Insight
            {aiLoading && (
              <span className="text-sm font-normal text-blue-500 flex items-center gap-1">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Analyzing...
              </span>
            )}
          </h3>
          <div className="flex gap-2">
            <button onClick={() => fetchAIInsight(true)} disabled={aiLoading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed">
              <svg className={`w-4 h-4 ${aiLoading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {aiLoading ? 'Loading...' : 'Refresh AI'}
            </button>
            <button onClick={() => scroll('left')} className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
              <ChevronLeft size={20} className={darkMode ? 'text-white' : 'text-[#0F172A]'} />
            </button>
            <button onClick={() => scroll('right')} className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
              <ChevronRight size={20} className={darkMode ? 'text-white' : 'text-[#0F172A]'} />
            </button>
          </div>
        </div>
        <div ref={scrollContainerRef} className="flex gap-4 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {aiLoading ? (
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>AI sedang menganalisis data inovasi...</div>
          ) : (
            (Array.isArray(aiInsights) ? aiInsights : []).map((insight, index) => (
              <div key={index} className={`flex-shrink-0 w-80 p-4 rounded-lg border-l-4 transition-transform hover:-translate-y-1 ${insight.type === 'success' ? 'border-green-500' : insight.type === 'warning' ? 'border-yellow-500' : 'border-blue-500'} ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{insight.icon}</span>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-[#64748B]'}`}>{insight.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className={`text-xs text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Powered by <span className="font-semibold">Google Gemini</span> • Cache diperbarui setiap hari
          </p>
        </div>
      </div>

      {/* Export Report */}
      <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>Executive Summary Report</h3>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-[#64748B]'}`}>Download laporan ringkasan eksekutif lengkap dalam format PDF</p>
          </div>
          <button onClick={() => setShowReport(true)}
            className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-3 rounded-lg transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
            <FileDown size={20} />
            <span className="font-medium">Export PDF</span>
          </button>
        </div>
      </div>

      {showReport && <ReportDashboard onClose={() => setShowReport(false)} />}
    </div>
  );
}
