import { useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import logo from '/images/logo-brida-jatim.png';

interface AIResult {
  judul_kolaborasi: string;
  manfaat_kolaborasi: string[];
  alasan_sinergi: string;
  potensi_dampak: string[];
  tingkat_kolaborasi: string;
}

interface ReportAIRecommendationProps {
  onClose: () => void;
  data: {
    cluster_id: number;
    skor_kolaborasi: number;
    inovasi_1: {
      id: number;
      judul: string;
      opd?: string;
      urusan: string;
      tahap: string;
      kematangan: string;
      deskripsi?: string;
      tanggal_penerapan?: string;
    };
    inovasi_2: {
      id: number;
      judul: string;
      opd?: string;
      urusan: string;
      tahap: string;
      kematangan: string;
      deskripsi?: string;
      tanggal_penerapan?: string;
    };
    hasil_ai?: AIResult;
  };
}

const formatTanggal = (raw?: string): string => {
  if (!raw) return '-';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

const NumberedList = ({ items, color }: { items: string[]; color: string }) => (
  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
    {items.map((item, i) => (
      <li key={i} style={{ fontSize: '11px', color: '#374151', marginBottom: '7px', lineHeight: '1.6', paddingLeft: '22px', position: 'relative' }}>
        <span style={{ position: 'absolute', left: 0, fontWeight: 'bold', color, fontSize: '12px' }}>{i + 1}.</span>
        {item}
      </li>
    ))}
  </ul>
);

const SectionTitle = ({ children, borderColor }: { children: React.ReactNode; borderColor: string }) => (
  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 10px 0', paddingLeft: '10px', borderLeft: `4px solid ${borderColor}` }}>
    {children}
  </h3>
);

const Footer = () => (
  <div style={{ paddingTop: '12px', borderTop: '2px solid #e5e7eb', textAlign: 'center' }}>
    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 3px 0' }}>BADAN RISET DAN INOVASI DAERAH PROVINSI JAWA TIMUR</p>
    <p style={{ fontSize: '10px', color: '#6b7280', margin: 0, lineHeight: '1.5' }}>Jl. Gayung Kebonsari No.56, Gayungan, Kec. Gayungan, Surabaya, Jawa Timur 60235</p>
    <p style={{ fontSize: '10px', color: '#6b7280', margin: 0 }}>Email: brida@jatimprov.go.id | Website: brida.jatimprov.go.id</p>
  </div>
);

export function ReportAIRecommendation({ onClose, data }: ReportAIRecommendationProps) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Memuat komponen...');
  const [aiData, setAiData] = useState<AIResult | null>(data.hasil_ai || null);
  const [isLoadingAI, setIsLoadingAI] = useState(!data.hasil_ai);

  useEffect(() => {
    const fetchAIData = async () => {
      if (data.hasil_ai) { setIsLoadingAI(false); return; }
      try {
        const res = await fetch(`http://localhost:8000/ai-input-collaboration/simulate?inovasi_1_id=${data.inovasi_1.id}&inovasi_2_id=${data.inovasi_2.id}`);
        if (res.ok) setAiData((await res.json()).hasil_ai);
      } catch (e) { console.error(e); }
      finally { setIsLoadingAI(false); }
    };
    fetchAIData();
  }, [data]);

  useEffect(() => {
    if (isLoadingAI) return;
    const generate = async () => {
      try {
        setIsGenerating(true);
        setProgress(10); setStatusMessage('Menunggu render komponen...');
        await new Promise(r => setTimeout(r, 1500));
        setProgress(30); setStatusMessage('Memverifikasi elemen visual...');
        await new Promise(r => setTimeout(r, 1000));
        const page1 = document.getElementById('report-page-1');
        const page2 = document.getElementById('report-page-2');
        if (!page1 || !page2) { alert('Error: Konten laporan tidak ditemukan.'); onClose(); return; }
        const opts = { scale: 2.5, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false };
        setProgress(50); setStatusMessage('Membuat screenshot halaman 1...');
        await new Promise(r => setTimeout(r, 300));
        const c1 = await html2canvas(page1, opts);
        setProgress(65); setStatusMessage('Membuat screenshot halaman 2...');
        await new Promise(r => setTimeout(r, 300));
        const c2 = await html2canvas(page2, opts);
        setProgress(80); setStatusMessage('Mengkonversi ke PDF...');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const w = pdf.internal.pageSize.getWidth();
        pdf.addImage(c1.toDataURL('image/png', 1.0), 'PNG', 0, 0, w, (c1.height * w) / c1.width);
        pdf.addPage();
        pdf.addImage(c2.toDataURL('image/png', 1.0), 'PNG', 0, 0, w, (c2.height * w) / c2.width);
        setProgress(95); setStatusMessage('Menyimpan file...');
        pdf.save(`Rekomendasi_Kolaborasi_Cluster_${data.cluster_id}_${Date.now()}.pdf`);
        setProgress(100); setStatusMessage('PDF berhasil dibuat!');
        setTimeout(() => onClose(), 1500);
      } catch (e) { console.error(e); alert('Gagal membuat PDF.'); onClose(); }
      finally { setIsGenerating(false); }
    };
    generate();
  }, [isLoadingAI, data.cluster_id]);

  const scorePercent = Math.round(data.skor_kolaborasi * 100);
  const getCategory = (s: number) => s >= 0.9 ? 'Sangat Cocok' : s >= 0.7 ? 'Potensial' : 'Cukup Cocok';
  const getCategoryColor = (c: string) => c === 'Sangat Cocok' ? '#16A34A' : c === 'Potensial' ? '#3b82f6' : '#f59e0b';
  const category = getCategory(data.skor_kolaborasi);
  const categoryColor = getCategoryColor(category);

  const pageStyle: React.CSSProperties = {
    width: '210mm', minHeight: '297mm', backgroundColor: 'white',
    padding: '18mm 20mm', fontFamily: 'Arial, sans-serif', color: '#000',
    boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', maxWidth: '500px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        {isLoadingAI ? (
          <>
            <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px', textAlign: 'center' }}>Memuat Data AI...</h3>
            <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: '9999px', height: '10px', overflow: 'hidden', marginBottom: '12px' }}>
              <div style={{ width: '50%', height: '100%', backgroundColor: '#3b82f6' }} />
            </div>
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Mengambil analisis AI...</p>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px', textAlign: 'center' }}>{isGenerating ? 'Membuat PDF...' : 'PDF Siap!'}</h3>
            <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: '9999px', height: '10px', overflow: 'hidden', marginBottom: '12px' }}>
              <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#3b82f6', transition: 'width 0.3s ease' }} />
            </div>
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '13px', marginBottom: '20px' }}>{statusMessage}</p>
            {!isGenerating && (
              <button onClick={onClose} style={{ width: '100%', padding: '10px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Tutup</button>
            )}
          </>
        )}
      </div>

      {!isLoadingAI && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>

          {/* PAGE 1: Header + Detail Inovasi + Deskripsi */}
          <div id="report-page-1" style={pageStyle}>

            {/* Header: tanggal kiri | logo+judul tengah | skor kanan */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '18px', paddingBottom: '16px', borderBottom: '4px solid #2563EB' }}>
              {/* Kiri */}
              <div style={{ minWidth: '110px' }}>
                <p style={{ fontSize: '9px', color: '#6b7280', margin: '0 0 4px 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'Arial, sans-serif' }}>TANGGAL DIBUAT</p>
                <p style={{ fontSize: '12px', color: '#1f2937', margin: 0, fontWeight: '700', fontFamily: 'Arial, sans-serif', lineHeight: '1.3' }}>
                  {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              {/* Tengah */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <img src={logo} alt="Logo" style={{ height: '52px', margin: '0 auto 5px', display: 'block', objectFit: 'contain' }} />
                <h1 style={{ fontSize: '17px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 2px 0', lineHeight: '1.2', fontFamily: 'Arial, sans-serif' }}>Rekomendasi Kolaborasi Inovasi</h1>
              </div>
              {/* Kanan — Skor Kecocokan */}
              <div style={{
                minWidth: '110px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}>
                <p style={{
                  fontSize: '9px', color: '#6b7280', margin: '0 0 4px 0',
                  fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em',
                  fontFamily: 'Arial, sans-serif',
                }}>
                  SKOR KECOCOKAN
                </p>
                <p style={{
                  fontSize: '28px', fontWeight: '900', color: categoryColor,
                  margin: 0, lineHeight: '1.1', fontFamily: 'Arial, sans-serif',
                }}>
                  {scorePercent}%
                </p>
                <p style={{
                  fontSize: '11px', color: categoryColor,
                  margin: '3px 0 0 0', fontWeight: '700', fontFamily: 'Arial, sans-serif',
                }}>
                  {category}
                </p>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <SectionTitle borderColor="#2563EB">Detail Inovasi</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                {/* Inovasi 1 */}
                <div style={{ padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '2px solid #3b82f6' }}>
                  <p style={{ fontSize: '10px', color: '#6b7280', margin: '0 0 5px 0', fontWeight: '700', letterSpacing: '0.06em' }}>INOVASI 1</p>
                  <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 7px 0', lineHeight: '1.4' }}>{data.inovasi_1.judul}</h4>
                  {data.inovasi_1.opd && <p style={{ fontSize: '10px', color: '#4b5563', margin: '0 0 3px 0' }}><strong>OPD:</strong> {data.inovasi_1.opd}</p>}
                  <p style={{ fontSize: '10px', color: '#4b5563', margin: '0 0 3px 0' }}><strong>Urusan:</strong> {data.inovasi_1.urusan}</p>
                  <p style={{ fontSize: '10px', color: '#4b5563', margin: '0 0 3px 0' }}><strong>Tahap:</strong> {data.inovasi_1.tahap}</p>
                  <p style={{ fontSize: '10px', color: '#4b5563', margin: '0 0 3px 0' }}><strong>Kematangan:</strong> {data.inovasi_1.kematangan}</p>
                  <p style={{ fontSize: '10px', color: '#4b5563', margin: '0 0 10px 0' }}><strong>Tgl. Penerapan:</strong> {formatTanggal(data.inovasi_1.tanggal_penerapan)}</p>
                  {data.inovasi_1.deskripsi && (
                    <div style={{ backgroundColor: '#dbeafe', borderRadius: '6px', padding: '8px 10px', borderLeft: '3px solid #3b82f6' }}>
                      <p style={{ fontSize: '10px', color: '#1e40af', margin: '0 0 4px 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deskripsi Inovasi 1</p>
                      <p style={{ fontSize: '10px', color: '#1f2937', margin: 0, lineHeight: '1.6', textAlign: 'justify' }}>{data.inovasi_1.deskripsi}</p>
                    </div>
                  )}
                </div>

                {/* Inovasi 2 */}
                <div style={{ padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '8px', border: '2px solid #16A34A' }}>
                  <p style={{ fontSize: '10px', color: '#6b7280', margin: '0 0 5px 0', fontWeight: '700', letterSpacing: '0.06em' }}>INOVASI 2</p>
                  <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 7px 0', lineHeight: '1.4' }}>{data.inovasi_2.judul}</h4>
                  {data.inovasi_2.opd && <p style={{ fontSize: '10px', color: '#4b5563', margin: '0 0 3px 0' }}><strong>OPD:</strong> {data.inovasi_2.opd}</p>}
                  <p style={{ fontSize: '10px', color: '#4b5563', margin: '0 0 3px 0' }}><strong>Urusan:</strong> {data.inovasi_2.urusan}</p>
                  <p style={{ fontSize: '10px', color: '#4b5563', margin: '0 0 3px 0' }}><strong>Tahap:</strong> {data.inovasi_2.tahap}</p>
                  <p style={{ fontSize: '10px', color: '#4b5563', margin: '0 0 3px 0' }}><strong>Kematangan:</strong> {data.inovasi_2.kematangan}</p>
                  <p style={{ fontSize: '10px', color: '#4b5563', margin: '0 0 10px 0' }}><strong>Tgl. Penerapan:</strong> {formatTanggal(data.inovasi_2.tanggal_penerapan)}</p>
                  {data.inovasi_2.deskripsi && (
                    <div style={{ backgroundColor: '#bbf7d0', borderRadius: '6px', padding: '8px 10px', borderLeft: '3px solid #16A34A' }}>
                      <p style={{ fontSize: '10px', color: '#166534', margin: '0 0 4px 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deskripsi Inovasi 2</p>
                      <p style={{ fontSize: '10px', color: '#1f2937', margin: 0, lineHeight: '1.6', textAlign: 'justify' }}>{data.inovasi_2.deskripsi}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '12px' }}><Footer /></div>
          </div>

          {/* PAGE 2: Judul + Tingkat + Manfaat + Alasan + Dampak + Langkah */}
          <div id="report-page-2" style={pageStyle}>
            <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '3px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Analisis Kolaborasi</h2>
            </div>

            <div style={{ flex: 1 }}>
              {aiData && (
                <>
                  {/* Judul + Tingkat */}
                  <div style={{ marginBottom: '14px', backgroundColor: '#FAF5FF', padding: '12px 14px', borderRadius: '8px', border: '3px solid #9333EA' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 5px 0', lineHeight: '1.4' }}>🤝 {aiData.judul_kolaborasi}</h3>
                    <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, fontWeight: '600' }}>
                      Tingkat Kolaborasi: <span style={{ color: '#9333EA', fontWeight: 'bold' }}>{aiData.tingkat_kolaborasi}</span>
                    </p>
                  </div>

                  {/* Manfaat */}
                  <div style={{ marginBottom: '14px' }}>
                    <SectionTitle borderColor="#16A34A">✓ Manfaat Kolaborasi</SectionTitle>
                    <div style={{ backgroundColor: '#F0FDF4', padding: '10px 12px', borderRadius: '8px', border: '2px solid #16A34A' }}>
                      {Array.isArray(aiData.manfaat_kolaborasi)
                        ? <NumberedList items={aiData.manfaat_kolaborasi} color="#16A34A" />
                        : <p style={{ fontSize: '11px', color: '#374151', margin: 0, lineHeight: '1.6' }}>{aiData.manfaat_kolaborasi}</p>}
                    </div>
                  </div>

                  {/* Alasan */}
                  <div style={{ marginBottom: '14px' }}>
                    <SectionTitle borderColor="#3B82F6">🔗 Alasan Sinergi</SectionTitle>
                    <div style={{ backgroundColor: '#EFF6FF', padding: '10px 12px', borderRadius: '8px', border: '2px solid #3B82F6' }}>
                      <p style={{ fontSize: '11px', color: '#374151', margin: 0, lineHeight: '1.7' }}>{aiData.alasan_sinergi}</p>
                    </div>
                  </div>

                  {/* Dampak */}
                  <div style={{ marginBottom: '14px' }}>
                    <SectionTitle borderColor="#F59E0B">📈 Potensi Dampak</SectionTitle>
                    <div style={{ backgroundColor: '#FFFBEB', padding: '10px 12px', borderRadius: '8px', border: '2px solid #F59E0B' }}>
                      {Array.isArray(aiData.potensi_dampak)
                        ? <NumberedList items={aiData.potensi_dampak} color="#F59E0B" />
                        : <p style={{ fontSize: '11px', color: '#374151', margin: 0, lineHeight: '1.6' }}>{aiData.potensi_dampak}</p>}
                    </div>
                  </div>
                </>
              )}

              {/* Langkah */}
              <div style={{ backgroundColor: '#ECFDF5', padding: '12px 14px', borderRadius: '8px', border: '3px solid #16A34A' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 10px 0' }}>💡 Langkah Selanjutnya</h3>
                <NumberedList color="#16A34A" items={[
                  'Koordinasikan pertemuan antara pihak-pihak terkait untuk membahas kolaborasi',
                  'Buat proposal kolaborasi dengan detail manfaat dan target capaian yang terukur',
                  'Susun timeline implementasi dan alokasi sumber daya',
                  'Monitor dan evaluasi progress kolaborasi secara berkala',
                ]} />
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '12px' }}><Footer /></div>
          </div>
        </div>
      )}
    </div>
  );
}
