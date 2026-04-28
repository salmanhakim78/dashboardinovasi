import { useState, useEffect } from 'react';
import { X, Save, Search, AlertCircle, CheckCircle, MapPin, Loader2 } from 'lucide-react';
import { supabase, InovasiDaerah } from '../lib/supabase';

interface EditDataProps {
  darkMode: boolean;
  data: InovasiDaerah;
  onClose: () => void;
  onSubmit: (data: Partial<InovasiDaerah>) => void;
}

// List Urusan Lain yang Beririsan (bisa pilih lebih dari satu)
const urusanLainList = [
  'Administrasi Kependudukan dan Pencatatan Sipil',
  'Energi dan Sumber Daya Mineral',
  'Kearsipan',
  'Kebudayaan',
  'Kehutanan',
  'Kelautan dan Perikanan',
  'Kepemudaan dan Olah Raga',
  'Kesehatan',
  'Ketenteraman, Ketertiban Umum, dan Pelindungan Masyarakat',
  'Komunikasi dan Informatika',
  'Koperasi, Usaha Kecil, dan Menengah',
  'Lingkungan Hidup',
  'Pangan',
  'Pariwisata',
  'Pekerjaan Umum dan Penataan Ruang',
  'Pemberdayaan Masyarakat dan Desa',
  'Pemberdayaan Perempuan dan Pelindungan Anak',
  'Penanaman Modal',
  'Pengendalian Penduduk dan Keluarga Berencana',
  'Perdagangan',
  'Perhubungan',
  'Perindustrian',
  'Perpustakaan',
  'Pertanahan',
  'Pertanian',
  'Perumahan Rakyat dan Kawasan Permukiman',
  'Sosial',
  'Statistik',
  'Tenaga Kerja',
  'Transmigrasi',
  'Fungsi Penunjang lainnya sesuai dengan ketentuan peraturan perundang-undangan',
  'Kepegawaian',
  'Keuangan',
  'Pendidikan dan Pelatihan (Diklat)',
  'Penelitian dan Pengembangan (Litbang)',
  'Perencanaan',
  'Tidak ada',
];

