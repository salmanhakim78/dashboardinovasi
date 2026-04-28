import { useEffect, useState } from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import { supabase } from '../lib/supabase';
import logoBrida from '/images/logo-brida-jatim.png';

interface ReportAnalyticsProps {
  onClose: () => void;
  filters: { tahun: string };
}

interface UrusanData {
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
  percentage: number;
}

interface BentukData {
  inisiator: string;
  [key: string]: any;
}

interface WatchlistData {
  nama: string;
  inisiator: string;
  tahunPenerapan: number | string;
  skorKematangan: number;
}

interface AIInsight {
  icon: string;
  text: string;
  type: string;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 25,
    paddingHorizontal: 28,
    paddingBottom: 52,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 3,
    borderBottomColor: '#2563EB',
  },
  logo: {
    width: 38,
    height: 46,
    marginRight: 12,
    objectFit: 'contain',
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 3,
  },
  subtitle: { fontSize: 8, color: '#6b7280' },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 28,
    right: 28,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 5,
  },
  footerTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 1,
  },
  footerText: { fontSize: 7, color: '#9ca3af' },
  filterBox: {
    backgroundColor: '#f0f9ff',
    padding: 7,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#93c5fd',
    marginBottom: 10,
    flexDirection: 'row',
    gap: 20,
  },
  filterItem: { flexDirection: 'row', gap: 5 },
  filterLabel: { fontSize: 8, color: '#6b7280' },
  filterValue: { fontSize: 8, color: '#1f2937', fontWeight: 'bold' },
  twoCol: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  colLeft: { flex: 1.1 },
  colRight: { flex: 0.9 },
  section: {
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 7,
  },
  chartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  barLabel: {
    width: 115,
    fontSize: 8,
    color: '#374151',
    paddingRight: 6,
  },
  barContainer: {
    flex: 1,
    height: 14,
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barSegment: { height: '100%' },
  barValue: {
    width: 28,
    fontSize: 8,
    color: '#1f2937',
    fontWeight: 'bold',
    textAlign: 'right',
    paddingLeft: 5,
  },
  legend: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 7,
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendColor: { width: 9, height: 9, borderRadius: 2 },
  legendText: { fontSize: 8, color: '#374151' },
  jenisGrid: { flexDirection: 'row', gap: 7, marginTop: 6 },
  jenisCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center',
  },
  jenisName: { fontSize: 8, color: '#6b7280', marginBottom: 3, textAlign: 'center' },
  jenisValue: { fontSize: 20, fontWeight: 'bold', marginBottom: 2 },
  jenisPercent: { fontSize: 13, fontWeight: 'bold' },
  jenisLabel: { fontSize: 7, color: '#9ca3af' },
  aiSection: {
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#93c5fd',
    marginBottom: 10,
  },
  aiTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 7,
  },
  aiCard: {
    backgroundColor: '#ffffff',
    padding: 7,
    borderRadius: 4,
    marginBottom: 5,
    borderLeftWidth: 3,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  aiNum: { fontSize: 8, fontWeight: 'bold', color: '#93c5fd', width: 18 },
  aiText: { flex: 1, fontSize: 8, color: '#374151', lineHeight: 1.4 },
  watchlistHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 7,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    paddingLeft: 7,
  },
  watchlistContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#fca5a5',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#fee2e2',
    padding: 6,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    borderTopWidth: 1,
    borderTopColor: '#fecaca',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 5,
    backgroundColor: '#fff5f5',
    borderTopWidth: 1,
    borderTopColor: '#fecaca',
  },
  tableCell: { fontSize: 7, color: '#374151' },
  tableCellHeader: { fontSize: 8, color: '#991b1b', fontWeight: 'bold' },
  badge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: { color: '#ffffff', fontSize: 6, fontWeight: 'bold' },
});

