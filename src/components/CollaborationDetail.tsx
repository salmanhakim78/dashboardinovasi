import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Users, Target, Zap, TrendingUp, AlertTriangle, FileText, Lightbulb, Loader2, AlertCircle, Info } from 'lucide-react';

interface CollaborationDetailProps {
  darkMode: boolean;
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
  onBack: () => void;
}

interface AICollaborationResponse {
  judul_kolaborasi: string;
  opd_terlibat: string[];
  skor_kecocokan: number;
  alasan_kesesuaian: string;
  manfaat: string[];
  potensi_dampak: string[];
  tingkat_rekomendasi: string;
}

const getScoreBadgeColor = (score: number) => {
  if (score >= 0.9) return 'bg-emerald-500 text-white';
  if (score >= 0.7) return 'bg-blue-500 text-white';
  return 'bg-yellow-500 text-white';
};

const getTingkatRekomendasiColor = (tingkat: string, darkMode: boolean) => {
  if (tingkat.includes('Tinggi') || tingkat.includes('Replikasi')) {
    return darkMode ? 'text-emerald-400 bg-emerald-900/30' : 'text-emerald-600 bg-emerald-50';
  } else if (tingkat.includes('Sedang') || tingkat.includes('Kolaborasi')) {
    return darkMode ? 'text-blue-400 bg-blue-900/30' : 'text-blue-600 bg-blue-50';
  }
  return darkMode ? 'text-purple-400 bg-purple-900/30' : 'text-purple-600 bg-purple-50';
};

const toArray = (val: string | string[] | undefined | null): string[] => {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'string' && val.trim()) return [val];
  return [];
};

