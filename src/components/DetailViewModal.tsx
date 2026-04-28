import { X, FileCheck, Calendar, MapPin, Video } from 'lucide-react';
import { InovasiDaerah } from '../lib/supabase';

interface DetailViewModalProps {
  data: InovasiDaerah;
  darkMode: boolean;
  onClose: () => void;
}

const getLabelBadge = (label: string) => {
  if (label === 'Sangat Inovatif') return { color: 'bg-emerald-600', textColor: 'text-white' };
  else if (label === 'Inovatif') return { color: 'bg-blue-500', textColor: 'text-white' };
  else if (label === 'Kurang Inovatif') return { color: 'bg-orange-500', textColor: 'text-white' };
  else return { color: 'bg-gray-400', textColor: 'text-white' };
};

export function DetailViewModal({ data, darkMode, onClose }: DetailViewModalProps) {
  const googleMapsUrl = `https://www.google.com/maps?q=${data.lat},${data.lon}`;
  const badge = getLabelBadge(data.label_kematangan);
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw', height: '100vh',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(100,116,139,0.35)',
        zIndex: 50,
        margin: 0, padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflowY: 'auto',
      }}
    >
      <div className={`rounded-2xl shadow-2xl ring-1 ring-black/10 max-w-5xl w-full max-h-[90vh] overflow-y-auto my-8 ${
        darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-white to-gray-50'
      }`}>
        {/* Header */}
        <div className={`sticky top-0 z-10 p-6 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} backdrop-blur-lg bg-opacity-90`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <FileCheck className="text-white" size={24} />
              </div>
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Detail Data Inovasi
              </h3>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-all hover:scale-110 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <X className={darkMode ? 'text-gray-400' : 'text-gray-600'} size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Badge Status */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold shadow-lg ${badge.color} ${badge.textColor}`}>
               {data.kematangan} - {data.label_kematangan}
            </span>
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold text-white shadow-md"
              style={{ backgroundColor: data.jenis === 'Digital' ? '#6366f1' : data.jenis === 'Non Digital' ? '#10b981' : '#f59e0b' }}>
              {data.jenis}
            </span>
          </div>

          {/* Informasi Utama */}
          <div className={`rounded-xl p-6 shadow-lg ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
              Informasi Utama
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No</label>
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{data.no}</p>
              </div>
              <div className={`md:col-span-2 p-4 rounded-lg border-l-4 border-blue-500 ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                <label className={`block text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Judul Inovasi</label>
                <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{data.judul_inovasi}</p>
              </div>

              {/* ── DESKRIPSI — tampil hanya jika ada ── */}
              {data.deskripsi && (
                <div className={`md:col-span-2 p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <label className={`block text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Deskripsi Inovasi</label>
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{data.deskripsi}</p>
                </div>
              )}

              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pemda</label>
                <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>{data.pemda}</p>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Admin OPD</label>
                <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>{data.admin_opd}</p>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Inisiator</label>
                <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>{data.inisiator}</p>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Nama Inisiator</label>
                <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>{data.nama_inisiator}</p>
              </div>
            </div>
          </div>

          {/* Kategori Inovasi */}
          <div className={`rounded-xl p-6 shadow-lg ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
              Kategori Inovasi
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Bentuk Inovasi</label>
                <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>{data.bentuk_inovasi}</p>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Asta Cipta</label>
                <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>{data.asta_cipta}</p>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Urusan Utama</label>
                <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>{data.urusan_utama}</p>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tahapan Inovasi</label>
                <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>{data.tahapan_inovasi}</p>
              </div>
              <div className={`md:col-span-2 p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Urusan Lain Yang Beririsan</label>
                <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>{data.urusan_lain_yang_beririsan || '-'}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className={`rounded-xl p-6 shadow-lg ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              <Calendar size={20} className="text-green-500" />
              Timeline
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg border-l-4 border-blue-500 ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                <label className={`block text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>📅 Tanggal Input</label>
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {data.tanggal_input ? new Date(data.tanggal_input).toLocaleDateString('id-ID') : '-'}
                </p>
              </div>
              <div className={`p-4 rounded-lg border-l-4 border-green-500 ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                <label className={`block text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>🚀 Tanggal Penerapan</label>
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {data.tanggal_penerapan ? new Date(data.tanggal_penerapan).toLocaleDateString('id-ID') : '-'}
                </p>
              </div>
              <div className={`p-4 rounded-lg border-l-4 border-purple-500 ${darkMode ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
                <label className={`block text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>🔧 Tanggal Pengembangan</label>
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {data.tanggal_pengembangan ? new Date(data.tanggal_pengembangan).toLocaleDateString('id-ID') : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Video */}
          {data.video === 'Ada' && data.link_video && (
            <div className={`rounded-xl p-6 shadow-lg ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                <Video size={20} className="text-red-500" />
                Video Dokumentasi
              </h4>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
                <a href={data.link_video} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-500 hover:text-blue-600 font-medium transition-colors">
                  <Video size={18} />
                  <span className="break-all">{data.link_video}</span>
                </a>
              </div>
            </div>
          )}

          {/* Lokasi */}
          <div className={`rounded-xl p-6 shadow-lg ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              <MapPin size={20} className="text-orange-500" />
              Lokasi Koordinat
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Latitude</label>
                <p className={`text-sm font-mono ${darkMode ? 'text-white' : 'text-gray-800'}`}>{data.lat}</p>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Longitude</label>
                <p className={`text-sm font-mono ${darkMode ? 'text-white' : 'text-gray-800'}`}>{data.lon}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="rounded-xl overflow-hidden border-2 border-gray-300 dark:border-gray-600 shadow-lg">
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${data.lon-0.01},${data.lat-0.01},${data.lon+0.01},${data.lat+0.01}&layer=mapnik&marker=${data.lat},${data.lon}`}
                  width="100%" height="300" style={{ border: 0 }} loading="lazy" title="Map Preview"
                />
              </div>
              <div className="mt-3">
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md hover:shadow-lg">
                  <MapPin size={16} />
                  Lihat di Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`sticky bottom-0 p-6 border-t flex justify-end gap-3 backdrop-blur-lg bg-opacity-90 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl font-medium">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}