const PageHeader = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => (
  <View style={styles.header}>
    <Image src={logoBrida} style={styles.logo} />
    <View style={styles.headerText}>
      <Text style={styles.title}>Laporan Analitik Inovasi BRIDA Jawa Timur</Text>
      <Text style={styles.subtitle}>
        Tanggal Generate: {new Date().toLocaleDateString('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric'
        })} | Halaman {pageNum} dari {totalPages}
      </Text>
    </View>
  </View>
);

const PageFooter = () => (
  <View style={styles.footer} fixed>
    <Text style={styles.footerTitle}>BADAN RISET DAN INOVASI DAERAH PROVINSI JAWA TIMUR</Text>
    <Text style={styles.footerText}>
      Jl. Gayung Kebonsari No.56, Gayungan, Kec. Gayungan, Surabaya, Jawa Timur 60235
    </Text>
  </View>
);

const PDFDocument = ({
  urusanData, jenisData, bentukData, watchlistData, aiInsights, filters, totalInnovations,
}: any) => {
  const ROWS_PER_PAGE = 18;
  const watchlistChunks: WatchlistData[][] = [];
  for (let i = 0; i < watchlistData.length; i += ROWS_PER_PAGE) {
    watchlistChunks.push(watchlistData.slice(i, i + ROWS_PER_PAGE));
  }
  if (watchlistChunks.length === 0) watchlistChunks.push([]);

  const totalPages = 2 + watchlistChunks.length;
  const borderColors: Record<string, string> = {
    success: '#10b981',
    warning: '#f59e0b',
    info: '#6366f1',
  };

  return (
    <Document>

      {/* Halaman 1: Grafik */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <PageHeader pageNum={1} totalPages={totalPages} />
        <View style={styles.filterBox}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Periode:</Text>
            <Text style={styles.filterValue}>{filters.tahun}</Text>
          </View>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Total Inovasi:</Text>
            <Text style={styles.filterValue}>{totalInnovations}</Text>
          </View>
        </View>
        <View style={styles.twoCol}>
          <View style={[styles.section, styles.colLeft]}>
            <Text style={styles.sectionTitle}>Top 5 Urusan Berdasarkan Tahapan</Text>
            <View style={styles.legend}>
              {[['#ef4444','Inisiatif'],['#f59e0b','Uji Coba'],['#10b981','Penerapan']].map(([c,l]) => (
                <View key={l} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: c }]} />
                  <Text style={styles.legendText}>{l}</Text>
                </View>
              ))}
            </View>
            {urusanData.map((item: UrusanData, i: number) => (
              <View key={i} style={styles.chartBar}>
                <Text style={styles.barLabel}>{item.urusan}</Text>
                <View style={styles.barContainer}>
                  {item.inisiatif > 0 && <View style={[styles.barSegment, { backgroundColor: '#ef4444', width: `${(item.inisiatif/item.total)*100}%` }]} />}
                  {item.ujiCoba > 0 && <View style={[styles.barSegment, { backgroundColor: '#f59e0b', width: `${(item.ujiCoba/item.total)*100}%` }]} />}
                  {item.penerapan > 0 && <View style={[styles.barSegment, { backgroundColor: '#10b981', width: `${(item.penerapan/item.total)*100}%` }]} />}
                </View>
                <Text style={styles.barValue}>{item.total}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.section, styles.colRight]}>
            <Text style={styles.sectionTitle}>Distribusi Jenis Inovasi</Text>
            <View style={styles.jenisGrid}>
              {jenisData.map((item: JenisData, i: number) => (
                <View key={i} style={[styles.jenisCard, { borderColor: item.color }]}>
                  <Text style={styles.jenisName}>{item.name}</Text>
                  <Text style={[styles.jenisValue, { color: item.color }]}>{item.value}</Text>
                  <Text style={[styles.jenisPercent, { color: item.color }]}>{item.percentage.toFixed(1)}%</Text>
                  <Text style={styles.jenisLabel}>dari total</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bentuk Inovasi Per Inisiator</Text>
          {bentukData.length > 0 && (
            <View style={styles.legend}>
              {Object.keys(bentukData[0]).filter(k => k !== 'inisiator').map((bentuk, i) => {
                const colors = ['#6366f1','#10b981','#f59e0b'];
                return (
                  <View key={i} style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: colors[i % colors.length] }]} />
                    <Text style={styles.legendText}>{bentuk}</Text>
                  </View>
                );
              })}
            </View>
          )}
          {bentukData.map((item: BentukData, i: number) => {
            const keys = Object.keys(item).filter(k => k !== 'inisiator');
            const total = keys.reduce((s, k) => s + (item[k] || 0), 0);
            const colors = ['#6366f1','#10b981','#f59e0b'];
            return (
              <View key={i} style={styles.chartBar}>
                <Text style={styles.barLabel}>{item.inisiator}</Text>
                <View style={styles.barContainer}>
                  {keys.map((bentuk, idx) => {
                    const w = total > 0 ? (item[bentuk] / total) * 100 : 0;
                    return w > 0 ? (
                      <View key={idx} style={[styles.barSegment, { backgroundColor: colors[idx % colors.length], width: `${w}%` }]} />
                    ) : null;
                  })}
                </View>
                <Text style={styles.barValue}>{total}</Text>
              </View>
            );
          })}
        </View>
        <PageFooter />
      </Page>

      {/* Halaman 2: AI Insight */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <PageHeader pageNum={2} totalPages={totalPages} />
        <View style={styles.aiSection}>
          <Text style={styles.aiTitle}>AI Auto Insight — Powered by Google Gemini</Text>
          {aiInsights && aiInsights.length > 0 ? (
            aiInsights.map((insight: AIInsight, i: number) => (
              <View key={i} style={[styles.aiCard, { borderLeftColor: borderColors[insight.type] || '#6366f1' }]}>
                <Text style={styles.aiNum}>{String(i + 1).padStart(2, '0')}</Text>
                <Text style={styles.aiText}>{insight.text}</Text>
              </View>
            ))
          ) : (
            <Text style={{ fontSize: 8, color: '#9ca3af', textAlign: 'center', padding: 12 }}>
              AI Insight belum tersedia untuk periode ini.
            </Text>
          )}
        </View>
        <PageFooter />
      </Page>

      {/* Halaman 3+: Watchlist */}
      {watchlistChunks.map((chunk, chunkIdx) => (
        <Page key={`wl-${chunkIdx}`} size="A4" orientation="landscape" style={styles.page}>
          <PageHeader pageNum={3 + chunkIdx} totalPages={totalPages} />
          <Text style={styles.watchlistHeader}>
            Watchlist: Inovasi Perlu Perhatian
            {watchlistData.length > 0
              ? `  (${chunkIdx * ROWS_PER_PAGE + 1}–${Math.min((chunkIdx + 1) * ROWS_PER_PAGE, watchlistData.length)} dari ${watchlistData.length})`
              : ''}
          </Text>
          <View style={styles.watchlistContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { flex: 3 }]}>Nama Inovasi</Text>
              <Text style={[styles.tableCellHeader, { flex: 2 }]}>OPD</Text>
              <Text style={[styles.tableCellHeader, { width: 46, textAlign: 'center' }]}>Tahun</Text>
              <Text style={[styles.tableCellHeader, { width: 40, textAlign: 'center' }]}>Skor</Text>
              <Text style={[styles.tableCellHeader, { width: 72, textAlign: 'center' }]}>Status</Text>
            </View>
            {chunk.length > 0 ? (
              chunk.map((item: WatchlistData, i: number) => (
                <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { flex: 3 }]} numberOfLines={2}>
                    {String(item.nama).length > 55 ? String(item.nama).substring(0, 55) + '...' : item.nama}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
                    {String(item.inisiator).length > 32 ? String(item.inisiator).substring(0, 32) + '...' : item.inisiator}
                  </Text>
                  <Text style={[styles.tableCell, { width: 46, textAlign: 'center' }]}>{item.tahunPenerapan}</Text>
                  <Text style={[styles.tableCell, { width: 40, textAlign: 'center', fontWeight: 'bold', color: '#ef4444' }]}>
                    {item.skorKematangan}
                  </Text>
                  <View style={{ width: 72, alignItems: 'center' }}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Perlu Perhatian</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ textAlign: 'center', color: '#6b7280', fontSize: 9, padding: 16 }}>
                Tidak ada inovasi yang perlu perhatian khusus
              </Text>
            )}
          </View>
          <PageFooter />
        </Page>
      ))}

    </Document>
  );
};

