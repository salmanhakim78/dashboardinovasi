import { useState, useEffect, useRef } from 'react';
import { 
  Filter, Download, RotateCcw, AlertTriangle, Loader2, 
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { supabase } from '../lib/supabase';
import { ReportAnalytics } from './ReportAnalytics';

interface AnalyticsProps {
  darkMode: boolean;
}

interface UrusanTahapanData {
  urusan: string;
  inisiatif: number;
  ujiCoba: number;
  penerapan: number;
  total: number;
}

interface JenisData {
  name: string;
  value: number;
  color: string;
}

interface BentukInisiatorData {
  inisiator: string;
  [key: string]: any;
}

interface WatchlistItem {
  nama: string;
  inisiator: string;
  tahunPenerapan: number;
  skorKematangan: number;
}

export function Analytics({ darkMode }: AnalyticsProps) {

  const [filterTahun, setFilterTahun] = useState('Semua');
  const [tahunOptions, setTahunOptions] = useState<string[]>([]);

  const [urusanTahapanData, setUrusanTahapanData] = useState<UrusanTahapanData[]>([]);
  const [jenisInovasiData, setJenisInovasiData] = useState<JenisData[]>([]);
  const [bentukInisiatorData, setBentukInisiatorData] = useState<BentukInisiatorData[]>([]);
  const [watchlistData, setWatchlistData] = useState<WatchlistItem[]>([]);

  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // NEW: Pagination untuk Watchlist
  const [watchlistPage, setWatchlistPage] = useState(1);
  const watchlistPerPage = 10;

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchChartData();
  }, [filterTahun]);

  useEffect(() => {
    if (!loading && urusanTahapanData.length > 0 && jenisInovasiData.length > 0) {
      const timer = setTimeout(() => {
        fetchAIInsights(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loading, urusanTahapanData, jenisInovasiData]);

  const fetchFilterOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('data_inovasi')
        .select('tanggal_penerapan');
      if (error) throw error;
      if (data) {
        const tahun = [...new Set(
          data
            .map(item => item.tanggal_penerapan?.substring(0, 4))
            .filter(Boolean)
        )].sort((a, b) => Number(b) - Number(a));
        setTahunOptions(tahun);
      }
    } catch (err: any) {
      console.error('Error fetching filter options:', err);
    }
  };

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase.from('data_inovasi').select('*');
      if (filterTahun !== 'Semua') {
        query = query
          .gte('tanggal_penerapan', `${filterTahun}-01-01`)
          .lte('tanggal_penerapan', `${filterTahun}-12-31`);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        processUrusanTahapanData(data);
        processJenisData(data);
        processBentukInisiatorData(data);
        processWatchlistData(data);
      }
    } catch (err: any) {
      console.error('Error fetching chart data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper: cache_key harian, format "analytics_Semua_2026-02-19"
  const buildCacheKey = (tahun: string) => {
    const today = new Date().toISOString().substring(0, 10);
    return `analytics_${tahun}_${today}`;
  };

  // FETCH: Cek cache harian dulu, generate baru jika belum ada
  const fetchAIInsights = async (forceRefresh = false) => {
    if (jenisInovasiData.length === 0) return;

    try {
      setAiLoading(true);
      setAiError(null);

      const cacheKey = buildCacheKey(filterTahun);

      // Cek cache hari ini (skip jika force refresh)
      if (!forceRefresh) {
        const { data: cached } = await supabase
          .from('ai_insight_cache')
          .select('insight_data')
          .eq('insight_type', 'analytics')
          .eq('cache_key', cacheKey)
          .maybeSingle();

        if (cached?.insight_data) {
          const cachedInsights = Array.isArray(cached.insight_data)
            ? cached.insight_data
            : JSON.parse(cached.insight_data);
          if (cachedInsights.length > 0) {
            setAiInsights(cachedInsights);
            console.log('✅ Loaded from cache:', cacheKey);
            return;
          }
        }
      }

      // Generate dari AI
      const totalInovasi = jenisInovasiData.reduce((sum, item) => sum + item.value, 0);
      const digitalCount = jenisInovasiData.find(j => j.name === 'Digital')?.value || 0;
      const digitalPercent = totalInovasi > 0
        ? parseFloat(((digitalCount / totalInovasi) * 100).toFixed(1))
        : 0;
      const watchlistCount = watchlistData.length;
      const topUrusan = urusanTahapanData[0]?.urusan || 'N/A';

      const requestData = {
        summary: { totalInovasi, digitalCount, digitalPercent, topUrusan, watchlistCount, tahun: filterTahun },
        top5Urusan: urusanTahapanData.map(u => ({
          nama: u.urusan, total: u.total,
          breakdown: { inisiatif: u.inisiatif, ujiCoba: u.ujiCoba, penerapan: u.penerapan },
        })),
        jenisInovasi: jenisInovasiData.map(j => ({
          jenis: j.name, jumlah: j.value,
          persentase: totalInovasi > 0 ? ((j.value / totalInovasi) * 100).toFixed(1) : '0',
        })),
        watchlist: {
          count: watchlistCount,
          items: watchlistData.slice(0, 5).map(w => ({ nama: w.nama, skor: w.skorKematangan })),
        },
      };

      console.log('📤 Calling Edge Function...');
      const { data, error } = await supabase.functions.invoke('ai-insight', {
        body: { data: requestData },
      });

      if (error) throw new Error(error.message || 'Edge Function error');

      if (Array.isArray(data) && data.length > 0) {
        const valid = data.filter((i: any) => i?.icon && i?.type && i?.text);
        if (valid.length > 0) {
          setAiInsights(valid);
          console.log('✅ Insights generated:', valid.length);
          await saveAIInsightsToCache(valid, cacheKey);
          return;
        }
      }

      throw new Error('Format respons tidak valid');

    } catch (err: any) {
      console.error('❌ AI Error:', err.message);
      setAiError(err.message);

      const fbTotal = jenisInovasiData.reduce((sum, item) => sum + item.value, 0);
      const fbDigital = jenisInovasiData.find(j => j.name === 'Digital')?.value || 0;
      const fbNonDigital = jenisInovasiData.find(j => j.name === 'Non Digital')?.value || 0;
      const fbPct = fbTotal > 0 ? ((fbDigital / fbTotal) * 100).toFixed(1) : '0';
      const fbTopSektor = urusanTahapanData[0]?.urusan || 'N/A';
      const fbTopTotal = urusanTahapanData[0]?.total || 0;
      const fbTopPct = fbTotal > 0 ? ((fbTopTotal / fbTotal) * 100).toFixed(1) : '0';
      const fbWatchlist = watchlistData.length;
      const fbScores = watchlistData.map(w => w.skorKematangan);
      const fbAvgScore = fbScores.length > 0
        ? (fbScores.reduce((a, b) => a + b, 0) / fbScores.length).toFixed(1) : '0';

      const fallbackInsights = [
        { icon: '📊', type: 'info',
          text: `Total ${fbTotal} inovasi, digitalisasi ${fbPct}% (${fbDigital} dari ${fbTotal}).` },
        { icon: '🏆', type: 'success',
          text: `${fbTopSektor} mendominasi ${fbTopPct}% (${fbTopTotal} inovasi) dari total ekosistem daerah.` },
        { icon: fbWatchlist > 0 ? '⚠️' : '✅',
          type: fbWatchlist > 0 ? 'warning' : 'success',
          text: fbWatchlist > 0
            ? `Kritis: ${fbWatchlist} inovasi skor kematangan rata-rata ${fbAvgScore}, butuh intervensi segera.`
            : 'Semua inovasi berkinerja baik, tidak ada yang masuk watchlist.' },
        { icon: '💡', type: 'info',
          text: `Gap: ${fbNonDigital} non-digital vs ${fbDigital} digital — dorong konversi ke platform digital.` },
        { icon: '🎯', type: 'success',
          text: `Target naikkan digitalisasi dari ${fbPct}% ke ${Math.min(parseFloat(fbPct) + 10, 100).toFixed(0)}% di periode berikutnya.` },
      ];

      setAiInsights(fallbackInsights);
      await saveAIInsightsToCache(fallbackInsights, buildCacheKey(filterTahun));
    } finally {
      setAiLoading(false);
    }
  };

  // SAVE: ke tabel ai_insight_cache (kolom: insight_type, cache_key, insight_data jsonb, created_at)
  const saveAIInsightsToCache = async (insights: any[], cacheKey: string) => {
    try {
      const { error } = await supabase
        .from('ai_insight_cache')
        .upsert(
          {
            insight_type: 'analytics',
            cache_key: cacheKey,
            insight_data: insights,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'cache_key' }
        );
      if (error) {
        console.error('Error saving insights to cache:', error);
      } else {
        console.log('✅ AI Insights saved:', cacheKey);
      }
    } catch (err) {
      console.error('Error in saveAIInsightsToCache:', err);
    }
  };

  const processUrusanTahapanData = (data: any[]) => {
    const grouped: { [key: string]: { inisiatif: number; ujiCoba: number; penerapan: number } } = {};
    data.forEach(item => {
      if (!item.urusan_utama) return;
      if (!grouped[item.urusan_utama]) {
        grouped[item.urusan_utama] = { inisiatif: 0, ujiCoba: 0, penerapan: 0 };
      }
      if (item.tahapan_inovasi === 'Inisiatif') grouped[item.urusan_utama].inisiatif++;
      else if (item.tahapan_inovasi === 'Uji Coba') grouped[item.urusan_utama].ujiCoba++;
      else if (item.tahapan_inovasi === 'Penerapan') grouped[item.urusan_utama].penerapan++;
    });
    const result = Object.entries(grouped)
      .map(([urusan, counts]) => ({
        urusan,
        inisiatif: counts.inisiatif,
        ujiCoba: counts.ujiCoba,
        penerapan: counts.penerapan,
        total: counts.inisiatif + counts.ujiCoba + counts.penerapan,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    setUrusanTahapanData(result);
  };

  const processJenisData = (data: any[]) => {
    const grouped: { [key: string]: number } = {};
    data.forEach(item => {
      if (!item.jenis) return;
      grouped[item.jenis] = (grouped[item.jenis] || 0) + 1;
    });
    const colors: { [key: string]: string } = {
      'Digital': '#6366f1',
      'Non Digital': '#10b981',
      'Teknologi': '#f59e0b',
    };
    const result = Object.entries(grouped).map(([name, value]) => ({
      name,
      value,
      color: colors[name] || '#6b7280',
    }));
    setJenisInovasiData(result);
  };

  const processBentukInisiatorData = (data: any[]) => {
    const grouped: { [inisiator: string]: { [bentuk: string]: number } } = {};
    const shortenBentuk = (bentuk: string) => {
      if (bentuk.includes('Pelayanan Publik')) return 'Pelayanan Publik';
      if (bentuk.includes('Tata Kelola')) return 'Tata Kelola';
      if (bentuk.includes('Lainnya')) return 'Lainnya';
      return bentuk;
    };
    data.forEach(item => {
      if (!item.inisiator || !item.bentuk_inovasi) return;
      if (!grouped[item.inisiator]) grouped[item.inisiator] = {};
      const bentukShort = shortenBentuk(item.bentuk_inovasi);
      grouped[item.inisiator][bentukShort] = (grouped[item.inisiator][bentukShort] || 0) + 1;
    });
    const result = Object.entries(grouped).map(([inisiator, bentukCounts]) => {
      const total = Object.values(bentukCounts).reduce((sum, count) => sum + count, 0);
      const percentages: any = { inisiator };
      Object.entries(bentukCounts).forEach(([bentuk, count]) => {
        percentages[bentuk] = count / total;
      });
      return percentages;
    });
    setBentukInisiatorData(result);
  };

  // ========================================
  // WATCHLIST: HANYA FILTER SKOR < 45
  // ========================================
  const processWatchlistData = (data: any[]) => {
    const lowPerformance = data.filter(item => {
      return item.kematangan < 45; // HANYA skor < 45
    });   
    const result = lowPerformance
      .map(item => ({
        nama: item.judul_inovasi,
        inisiator: item.admin_opd,
        tahunPenerapan: item.tanggal_penerapan
          ? parseInt(item.tanggal_penerapan.substring(0, 4))
          : '-',
        skorKematangan: item.kematangan,
      }))
      .sort((a, b) => a.skorKematangan - b.skorKematangan);
    setWatchlistData(result);
  };

  const resetFilter = () => setFilterTahun('Semua');

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { current } = scrollContainerRef;
      const scrollAmount = 340;
      direction === 'left'
        ? current.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
        : current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // NEW: Pagination helpers
  const totalWatchlistPages = Math.ceil(watchlistData.length / watchlistPerPage);
  const paginatedWatchlist = watchlistData.slice(
    (watchlistPage - 1) * watchlistPerPage,
    watchlistPage * watchlistPerPage
  );

  if (loading && urusanTahapanData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className={`animate-spin mx-auto mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`} size={48} />
          <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Memuat data analitik...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className={`text-center p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg max-w-md`}>
          <AlertTriangle className="text-red-500 mx-auto mb-4" size={48} />
          <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Gagal Memuat Data</h3>
          <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{error}</p>
          <button onClick={fetchChartData} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-6 max-w-full overflow-x-hidden">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Analitik Inovasi
        </h2>
        <button
          onClick={() => setShowReport(true)}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Download size={18} />
          <span>Export Data</span>
        </button>
      </div>

      {/* Filter */}
      <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-blue-500" />
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Filter Data</h3>
          </div>
          <button
            onClick={resetFilter}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <RotateCcw size={16} />
            <span className="text-sm font-medium">Reset Filter</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tahun</label>
            <select
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
              }`}
            >
              <option>Semua</option>
              {tahunOptions.map(tahun => (
                <option key={tahun} value={tahun}>{tahun}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className={`text-lg font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Top 5 Urusan Berdasarkan Tahapan
          </h3>
          <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Status progres inovasi di setiap sektor urusan pemerintahan
          </p>
          {urusanTahapanData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={urusanTahapanData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 30, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                <XAxis
                  type="number"
                  stroke={darkMode ? '#9ca3af' : '#6b7280'}
                  label={{ value: 'Jumlah Inovasi', position: 'insideBottom', offset: -10, fill: darkMode ? '#9ca3af' : '#6b7280' }}
                />
                <YAxis
                  dataKey="urusan"
                  type="category"
                  width={140}
                  stroke={darkMode ? '#9ca3af' : '#6b7280'}
                  style={{ fontSize: '10px' }}
                  interval={0}
                  label={{ 
                    value: 'Urusan', 
                    angle: -90, 
                    position: 'insideLeft',
                    offset: -10,
                    fill: darkMode ? '#9ca3af' : '#6b7280',}}
                  />
                <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, color: darkMode ? '#ffffff' : '#000000' }} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '5px' }} />
                <Bar dataKey="inisiatif" stackId="a" fill="#ef4444" name="Inisiatif" />
                <Bar dataKey="ujiCoba"   stackId="a" fill="#f59e0b" name="Uji Coba" />
                <Bar dataKey="penerapan" stackId="a" fill="#10b981" name="Penerapan" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center">
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Tidak ada data untuk ditampilkan</p>
            </div>
          )}
        </div>

        <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Distribusi Jenis Inovasi
          </h3>
          {jenisInovasiData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={jenisInovasiData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  innerRadius={80}
                  outerRadius={130}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {jenisInovasiData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, color: darkMode ? '#ffffff' : '#000000' }} />
                <Legend />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className={`text-3xl font-bold ${darkMode ? 'fill-white' : 'fill-gray-800'}`}>
                  {jenisInovasiData.reduce((sum, item) => sum + item.value, 0)}
                </text>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center">
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Tidak ada data untuk ditampilkan</p>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <h3 className={`text-lg font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Komposisi Bentuk Inovasi per Inisiator
        </h3>
        <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Proporsi 100% dari setiap kategori inisiator berdasarkan bentuk inovasi
        </p>
        {bentukInisiatorData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={bentukInisiatorData}
              layout="vertical"
              stackOffset="expand"
              margin={{ top: 20, right: 30, left: 30, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
              <XAxis
                type="number"
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                stroke={darkMode ? '#9ca3af' : '#6b7280'}
                domain={[0, 1]}
                label={{ value: 'Persentase (%)', position: 'insideBottom', offset: -15, fill: darkMode ? '#9ca3af' : '#6b7280', dy: 10 }}
              />
              <YAxis
              dataKey="inisiator"
              type="category"
              width={110}
              stroke={darkMode ? '#9ca3af' : '#6b7280'}
              style={{ fontSize: '12px' }}
              label={{ 
                value: 'Inisiator', 
                angle: -90, 
                position: 'insideLeft',
                offset: -5,
                fill: darkMode ? '#9ca3af' : '#6b7280'}}
                />
              <YAxis
                dataKey="inisiator"
                type="category"
                width={110}
                stroke={darkMode ? '#9ca3af' : '#6b7280'}
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, color: darkMode ? '#ffffff' : '#000000' }}
                formatter={(value: any) => `${(value * 100).toFixed(1)}%`}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '5px' }} />
              {bentukInisiatorData.length > 0 && Object.keys(bentukInisiatorData[0])
                .filter(key => key !== 'inisiator')
                .map((bentuk, index) => {
                  const colors = ['#6366f1', '#10b981', '#f59e0b'];
                  return <Bar key={bentuk} dataKey={bentuk} stackId="a" fill={colors[index % colors.length]} name={bentuk} />;
                })}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[400px] flex items-center justify-center">
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Tidak ada data untuk ditampilkan</p>
          </div>
        )}
      </div>

      {/* Watchlist with Pagination */}
      <div className={`rounded-lg shadow-md overflow-hidden border-2 border-red-200 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`px-6 py-4 border-b ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-600" size={24} />
            <div>
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                🚨 Inovasi Perlu Perhatian (Low Performance)
              </h3>
              <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Total {watchlistData.length} inovasi dengan skor kematangan {' < '} 45 (Kurang Inovatif)
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {paginatedWatchlist.length > 0 ? (
            <>
              <table className="w-full">
                <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Nama Inovasi</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Inisiator/OPD</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Tahun Penerapan</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Skor Kematangan</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {paginatedWatchlist.map((item, index) => (
                    <tr key={index} className={`hover:${darkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors`}>
                      <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.nama}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.inisiator}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.tahunPenerapan}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-500 text-white">{item.skorKematangan}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalWatchlistPages > 1 && (
                <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Menampilkan {((watchlistPage - 1) * watchlistPerPage) + 1} - {Math.min(watchlistPage * watchlistPerPage, watchlistData.length)} dari {watchlistData.length} inovasi
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setWatchlistPage(p => Math.max(1, p - 1))}
                        disabled={watchlistPage === 1}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          watchlistPage === 1
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : darkMode
                            ? 'bg-gray-700 hover:bg-gray-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                        }`}
                      >
                        Previous
                      </button>
                      <span className={`px-3 py-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Page {watchlistPage} of {totalWatchlistPages}
                      </span>
                      <button
                        onClick={() => setWatchlistPage(p => Math.min(totalWatchlistPages, p + 1))}
                        disabled={watchlistPage === totalWatchlistPages}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          watchlistPage === totalWatchlistPages
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : darkMode
                            ? 'bg-gray-700 hover:bg-gray-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center">
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Tidak ada inovasi yang perlu perhatian khusus</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Auto Insight */}
      {!loading && !error && (
        <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              <span className="text-2xl"></span>AI Auto Insight
              {aiLoading && (
                <span className="flex items-center gap-2 text-sm font-normal text-blue-500">
                  <Loader2 className="animate-spin" size={16} />
                  Analyzing...
                </span>
              )}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => fetchAIInsights(true)}
                disabled={aiLoading}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  darkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <RotateCcw size={14} />
                {aiLoading ? 'Loading...' : 'Refresh AI'}
              </button>
              <button onClick={() => scroll('left')} className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
                <ChevronLeft size={20} className={darkMode ? 'text-white' : 'text-gray-800'} />
              </button>
              <button onClick={() => scroll('right')} className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
                <ChevronRight size={20} className={darkMode ? 'text-white' : 'text-gray-800'} />
              </button>
            </div>
          </div>

          {aiError && (
            <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-sm font-medium text-yellow-800">AI Insights Error</p>
                  <p className="text-xs text-yellow-700 mt-1">{aiError}</p>
                </div>
              </div>
            </div>
          )}

          {aiLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <Loader2 className={`animate-spin mx-auto mb-3 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} size={32} />
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  AI sedang menganalisis data inovasi...
                </p>
              </div>
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {aiInsights.length > 0 ? (
                aiInsights.map((insight, index) => (
                  <div
                    key={index}
                    className={`flex-shrink-0 w-80 p-4 rounded-lg border-l-4 transition-transform hover:-translate-y-1 ${
                      insight.type === 'success' ? 'border-green-500 bg-green-50/50' :
                      insight.type === 'warning' ? 'border-yellow-500 bg-yellow-50/50' :
                      'border-blue-400 bg-blue-50/50'
                    } ${darkMode ? 'bg-opacity-10' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{insight.icon}</span>
                      <p className={`text-sm font-medium leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        {insight.text}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center w-full h-32">
                  <div className="text-center">
                    <AlertTriangle className={`mx-auto mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} size={32} />
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      Tidak ada insight tersedia. Klik "Refresh AI" untuk generate.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className={`text-xs text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Powered by <span className="font-semibold">Google Gemini</span> via Supabase Edge Functions •
              Generated {aiInsights.length > 0 ? 'just now' : 'on demand'}
            </p>
          </div>
        </div>
      )}

      {showReport && <ReportAnalytics onClose={() => setShowReport(false)} filters={{ tahun: filterTahun }} />}

    </div>
  );
}