export function EditData({ darkMode, data, onClose, onSubmit }: EditDataProps) {
  // State form dengan data existing
  const [formData, setFormData] = useState<InovasiDaerah>({
    ...data,
    judul_inovasi:              data.judul_inovasi              ?? '',
    pemda:                      data.pemda                      ?? '',
    admin_opd:                  data.admin_opd                  ?? '',
    inisiator:                  data.inisiator                  ?? '',
    nama_inisiator:             data.nama_inisiator             ?? '',
    bentuk_inovasi:             data.bentuk_inovasi             ?? '',
    jenis:                      data.jenis                      ?? '',
    asta_cipta:                 data.asta_cipta                 ?? '',
    urusan_utama:               data.urusan_utama               ?? '',
    urusan_lain_yang_beririsan: data.urusan_lain_yang_beririsan ?? '',
    tahapan_inovasi:            data.tahapan_inovasi            ?? '',
    tanggal_input:              data.tanggal_input              ?? '',
    tanggal_penerapan:          data.tanggal_penerapan          ?? '',
    tanggal_pengembangan:       data.tanggal_pengembangan       ?? '',
    video:                      data.video                      ?? 'Tidak',
    link_video:                 data.link_video                 ?? '',
    label_kematangan:           data.label_kematangan           ?? '',
    // ── lat/lon: tampilkan existing jika valid, kosong jika null/0 ──
    lat: (data.lat != null && data.lat !== 0) ? data.lat : '' as any,
    lon: (data.lon != null && data.lon !== 0) ? data.lon : '' as any,
    kematangan:                 data.kematangan                 ?? 0,
    deskripsi:                  data.deskripsi                  ?? '',
  });

  // ── State GPS ──────────────────────────────────────────────
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError,   setGpsError]   = useState<string | null>(null);
  // ── Validasi lat/lon ───────────────────────────────────────
  const [latError, setLatError] = useState<string | null>(null);
  const [lonError, setLonError] = useState<string | null>(null);

  // Cek apakah data existing punya koordinat valid
  const hasExistingCoords = data.lat != null && data.lat !== 0 && data.lon != null && data.lon !== 0;

  // State untuk data unik dari database
  const [uniqueValues, setUniqueValues] = useState({
    inisiator: [] as string[],
    bentuk_inovasi: [] as string[],
    jenis: [] as string[],
    asta_cipta: [] as string[],
    urusan_utama: [] as string[],
    tahapan_inovasi: [] as string[],
  });

  // State untuk urusan lain yang dipilih (parse dari data existing)
  const [selectedUrusanLain, setSelectedUrusanLain] = useState<string[]>(
    data.urusan_lain_yang_beririsan ? data.urusan_lain_yang_beririsan.split(', ').filter(Boolean) : []
  );

  // State untuk dropdown
  const [searchInisiator, setSearchInisiator] = useState('');
  const [searchBentuk, setSearchBentuk] = useState('');
  const [searchJenis, setSearchJenis] = useState('');
  const [searchAsta, setSearchAsta] = useState('');
  const [searchUrusan, setSearchUrusan] = useState('');
  const [searchUrusanLain, setSearchUrusanLain] = useState('');
  const [searchTahapan, setSearchTahapan] = useState('');
  
  const [showInisiatorDropdown, setShowInisiatorDropdown] = useState(false);
  const [showBentukDropdown, setShowBentukDropdown] = useState(false);
  const [showJenisDropdown, setShowJenisDropdown] = useState(false);
  const [showAstaDropdown, setShowAstaDropdown] = useState(false);
  const [showUrusanDropdown, setShowUrusanDropdown] = useState(false);
  const [showUrusanLainDropdown, setShowUrusanLainDropdown] = useState(false);
  const [showTahapanDropdown, setShowTahapanDropdown] = useState(false);

  // State untuk loading dan notifikasi
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch nilai unik dari database
  useEffect(() => {
    const fetchUniqueValues = async () => {
      try {
        setLoadingOptions(true);
        
        const { data: allData, error } = await supabase
          .from('data_inovasi')
          .select('inisiator, bentuk_inovasi, jenis, asta_cipta, urusan_utama, tahapan_inovasi');

        if (error) throw error;

        if (allData) {
          // Extract unique values untuk setiap field
          const unique = {
            inisiator: [...new Set(allData.map(item => item.inisiator).filter(Boolean))].sort(),
            bentuk_inovasi: [...new Set(allData.map(item => item.bentuk_inovasi).filter(Boolean))].sort(),
            jenis: [...new Set(allData.map(item => item.jenis).filter(Boolean))].sort(),
            asta_cipta: [...new Set(allData.map(item => item.asta_cipta).filter(Boolean))].sort(),
            urusan_utama: [...new Set(allData.map(item => item.urusan_utama).filter(Boolean))].sort(),
            tahapan_inovasi: [...new Set(allData.map(item => item.tahapan_inovasi).filter(Boolean))].sort(),
          };

          setUniqueValues(unique);
        }
      } catch (err) {
        console.error('Error fetching unique values:', err);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchUniqueValues();
  }, []);

  // Filter data dropdown
  const filteredInisiator = uniqueValues.inisiator.filter(val => 
    val.toLowerCase().includes(searchInisiator.toLowerCase())
  );

  const filteredBentuk = uniqueValues.bentuk_inovasi.filter(val => 
    val.toLowerCase().includes(searchBentuk.toLowerCase())
  );

  const filteredJenis = uniqueValues.jenis.filter(val => 
    val.toLowerCase().includes(searchJenis.toLowerCase())
  );

  const filteredAsta = uniqueValues.asta_cipta.filter(val => 
    val.toLowerCase().includes(searchAsta.toLowerCase())
  );

  const filteredUrusan = uniqueValues.urusan_utama.filter(val => 
    val.toLowerCase().includes(searchUrusan.toLowerCase())
  );

  // Filter urusan lain dari list manual
  const filteredUrusanLain = urusanLainList.filter(val => 
    val.toLowerCase().includes(searchUrusanLain.toLowerCase())
  );

  const filteredTahapan = uniqueValues.tahapan_inovasi.filter(val => 
    val.toLowerCase().includes(searchTahapan.toLowerCase())
  );

  // Toggle urusan lain (multi-select)
  const toggleUrusanLain = (urusan: string) => {
    setSelectedUrusanLain(prev => {
      if (prev.includes(urusan)) {
        return prev.filter(item => item !== urusan);
      } else {
        return [...prev, urusan];
      }
    });
  };

  // ── Fungsi GPS ─────────────────────────────────────────────
  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Browser tidak mendukung GPS');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lon = parseFloat(pos.coords.longitude.toFixed(6));
        setFormData(prev => ({ ...prev, lat, lon }));
        setLatError(null);
        setLonError(null);
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(
          err.code === 1 ? 'Akses lokasi ditolak. Izinkan lokasi di browser.' :
          err.code === 2 ? 'Lokasi tidak tersedia.' :
          'Timeout. Coba lagi.'
        );
        setGpsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ── Validasi lat/lon saat blur ─────────────────────────────
  const validateLat = (val: any) => {
    const num = parseFloat(val);
    if (val === '' || val === null || val === undefined || isNaN(num)) {
      setLatError('Latitude wajib diisi');
    } else if (num < -90 || num > 90) {
      setLatError('Latitude harus antara -90 dan 90');
    } else {
      setLatError(null);
    }
  };

  const validateLon = (val: any) => {
    const num = parseFloat(val);
    if (val === '' || val === null || val === undefined || isNaN(num)) {
      setLonError('Longitude wajib diisi');
    } else if (num < -180 || num > 180) {
      setLonError('Longitude harus antara -180 dan 180');
    } else {
      setLonError(null);
    }
  };

  // Submit form ke parent component
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ── Validasi lat/lon sebelum submit ───────────────────────
    const latNum = parseFloat(String(formData.lat));
    const lonNum = parseFloat(String(formData.lon));
    if (formData.lat === '' || formData.lat === null || isNaN(latNum)) {
      setLatError('Latitude wajib diisi');
      return;
    }
    if (formData.lon === '' || formData.lon === null || isNaN(lonNum)) {
      setLonError('Longitude wajib diisi');
      return;
    }
    if (latNum < -90 || latNum > 90) {
      setLatError('Latitude harus antara -90 dan 90');
      return;
    }
    if (lonNum < -180 || lonNum > 180) {
      setLonError('Longitude harus antara -180 dan 180');
      return;
    }

    // Gabungkan urusan lain jadi string
    const dataToSubmit = {
      ...formData,
      lat: latNum,
      lon: lonNum,
      urusan_lain_yang_beririsan: selectedUrusanLain.join(', '),
      // ── FIX: konversi string kosong ke null agar PostgreSQL tidak error ──
      tanggal_input:        formData.tanggal_input        || null,
      tanggal_penerapan:    formData.tanggal_penerapan    || null,
      tanggal_pengembangan: formData.tanggal_pengembangan || null,
      link_video:           formData.link_video           || null,
      deskripsi:            formData.deskripsi?.trim()    || null,
    };
    
    onSubmit(dataToSubmit);
  };

  return (
    // ✅ FIX BLUR: ganti className ke inline style dengan dimensi eksplisit agar blur full screen tanpa gap
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
      <div className={`rounded-2xl shadow-2xl ring-1 ring-black/10 w-full max-w-4xl max-h-[90vh] overflow-y-auto ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`} style={{ margin: '16px' }}>
        {/* Header */}
        <div className={`sticky top-0 z-10 p-6 border-b flex items-center justify-between ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Edit Data Inovasi
          </h3>
          <button 
            onClick={onClose} 
            disabled={loading}
            className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'} disabled:opacity-50`}
          >
            <X size={24} />
          </button>
        </div>

        {success && (
          <div className="m-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="text-green-600" size={20} />
            <span className="text-green-800">Data berhasil diupdate!</span>
          </div>
        )}

        {error && (
          <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-600 mt-0.5" size={20} />
            <div>
              <p className="text-red-800 font-semibold">Gagal menyimpan data</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Grid 2 kolom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Judul Inovasi */}
            <div className="md:col-span-2">
              <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Judul Inovasi *
              </label>
              <input
                type="text"
                required
                disabled={loading}
                value={formData.judul_inovasi}
                onChange={(e) => setFormData({ ...formData, judul_inovasi: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                }`}
                placeholder="Masukkan judul inovasi"
              />
            </div>

            {/* Deskripsi Inovasi */}
            <div className="md:col-span-2">
              <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Deskripsi Inovasi</label>
              <textarea
                disabled={loading}
                value={formData.deskripsi || ''}
                onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                rows={4}
                placeholder="Jelaskan secara detail tentang inovasi ini..."
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                }`}
              />
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Opsional — tambahkan informasi detail mengenai latar belakang, tujuan, dan manfaat inovasi
              </p>
            </div>

            {/* Pemda */}
            <div>
              <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Pemda *
              </label>
              <input
                type="text"
                required
                disabled={loading}
                value={formData.pemda}
                onChange={(e) => setFormData({ ...formData, pemda: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                }`}
              />
            </div>

            {/* Admin OPD */}
            <div>
              <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Admin OPD *
              </label>
              <input
                type="text"
                required
                disabled={loading}
                value={formData.admin_opd}
                onChange={(e) => setFormData({ ...formData, admin_opd: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                }`}
                placeholder="Masukkan nama Admin OPD"
              />
            </div>

            {/* Inisiator - Searchable Dropdown */}
            <div className="relative">
              <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Inisiator *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  disabled={loading || loadingOptions}
                  value={searchInisiator || formData.inisiator}
                  onChange={(e) => {
                    setSearchInisiator(e.target.value);
                    setShowInisiatorDropdown(true);
                  }}
                  onFocus={() => {
                    if (!loading && !loadingOptions) {
                      setSearchInisiator('');
                      setShowInisiatorDropdown(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowInisiatorDropdown(false);
                      setSearchInisiator('');
                    }, 200);
                  }}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                  }`}
                  placeholder="Ketik atau pilih Inisiator"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>
              {showInisiatorDropdown && filteredInisiator.length > 0 && !loading && !loadingOptions && (
                <div 
                  onMouseDown={(e) => e.preventDefault()}
                  className={`absolute z-20 w-full mt-1 max-h-60 overflow-y-auto rounded-lg border shadow-lg ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                >
                  {filteredInisiator.map((val, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setFormData({ ...formData, inisiator: val });
                        setSearchInisiator('');
                        setShowInisiatorDropdown(false);
                      }}
                      className={`px-3 py-2 cursor-pointer transition-colors ${
                        darkMode ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      {val}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nama Inisiator */}
            <div>
              <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Nama Inisiator *
              </label>
              <input
                type="text"
                required
                disabled={loading}
                value={formData.nama_inisiator}
                onChange={(e) => setFormData({ ...formData, nama_inisiator: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                }`}
                placeholder="Nama lengkap inisiator"
              />
            </div>

            {/* Bentuk Inovasi - Searchable Dropdown */}
            <div className="relative">
              <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Bentuk Inovasi *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  disabled={loading || loadingOptions}
                  value={searchBentuk || formData.bentuk_inovasi}
                  onChange={(e) => {
                    setSearchBentuk(e.target.value);
                    setShowBentukDropdown(true);
                  }}
                  onFocus={() => {
                    if (!loading && !loadingOptions) {
                      setSearchBentuk('');
                      setShowBentukDropdown(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowBentukDropdown(false);
                      setSearchBentuk('');
                    }, 200);
                  }}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                  }`}
                  placeholder="Ketik atau pilih Bentuk Inovasi"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>
              {showBentukDropdown && filteredBentuk.length > 0 && !loading && !loadingOptions && (
                <div onMouseDown={(e) => e.preventDefault()}
                  className={`absolute z-20 w-full mt-1 max-h-60 overflow-y-auto rounded-lg border shadow-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}>
                  {filteredBentuk.map((val, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setFormData({ ...formData, bentuk_inovasi: val });
                        setSearchBentuk('');
                        setShowBentukDropdown(false);
                      }}
                      className={`px-3 py-2 cursor-pointer transition-colors ${
                        darkMode ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      {val}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Jenis - Searchable Dropdown */}
            <div className="relative">
              <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Jenis *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  disabled={loading || loadingOptions}
                  value={searchJenis || formData.jenis}
                  onChange={(e) => {
                    setSearchJenis(e.target.value);
                    setShowJenisDropdown(true);
                  }}
                  onFocus={() => {
                    if (!loading && !loadingOptions) {
                      setSearchJenis('');
                      setShowJenisDropdown(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowJenisDropdown(false);
                      setSearchJenis('');
                    }, 200);
                  }}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                  }`}
                  placeholder="Ketik atau pilih Jenis"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>
              {showJenisDropdown && filteredJenis.length > 0 && !loading && !loadingOptions && (
                <div onMouseDown={(e) => e.preventDefault()}
                  className={`absolute z-20 w-full mt-1 max-h-60 overflow-y-auto rounded-lg border shadow-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}>
                  {filteredJenis.map((val, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setFormData({ ...formData, jenis: val });
                        setSearchJenis('');
                        setShowJenisDropdown(false);
                      }}
                      className={`px-3 py-2 cursor-pointer transition-colors ${
                        darkMode ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      {val}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Asta Cipta - Searchable Dropdown */}
            <div className="relative">
              <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Asta Cipta *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  disabled={loading}
                  value={formData.asta_cipta || searchAsta}
                  onChange={(e) => {
                    setSearchAsta(e.target.value);
                    setFormData({ ...formData, asta_cipta: e.target.value });
                    setShowAstaDropdown(true);
                  }}
                  onFocus={() => !loading && setShowAstaDropdown(true)}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                  }`}
                  placeholder="Cari atau pilih Asta Cipta"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>
              {showAstaDropdown && filteredAsta.length > 0 && !loading && (
                <div className={`absolute z-20 w-full mt-1 max-h-60 overflow-y-auto rounded-lg border shadow-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}>
                  {filteredAsta.map((asta, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setFormData({ ...formData, asta_cipta: asta });
                        setSearchAsta('');
                        setShowAstaDropdown(false);
                      }}
                      className={`px-3 py-2 cursor-pointer transition-colors ${
                        darkMode ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      {asta}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Urusan Utama - Searchable Dropdown */}
            <div className="relative">
              <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Urusan Utama *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  disabled={loading}
                  value={formData.urusan_utama || searchUrusan}
                  onChange={(e) => {
                    setSearchUrusan(e.target.value);
                    setFormData({ ...formData, urusan_utama: e.target.value });
                    setShowUrusanDropdown(true);
                  }}
                  onFocus={() => !loading && setShowUrusanDropdown(true)}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                  }`}
                  placeholder="Cari atau pilih Urusan Utama"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>
              {showUrusanDropdown && filteredUrusan.length > 0 && !loading && (
                <div className={`absolute z-20 w-full mt-1 max-h-60 overflow-y-auto rounded-lg border shadow-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}>
                  {filteredUrusan.map((urusan, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setFormData({ ...formData, urusan_utama: urusan });
                        setSearchUrusan('');
                        setShowUrusanDropdown(false);
                      }}
                      className={`px-3 py-2 cursor-pointer transition-colors ${
                        darkMode ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      {urusan}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Urusan Lain yang Beririsan - Multi Select */}
            <div className="relative md:col-span-2">
              <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Urusan Lain Yang Beririsan (bisa pilih lebih dari 1)
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled={loading}
                  value={searchUrusanLain}
                  onChange={(e) => {
                    setSearchUrusanLain(e.target.value);
                    setShowUrusanLainDropdown(true);
                  }}
                  onFocus={() => !loading && setShowUrusanLainDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowUrusanLainDropdown(false), 200);
                  }}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                  }`}
                  placeholder="Cari urusan lain..."
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>
              
              {/* Selected items */}
              {selectedUrusanLain.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedUrusanLain.map((urusan, index) => (
                    <span
                      key={index}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                        darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {urusan}
                      <button
                        type="button"
                        onClick={() => toggleUrusanLain(urusan)}
                        className="hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              {/* Dropdown */}
              {showUrusanLainDropdown && filteredUrusanLain.length > 0 && !loading && (
                <div 
                  onMouseDown={(e) => e.preventDefault()}
                  className={`absolute z-20 w-full mt-1 max-h-60 overflow-y-auto rounded-lg border shadow-lg ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                >
                  {filteredUrusanLain.map((val, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        toggleUrusanLain(val);
                        setSearchUrusanLain('');
                      }}
                      className={`px-3 py-2 cursor-pointer transition-colors flex items-center justify-between ${
                        darkMode ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-100 text-gray-800'
                      } ${selectedUrusanLain.includes(val) ? (darkMode ? 'bg-blue-900/30' : 'bg-blue-50') : ''}`}
                    >
                      <span>{val}</span>
                      {selectedUrusanLain.includes(val) && (
                        <CheckCircle size={16} className="text-blue-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Kematangan */}
            <div>
              <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Kematangan (0-120) *
              </label>
              <input
                type="number"
                required
                disabled={loading}
                min="0"
                max="120"
                value={formData.kematangan}
                onChange={(e) => setFormData({ ...formData, kematangan: Number(e.target.value) })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                }`}
              />
            </div>

            {/* Tahapan Inovasi - Searchable Dropdown */}
            <div className="relative">
              <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Tahapan Inovasi *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  disabled={loading || loadingOptions}
                  value={searchTahapan || formData.tahapan_inovasi}
                  onChange={(e) => {
                    setSearchTahapan(e.target.value);
                    setShowTahapanDropdown(true);
                  }}
                  onFocus={() => {
                    if (!loading && !loadingOptions) {
                      setSearchTahapan('');
                      setShowTahapanDropdown(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowTahapanDropdown(false);
                      setSearchTahapan('');
                    }, 200);
                  }}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                  }`}
                  placeholder="Ketik atau pilih Tahapan Inovasi"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>
              {showTahapanDropdown && filteredTahapan.length > 0 && !loading && !loadingOptions && (
                <div onMouseDown={(e) => e.preventDefault()}
                  className={`absolute z-20 w-full mt-1 max-h-60 overflow-y-auto rounded-lg border shadow-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}>
                  {filteredTahapan.map((val, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setFormData({ ...formData, tahapan_inovasi: val });
                        setSearchTahapan('');
                        setShowTahapanDropdown(false);
                      }}
                      className={`px-3 py-2 cursor-pointer transition-colors ${
                        darkMode ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      {val}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tanggal Input */}
            <div>
              <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Tanggal Input *
              </label>
              <input
                type="date"
                required
                disabled={loading}
                value={formData.tanggal_input}
                onChange={(e) => setFormData({ ...formData, tanggal_input: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                }`}
              />
            </div>

            {/* Tanggal Penerapan */}
            <div>
              <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Tanggal Penerapan
              </label>
              <input
                type="date"
                disabled={loading}
                value={formData.tanggal_penerapan}
                onChange={(e) => setFormData({ ...formData, tanggal_penerapan: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                }`}
              />
            </div>

            {/* Tanggal Pengembangan */}
            <div>
              <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Tanggal Pengembangan
              </label>
              <input
                type="date"
                disabled={loading}
                value={formData.tanggal_pengembangan}
                onChange={(e) => setFormData({ ...formData, tanggal_pengembangan: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                }`}
              />
            </div>

            {/* Video */}
            <div>
              <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Video *
              </label>
              <select
                required
                disabled={loading}
                value={formData.video}
                onChange={(e) => setFormData({ ...formData, video: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                }`}
              >
                <option>Ada</option>
                <option>Tidak</option>
              </select>
            </div>

            {/* Link Video */}
            <div>
              <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Link Video {formData.video === 'Ada' && '*'}
              </label>
              <input
                type="url"
                required={formData.video === 'Ada'}
                disabled={formData.video === 'Tidak' || loading}
                value={formData.link_video}
                onChange={(e) => setFormData({ ...formData, link_video: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800 disabled:bg-gray-100'
                }`}
                placeholder="https://youtube.com/..."
              />
            </div>

            {/* ── KOORDINAT LOKASI — direvisi ── */}
            <div className="md:col-span-2">
              {/* Header + badge status + tombol GPS */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Koordinat Lokasi *
                  </label>
                  {/* Badge: ada atau tidak koordinat dari DB */}
                  {hasExistingCoords ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      darkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700'
                    }`}>
                      ✓ Koordinat tersedia
                    </span>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      darkMode ? 'bg-orange-900/40 text-orange-400' : 'bg-orange-100 text-orange-700'
                    }`}>
                      ⚠ Koordinat belum diisi
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleGetGPS}
                  disabled={loading || gpsLoading}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    darkMode
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                  }`}
                >
                  {gpsLoading
                    ? <><Loader2 size={15} className="animate-spin" /> Mendeteksi...</>
                    : <><MapPin size={15} /> Gunakan Lokasi Saya</>
                  }
                </button>
              </div>

              {/* GPS error */}
              {gpsError && (
                <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 text-sm">
                  <AlertCircle size={15} />
                  {gpsError}
                </div>
              )}

              {/* Input lat & lon */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Latitude <span className="text-red-500">*</span>
                    <span className={`ml-1 font-normal ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>(-90 s/d 90)</span>
                  </label>
                  <input
                    type="number"
                    disabled={loading}
                    step="0.000001"
                    placeholder="Contoh: -7.257500"
                    value={formData.lat}
                    onChange={(e) => {
                      setFormData({ ...formData, lat: e.target.value as any });
                      setLatError(null);
                    }}
                    onBlur={(e) => validateLat(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 disabled:opacity-50 ${
                      latError
                        ? 'border-red-400 focus:ring-red-400'
                        : 'focus:ring-blue-500 ' + (darkMode ? 'border-gray-600' : 'border-gray-300')
                    } ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-800'}`}
                  />
                  {latError && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> {latError}
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-xs mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Longitude <span className="text-red-500">*</span>
                    <span className={`ml-1 font-normal ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>(-180 s/d 180)</span>
                  </label>
                  <input
                    type="number"
                    disabled={loading}
                    step="0.000001"
                    placeholder="Contoh: 112.752100"
                    value={formData.lon}
                    onChange={(e) => {
                      setFormData({ ...formData, lon: e.target.value as any });
                      setLonError(null);
                    }}
                    onBlur={(e) => validateLon(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 disabled:opacity-50 ${
                      lonError
                        ? 'border-red-400 focus:ring-red-400'
                        : 'focus:ring-blue-500 ' + (darkMode ? 'border-gray-600' : 'border-gray-300')
                    } ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-800'}`}
                  />
                  {lonError && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> {lonError}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {/* ── END KOORDINAT ── */}

          </div>

          {/* Action Buttons */}
          <div className={`flex justify-end gap-3 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {loading ? 'Mengupdate...' : 'Update Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}