export function ReportAnalytics({ onClose, filters }: ReportAnalyticsProps) {

  const [urusanData,   setUrusanData]   = useState<UrusanData[]>([]);
  const [jenisData,    setJenisData]    = useState<JenisData[]>([]);
  const [bentukData,   setBentukData]   = useState<BentukData[]>([]);
  const [watchlistData,setWatchlistData]= useState<WatchlistData[]>([]);
  const [aiInsights,   setAiInsights]   = useState<AIInsight[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [pdfReady,     setPdfReady]     = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let query = supabase.from('data_inovasi').select('*');
        if (filters.tahun !== 'Semua') {
          const yearStart = `${filters.tahun}-01-01`;
          const yearEnd   = `${filters.tahun}-12-31`;
          query = query.gte('tanggal_penerapan', yearStart).lte('tanggal_penerapan', yearEnd);
        }
        const { data, error } = await query;
        if (error) throw error;
        if (data) {
          processUrusanData(data);
          processJenisData(data);
          processBentukData(data);
          processWatchlistData(data);
          await fetchAIInsights();
        }
        setLoading(false);
        setPdfReady(true);
      } catch (err: any) {
        console.error('Error:', err);
        setLoading(false);
        alert('Gagal mengambil data. Silakan coba lagi.');
        onClose();
      }
    };
    fetchData();
  }, [filters]);

  // ── Fetch AI Insight dari tabel ai_insight_cache ───────
  const fetchAIInsights = async () => {
    try {
      const today    = new Date().toISOString().split('T')[0];
      const cacheKey = `analytics_${filters.tahun}_${today}`;

      const { data, error } = await supabase
        .from('ai_insight_cache')
        .select('insight_data')
        .eq('insight_type', 'analytics')
        .eq('cache_key', cacheKey)
        .maybeSingle();

      if (error) throw error;
      if (data?.insight_data) {
        const insights = typeof data.insight_data === 'string'
          ? JSON.parse(data.insight_data)
          : data.insight_data;
        setAiInsights(insights);
      }
    } catch (err) {
      console.error('AI insights fetch error:', err);
      setAiInsights([]);
    }
  };

  const processUrusanData = (data: any[]) => {
    const grouped: { [key: string]: { inisiatif: number; ujiCoba: number; penerapan: number } } = {};
    data.forEach(item => {
      if (!item.urusan_utama) return;
      if (!grouped[item.urusan_utama]) grouped[item.urusan_utama] = { inisiatif: 0, ujiCoba: 0, penerapan: 0 };
      if (item.tahapan_inovasi === 'Inisiatif')   grouped[item.urusan_utama].inisiatif++;
      else if (item.tahapan_inovasi === 'Uji Coba') grouped[item.urusan_utama].ujiCoba++;
      else if (item.tahapan_inovasi === 'Penerapan') grouped[item.urusan_utama].penerapan++;
    });
    setUrusanData(
      Object.entries(grouped)
        .map(([urusan, c]) => ({
          urusan: urusan.length > 32 ? urusan.substring(0, 32) + '...' : urusan,
          inisiatif: c.inisiatif, ujiCoba: c.ujiCoba, penerapan: c.penerapan,
          total: c.inisiatif + c.ujiCoba + c.penerapan,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
    );
  };

  const processJenisData = (data: any[]) => {
    const grouped: { [key: string]: number } = {};
    data.forEach(item => { if (item.jenis) grouped[item.jenis] = (grouped[item.jenis] || 0) + 1; });
    const colors: { [key: string]: string } = {
      'Digital': '#6366f1', 'Non Digital': '#10b981', 'Teknologi': '#f59e0b',
    };
    const total = Object.values(grouped).reduce((s, v) => s + v, 0);
    setJenisData(
      Object.entries(grouped).map(([name, value]) => ({
        name, value, color: colors[name] || '#6b7280',
        percentage: total > 0 ? (value / total) * 100 : 0,
      }))
    );
  };

  const processBentukData = (data: any[]) => {
    const grouped: { [inisiator: string]: { [bentuk: string]: number } } = {};
    const shortenBentuk = (b: string) => {
      if (b.includes('Pelayanan Publik')) return 'Pelayanan Publik';
      if (b.includes('Tata Kelola'))     return 'Tata Kelola';
      if (b.includes('Lainnya'))         return 'Lainnya';
      return b;
    };
    data.forEach(item => {
      if (!item.inisiator || !item.bentuk_inovasi) return;
      if (!grouped[item.inisiator]) grouped[item.inisiator] = {};
      const b = shortenBentuk(item.bentuk_inovasi);
      grouped[item.inisiator][b] = (grouped[item.inisiator][b] || 0) + 1;
    });
    setBentukData(
      Object.entries(grouped).map(([inisiator, counts]) => {
        const row: any = { inisiator };
        Object.entries(counts).forEach(([b, n]) => { row[b] = n; });
        return row;
      })
    );
  };

  // ========================================
  // WATCHLIST: HANYA FILTER SKOR < 45
  // ========================================
  const processWatchlistData = (data: any[]) => {
    setWatchlistData(
      data
        .filter(item => {
          return (
            typeof item.kematangan === 'number' &&
            item.kematangan < 45
          );
        })
        .map(item => ({
          nama: item.judul_inovasi,
          inisiator: item.admin_opd,
          tahunPenerapan: item.tanggal_penerapan
            ? new Date(item.tanggal_penerapan).getFullYear()
            : '-',
          skorKematangan: item.kematangan,
        }))
        .sort((a, b) => a.skorKematangan - b.skorKematangan)
    );
  };

  const totalInnovations = jenisData.reduce((sum, item) => sum + item.value, 0);

  useEffect(() => {
    if (pdfReady && urusanData.length > 0) {
      const downloadPDF = async () => {
        const blob = await pdf(
          <PDFDocument
            urusanData={urusanData}
            jenisData={jenisData}
            bentukData={bentukData}
            watchlistData={watchlistData}
            aiInsights={aiInsights}
            filters={filters}
            totalInnovations={totalInnovations}
          />
        ).toBlob();
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = `BRIDA_Analytics_Report_${filters.tahun}_${new Date().toISOString().split('T')[0]}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        setTimeout(() => onClose(), 500);
      };
      downloadPDF();
    }
  }, [pdfReady, urusanData]);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(17, 24, 39, 0.75)',
      zIndex: 9999, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '12px',
        padding: '48px', textAlign: 'center', maxWidth: '400px',
      }}>
        <div style={{
          width: '64px', height: '64px',
          border: '4px solid #E5E7EB',
          borderTop: `4px solid ${loading ? '#2563EB' : '#10b981'}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 24px',
        }} />
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
          {loading ? 'Mengambil Data' : 'Generating PDF'}
        </h3>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
          {loading ? 'Memuat data dari database...' : 'Membuat laporan PDF...'}
        </p>
        {!loading && (
          <p style={{ fontSize: '12px', color: '#9ca3af' }}>Download akan dimulai otomatis</p>
        )}
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}