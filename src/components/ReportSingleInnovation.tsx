import { useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import logo from '/images/logo-brida-jatim.png';

interface ReportCollaborationProps {
  onClose: () => void;
  data: {
    inovasi_1: { judul: string; opd: string; urusan?: string; tahap?: string; tanggal_penerapan?: string; admin?: string; deskripsi?: string };
    inovasi_2: { judul: string; opd: string; urusan?: string; tahap?: string; tanggal_penerapan?: string; admin?: string; deskripsi?: string };
    skor_kecocokan: number;
    kategori: string;
    hasil_ai: {
      judul_kolaborasi?: string;
      tingkat_kolaborasi?: string;
      manfaat: string[];
      alasan: string[];
      dampak: string[];
    };
  };
}

function splitDeskripsiToParagraphs(text: string): string[] {
  if (!text) return [];
  const clean = text.replace(/\n+/g, ' ').trim();
  const sentences = clean.match(/[^.!?]+[.!?]+/g) ?? [clean];
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    paragraphs.push(sentences.slice(i, i + 3).map(s => s.trim()).join(' '));
  }
  return paragraphs;
}

export default function ReportCollaboration({ onClose, data }: ReportCollaborationProps) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Memuat komponen...');

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#16A34A';
    if (score >= 70) return '#3b82f6';
    return '#f59e0b';
  };
  const scoreColor = getScoreColor(data.skor_kecocokan);

  const formatTanggal = (raw?: string) => {
    if (!raw) return '-';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const Footer = () => (
    <div style={{ paddingTop: '14px', borderTop: '2px solid #e5e7eb', textAlign: 'center' }}>
      <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
        BADAN RISET DAN INOVASI DAERAH PROVINSI JAWA TIMUR
      </p>
      <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0 0', lineHeight: '1.6' }}>
        Jl. Gayung Kebonsari No.56, Gayungan, Kec. Gayungan Surabaya, Jawa Timur 60235
        <br />Email: balitbangjatim@gmail.com | Website: brida.jatimprov.go.id/
      </p>
    </div>
  );

  const htmlOpts = {
    scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
    onclone: (clonedDoc: Document) => {
      clonedDoc.querySelectorAll('*').forEach((el) => {
        const style = clonedDoc.defaultView?.getComputedStyle(el);
        if (!style) return;
        ['color', 'backgroundColor', 'borderColor', 'boxShadow'].forEach((prop) => {
          if (style.getPropertyValue(prop).includes('oklch'))
            (el as HTMLElement).style.setProperty(prop, '#000000');
        });
      });
    },
  };

  useEffect(() => {
    const generatePDF = async () => {
      try {
        setIsGenerating(true);
        setProgress(10); setStatusMessage('Menunggu render komponen...');
        await new Promise(r => setTimeout(r, 800));
        setProgress(40); setStatusMessage('Memverifikasi elemen visual...');

        const page1 = document.getElementById('pdf-page-1');
        const page2 = document.getElementById('pdf-page-2');
        if (!page1 || !page2) { alert('Error: Konten laporan tidak ditemukan.'); onClose(); return; }

        setProgress(60); setStatusMessage('Membuat screenshot halaman...');
        await document.fonts.ready;
        await new Promise(r => setTimeout(r, 300));

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const margin = 15;
        const imgWidth = pdfWidth - margin * 2;

        const canvas1 = await html2canvas(page1, { ...htmlOpts, windowWidth: page1.scrollWidth, windowHeight: page1.scrollHeight });
        pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', margin, margin, imgWidth, (canvas1.height * imgWidth) / canvas1.width);

        setProgress(80); setStatusMessage('Membuat halaman kedua...');
        pdf.addPage();
        const canvas2 = await html2canvas(page2, { ...htmlOpts, windowWidth: page2.scrollWidth, windowHeight: page2.scrollHeight });
        pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', margin, margin, imgWidth, (canvas2.height * imgWidth) / canvas2.width);

        setProgress(95); setStatusMessage('Menyimpan file...');
        const t1 = data.inovasi_1.judul.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 25);
        const t2 = data.inovasi_2.judul.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 25);
        pdf.save(`BRIDA_Kolaborasi_${t1}_${t2}_${new Date().toISOString().split('T')[0]}.pdf`);

        setProgress(100); setStatusMessage('Selesai!');
        setTimeout(() => onClose(), 500);
      } catch (e) {
        console.error('Error generating PDF:', e);
        alert('Terjadi kesalahan saat membuat PDF. Silakan coba lagi.');
        onClose();
      } finally { setIsGenerating(false); }
    };
    const timer = setTimeout(() => generatePDF(), 300);
    return () => clearTimeout(timer);
  }, [onClose, data]);

  const pageStyle: React.CSSProperties = {
    backgroundColor: '#ffffff', padding: '28px',
    minHeight: '1050px', maxHeight: '1050px',
    display: 'flex', flexDirection: 'column',
    maxWidth: '794px', width: '100%', margin: '0 auto',
    boxSizing: 'border-box',
  };

  const desc1 = splitDeskripsiToParagraphs(data.inovasi_1.deskripsi ?? '');
  const desc2 = splitDeskripsiToParagraphs(data.inovasi_2.deskripsi ?? '');

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(17,24,39,0.75)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
        maxWidth: '1400px', width: '100%', maxHeight: '90vh',
        overflow: 'auto', position: 'relative',
      }}>
        {isGenerating && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.95)', zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '32px', borderRadius: '12px',
          }}>
            <div style={{ width: '60px', height: '60px', border: '4px solid #E5E7EB', borderTop: '4px solid #2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', marginBottom: '10px' }}>Generating PDF Report</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', marginBottom: '14px' }}>{statusMessage}</p>
            <div style={{ width: '100%', maxWidth: '400px', height: '8px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#2563EB', transition: 'width 0.3s ease', borderRadius: '4px' }} />
            </div>
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>{progress}%</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        <div style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Preview Laporan Inovasi</h2>
            <button onClick={onClose} style={{ color: '#6b7280', fontSize: '26px', fontWeight: 'bold', border: 'none', background: 'none', cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>×</button>
          </div>

          {/* ════ PAGE 1 ════ */}
          <div id="pdf-page-1" style={{ ...pageStyle, marginBottom: '30px' }}>

            {/*
              HEADER 3 KOLOM:
              Kiri: Tanggal Dibuat
              Tengah: Logo + Judul (teks di bawah logo)
              Kanan: Skor Kecocokan (teks angka, tanpa kotak berwarna)
            */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '16px',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '3px solid #2563EB',
            }}>
              {/* Kiri — Tanggal */}
              <div style={{ minWidth: '110px', paddingTop: '6px' }}>
                <p style={{ fontSize: '9px', color: '#6b7280', margin: '0 0 4px 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Tanggal Dibuat
                </p>
                <p style={{ fontSize: '13px', color: '#1f2937', margin: 0, fontWeight: 'bold' }}>
                  {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Tengah — Logo + Judul */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <img src={logo} alt="BRIDA Jatim"
                  style={{ height: '52px', display: 'block', margin: '0 auto 6px', objectFit: 'contain' }} />
                <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 2px 0', lineHeight: '1.2' }}>
                  Laporan Analisis Potensi Kolaborasi Inovasi
                </h1>
              </div>

              {/* Kanan — Skor (center, sama dengan ReportAIRecommendation) */}
              <div style={{ minWidth: '110px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <p style={{ fontSize: '9px', color: '#6b7280', margin: '0 0 4px 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  SKOR KECOCOKAN
                </p>
                <p style={{ fontSize: '26px', fontWeight: '900', color: scoreColor, margin: '0 0 2px 0', lineHeight: '1' }}>
                  {data.skor_kecocokan}%
                </p>
                <p style={{ fontSize: '11px', color: scoreColor, margin: 0, fontWeight: '700' }}>
                  {data.kategori}
                </p>
              </div>
            </div>

            {/* Detail Inovasi */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 12px 0', paddingLeft: '10px', borderLeft: '4px solid #2563EB' }}>
                Detail Inovasi
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                {/* Inovasi 1 */}
                <div style={{ backgroundColor: '#EFF6FF', padding: '12px', borderRadius: '8px', border: '2px solid #3b82f6' }}>
                  <p style={{ fontSize: '10px', color: '#6b7280', margin: '0 0 5px 0', fontWeight: '700', letterSpacing: '0.06em' }}>INOVASI 1</p>
                  <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 7px 0', lineHeight: '1.4' }}>{data.inovasi_1.judul}</h4>
                  <p style={{ fontSize: '10px', color: '#4b5563', margin: '0 0 3px 0' }}><strong>OPD:</strong> {data.inovasi_1.opd}</p>
                  {data.inovasi_1.urusan && <p style={{ fontSize: '10px', color: '#4b5563', margin: '0 0 3px 0' }}><strong>Urusan:</strong> {data.inovasi_1.urusan}</p>}
                  {data.inovasi_1.tahap && <p style={{ fontSize: '10px', color: '#4b5563', margin: '0 0 3px 0' }}><strong>Tahap:</strong> {data.inovasi_1.tahap}</p>}
                  <p style={{ fontSize: '10px', color: '#4b5563', margin: '0 0 10px 0' }}><strong>Tgl. Penerapan:</strong> {formatTanggal(data.inovasi_1.tanggal_penerapan)}</p>
                  {desc1.length > 0 && (
                    <div style={{ backgroundColor: '#dbeafe', borderRadius: '6px', padding: '8px 10px', borderLeft: '3px solid #3b82f6' }}>
                      <p style={{ fontSize: '10px', color: '#1e40af', margin: '0 0 5px 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deskripsi</p>
                      {desc1.map((para, i) => (
                        <p key={i} style={{ fontSize: '10px', color: '#1f2937', margin: i < desc1.length - 1 ? '0 0 5px 0' : '0', lineHeight: '1.65', textAlign: 'justify' }}>{para}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Inovasi 2 */}
                <div style={{ backgroundColor: '#F0FDF4', padding: '12px', borderRadius: '8px', border: '2px solid #16a34a' }}>
                  <p style={{ fontSize: '10px', color: '#6b7280', margin: '0 0 5px 0', fontWeight: '700', letterSpacing: '0.06em' }}>INOVASI 2</p>
                  <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 7px 0', lineHeight: '1.4' }}>{data.inovasi_2.judul}</h4>
                  <p style={{ fontSize: '10px', color: '#4b5563', margin: '0 0 3px 0' }}><strong>OPD:</strong> {data.inovasi_2.opd}</p>
                  {data.inovasi_2.urusan && <p style={{ fontSize: '10px', color: '#4b5563', margin: '0 0 3px 0' }}><strong>Urusan:</strong> {data.inovasi_2.urusan}</p>}
                  {data.inovasi_2.tahap && <p style={{ fontSize: '10px', color: '#4b5563', margin: '0 0 3px 0' }}><strong>Tahap:</strong> {data.inovasi_2.tahap}</p>}
                  <p style={{ fontSize: '10px', color: '#4b5563', margin: '0 0 10px 0' }}><strong>Tgl. Penerapan:</strong> {formatTanggal(data.inovasi_2.tanggal_penerapan)}</p>
                  {desc2.length > 0 && (
                    <div style={{ backgroundColor: '#bbf7d0', borderRadius: '6px', padding: '8px 10px', borderLeft: '3px solid #16a34a' }}>
                      <p style={{ fontSize: '10px', color: '#166534', margin: '0 0 5px 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deskripsi</p>
                      {desc2.map((para, i) => (
                        <p key={i} style={{ fontSize: '10px', color: '#1f2937', margin: i < desc2.length - 1 ? '0 0 5px 0' : '0', lineHeight: '1.65', textAlign: 'justify' }}>{para}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'auto' }}><Footer /></div>
          </div>

          {/* ════ PAGE 2 ════ */}
          <div id="pdf-page-2" style={pageStyle}>

            {/* Header page 2 */}
            <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '3px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Analisis Kolaborasi</h2>
            </div>

            {data.hasil_ai.judul_kolaborasi && (
              <div style={{ marginBottom: '14px', backgroundColor: '#FAF5FF', padding: '12px 14px', borderRadius: '8px', border: '3px solid #9333EA' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 5px 0', lineHeight: '1.4' }}>🤝 {data.hasil_ai.judul_kolaborasi}</h3>
                {data.hasil_ai.tingkat_kolaborasi && (
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, fontWeight: '600' }}>
                    Tingkat Kolaborasi: <span style={{ color: '#9333EA', fontWeight: 'bold' }}>{data.hasil_ai.tingkat_kolaborasi}</span>
                  </p>
                )}
              </div>
            )}

            {data.hasil_ai.manfaat?.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 10px 0', paddingLeft: '10px', borderLeft: '4px solid #16A34A' }}>✓ Manfaat Kolaborasi</h3>
                <div style={{ backgroundColor: '#F0FDF4', padding: '10px 12px', borderRadius: '8px', border: '2px solid #16A34A' }}>
                  {data.hasil_ai.manfaat.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: i < data.hasil_ai.manfaat.length - 1 ? '7px' : '0' }}>
                      <span style={{ minWidth: '18px', fontWeight: 'bold', color: '#16A34A', fontSize: '12px', flexShrink: 0 }}>{i + 1}.</span>
                      <span style={{ fontSize: '11px', lineHeight: '1.7', color: '#1f2937' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.hasil_ai.alasan?.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 10px 0', paddingLeft: '10px', borderLeft: '4px solid #3B82F6' }}>🔗 Alasan Sinergi</h3>
                <div style={{ backgroundColor: '#EFF6FF', padding: '10px 12px', borderRadius: '8px', border: '2px solid #3B82F6' }}>
                  {data.hasil_ai.alasan.map((item, i) => (
                    <p key={i} style={{ fontSize: '11px', color: '#374151', margin: i < data.hasil_ai.alasan.length - 1 ? '0 0 6px 0' : '0', lineHeight: '1.7' }}>{item}</p>
                  ))}
                </div>
              </div>
            )}

            {data.hasil_ai.dampak?.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 10px 0', paddingLeft: '10px', borderLeft: '4px solid #F59E0B' }}>📈 Potensi Dampak</h3>
                <div style={{ backgroundColor: '#FFFBEB', padding: '10px 12px', borderRadius: '8px', border: '2px solid #F59E0B' }}>
                  {data.hasil_ai.dampak.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: i < data.hasil_ai.dampak.length - 1 ? '7px' : '0' }}>
                      <span style={{ minWidth: '18px', fontWeight: 'bold', color: '#F59E0B', fontSize: '12px', flexShrink: 0 }}>{i + 1}.</span>
                      <span style={{ fontSize: '11px', lineHeight: '1.7', color: '#1f2937' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ backgroundColor: '#ECFDF5', padding: '12px 14px', borderRadius: '8px', border: '3px solid #16A34A' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 10px 0' }}>💡 Langkah Selanjutnya</h3>
              {[
                'Koordinasikan pertemuan antara pihak-pihak terkait untuk membahas kolaborasi',
                'Buat proposal kolaborasi dengan detail manfaat dan target capaian yang terukur',
                'Susun timeline implementasi dan alokasi sumber daya',
                'Monitor dan evaluasi progress kolaborasi secara berkala',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: i < 3 ? '7px' : '0' }}>
                  <span style={{ minWidth: '18px', fontWeight: 'bold', color: '#16A34A', fontSize: '12px', flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ fontSize: '11px', lineHeight: '1.7', color: '#1f2937' }}>{step}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 'auto' }}><Footer /></div>
          </div>

        </div>
      </div>
    </div>
  );
}