export function CollaborationDetail({ 
  darkMode, 
  inovasi_1_id,
  inovasi_2_id,
  inovasi_1_judul,
  inovasi_2_judul,
  opd_1,
  opd_2,
  urusan_1,
  urusan_2,
  tahap_1,
  tahap_2,
  kematangan_1,
  kematangan_2,
  similarity,
  onBack 
}: CollaborationDetailProps) {
  const [aiData, setAiData] = useState<AICollaborationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    fetchAICollaboration();
  }, [inovasi_1_id, inovasi_2_id]);

  const fetchAICollaboration = async () => {
    setLoading(true);
    setError(null);
    setUsedFallback(false);
    
    try {
      const response = await fetch(
        `http://localhost:8000/ai-input-collaboration/simulate?inovasi_1_id=${inovasi_1_id}&inovasi_2_id=${inovasi_2_id}`
      );
      
      // Tangkap error HTTP (4xx, 5xx)
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Server error ${response.status}${errText ? ': ' + errText.slice(0, 100) : ''}`);
      }
      
      const data = await response.json();

      if (!data || !data.hasil_ai) {
        throw new Error('Format response tidak valid dari server');
      }

      const ai = data.hasil_ai;

      // Tandai jika backend memakai fallback (quota habis)
      if (data.used_fallback) {
        setUsedFallback(true);
      }

      const mapped: AICollaborationResponse = {
        judul_kolaborasi: ai.judul_kolaborasi || 'Kolaborasi Inovasi',
        opd_terlibat: [opd_1, opd_2].filter(Boolean),
        skor_kecocokan: data.skor_kecocokan ?? similarity,
        alasan_kesesuaian: ai.alasan_sinergi || '-',
        manfaat: toArray(ai.manfaat_kolaborasi),
        potensi_dampak: toArray(ai.potensi_dampak),
        tingkat_rekomendasi: ai.tingkat_kolaborasi || '-',
      };

      setAiData(mapped);
    } catch (err) {
      console.error('Error fetching AI collaboration:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui');
    } finally {
      setLoading(false);
    }
  };

  const scorePercentage = Math.round(similarity * 100);

  return (
    <div className="space-y-6 pb-6 max-w-full">
      {/* Header with Back Button */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <button
          onClick={onBack}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors w-fit ${
            darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white hover:bg-gray-100 text-gray-800 border border-gray-200'
          }`}
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Kembali</span>
        </button>
        
        <div className="flex-1">
          <h2 className={`text-2xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Detail Analisis Kolaborasi Inovasi
          </h2>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className={`rounded-2xl shadow-xl p-12 text-center ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          <Loader2 className={`mx-auto mb-4 animate-spin ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} size={48} />
          <p className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Menganalisis kolaborasi dengan AI...
          </p>
          <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Mohon tunggu sebentar
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className={`rounded-2xl shadow-xl p-8 ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
            <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Gagal Memuat Data
            </h3>
            <p className={`mb-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {error}
            </p>
            <button
              onClick={fetchAICollaboration}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && aiData && (
        <div className={`rounded-2xl shadow-xl overflow-hidden ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          {/* Title Section */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={24} />
                  <span className="text-sm font-medium opacity-90">Rekomendasi Kolaborasi</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-3">
                  {aiData.judul_kolaborasi}
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {aiData.opd_terlibat.map((opd, index) => (
                    <span key={index} className="px-3 py-1 bg-white/20 rounded-full text-sm text-white font-medium backdrop-blur-sm border border-white/30">
                      {opd}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className={`px-4 py-2 rounded-xl font-bold text-2xl bg-white ${
                  similarity >= 0.9 ? 'text-emerald-600' :
                  similarity >= 0.7 ? 'text-blue-600' : 'text-yellow-600'
                }`}>
                  {scorePercentage}%
                </div>
                <span className="text-xs text-white opacity-90">Skor Kecocokan</span>
              </div>
            </div>
          </div>

          {/* Fallback Notice — tampil jika AI quota habis */}
          {usedFallback && (
            <div
              className="px-6 py-3 flex items-center gap-3 border-b text-sm"
              style={darkMode ? {
                background: 'rgba(234, 179, 8, 0.1)',
                borderColor: 'rgba(234, 179, 8, 0.3)',
                color: '#fcd34d',
              } : {
                background: '#fefce8',
                borderColor: '#fef08a',
                color: '#854d0e',
              }}
            >
              <Info size={16} style={{ flexShrink: 0 }} />
              <span>
                Analisis ini dihasilkan secara otomatis karena kuota AI sedang habis. Hasilnya mungkin kurang spesifik dibanding analisis Gemini penuh.
              </span>
            </div>
          )}

          {/* Content Section */}
          <div className="p-6 md:p-8 space-y-6">
            {/* Tingkat Rekomendasi */}
            <section>
              <div className={`p-4 rounded-lg border-l-4 ${
                aiData.tingkat_rekomendasi.includes('Tinggi') || aiData.tingkat_rekomendasi.includes('Replikasi')
                  ? 'border-emerald-500' 
                  : aiData.tingkat_rekomendasi.includes('Sedang') || aiData.tingkat_rekomendasi.includes('Kolaborasi')
                    ? 'border-blue-500'
                    : 'border-purple-500'
              } ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className={
                    aiData.tingkat_rekomendasi.includes('Tinggi') || aiData.tingkat_rekomendasi.includes('Replikasi')
                      ? 'text-emerald-500' 
                      : aiData.tingkat_rekomendasi.includes('Sedang') || aiData.tingkat_rekomendasi.includes('Kolaborasi')
                        ? 'text-blue-500'
                        : 'text-purple-500'
                  } size={20} />
                  <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Tingkat Rekomendasi
                  </h4>
                </div>
                <p className={`text-lg font-semibold px-3 py-1 rounded-lg w-fit ${getTingkatRekomendasiColor(aiData.tingkat_rekomendasi, darkMode)}`}>
                  {aiData.tingkat_rekomendasi}
                </p>
              </div>
            </section>

            {/* Detail Inovasi */}
            <section>
              <h4 className={`text-xl font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                <FileText className="text-blue-500" size={24} />
                Detail Inovasi
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Inovasi 1 */}
                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <h5 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>Inovasi 1</h5>
                    <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">{kematangan_1}</span>
                  </div>
                  <p className={`font-semibold mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{inovasi_1_judul}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className={`font-medium flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>OPD:</span>
                      <span className={darkMode ? 'text-gray-200' : 'text-gray-700'}>{opd_1}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className={`font-medium flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Urusan:</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>{urusan_1}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className={`font-medium flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tahap:</span>
                      <span className={darkMode ? 'text-gray-200' : 'text-gray-700'}>{tahap_1}</span>
                    </div>
                  </div>
                </div>

                {/* Inovasi 2 */}
                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <h5 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>Inovasi 2</h5>
                    <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">{kematangan_2}</span>
                  </div>
                  <p className={`font-semibold mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{inovasi_2_judul}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className={`font-medium flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>OPD:</span>
                      <span className={darkMode ? 'text-gray-200' : 'text-gray-700'}>{opd_2}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className={`font-medium flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Urusan:</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>{urusan_2}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className={`font-medium flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tahap:</span>
                      <span className={darkMode ? 'text-gray-200' : 'text-gray-700'}>{tahap_2}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Alasan Kesesuaian */}
            <section>
              <h4 className={`text-xl font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                <Users className="text-purple-500" size={24} />
                Alasan Kesesuaian
              </h4>
              <div className={`p-4 rounded-lg border-l-4 border-purple-500 leading-relaxed ${
                darkMode ? 'bg-purple-900/20 text-gray-200' : 'bg-purple-50 text-gray-800'
              }`}>
                {aiData.alasan_kesesuaian}
              </div>
            </section>

            {/* Manfaat Kolaborasi */}
            <section>
              <h4 className={`text-xl font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                <Target className="text-green-500" size={24} />
                Manfaat Kolaborasi
              </h4>
              <div className="space-y-2">
                {aiData.manfaat.map((item, index) => (
                  <div key={index} className={`flex items-start gap-3 p-3 rounded-lg border ${
                    darkMode ? 'bg-green-900/20 border-green-700/30' : 'bg-green-50 border-green-200'
                  }`}>
                    <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className={darkMode ? 'text-gray-200' : 'text-gray-700'}>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Potensi Dampak */}
            <section>
              <h4 className={`text-xl font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                <TrendingUp className="text-blue-500" size={24} />
                Potensi Dampak
              </h4>
              <div className="space-y-2">
                {aiData.potensi_dampak.map((item, index) => (
                  <div key={index} className={`flex items-start gap-3 p-3 rounded-lg border ${
                    darkMode ? 'bg-blue-900/20 border-blue-700/30' : 'bg-blue-50 border-blue-200'
                  }`}>
                    <Zap size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className={darkMode ? 'text-gray-200' : 'text-gray-700'}>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Footer Disclaimer */}
            <div className={`p-4 rounded-lg border-l-4 border-yellow-500 ${
              darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'
            }`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-yellow-500 flex-shrink-0" size={20} />
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <strong className={darkMode ? 'text-yellow-400' : 'text-yellow-700'}>Catatan:</strong>
                  {' '}Analisis ini dihasilkan oleh AI BRIDA Jatim sebagai pendukung pengambilan keputusan.
                  Untuk implementasi, diperlukan kajian lebih mendalam dan melibatkan semua stakeholder terkait.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
