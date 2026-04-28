import { MapPin, Phone, Mail, Instagram, Twitter } from 'lucide-react';

interface FooterProps {
  darkMode: boolean;
  sidebarOpen: boolean;
}

export function Footer({ darkMode, sidebarOpen }: FooterProps) {
  return (
    <footer
      id="footer"
      style={{
        background: '#0f172a',
        color: 'white',
        marginLeft: sidebarOpen ? '256px' : '0',
        transition: 'margin-left .3s',
      }}
    >
      <style>{`
        /* Footer responsive grid */
        .footer-grid {
          display: grid;
          grid-template-columns: 260px 1fr 1fr;
          gap: 64px;
          align-items: flex-start;
        }
        .footer-collab {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .footer-logos {
          display: flex;
          gap: 24px;
          align-items: flex-start;
          justify-content: center;
          width: 100%;
        }
        .footer-wrap {
          padding: 56px 80px 48px;
        }

        /* Tablet ≤ 1024px */
        @media (max-width: 1024px) {
          .footer-wrap { padding: 48px 40px 40px; }
          .footer-grid { gap: 40px; }
        }

        /* Mobile ≤ 768px */
        @media (max-width: 768px) {
          .footer-wrap { padding: 40px 24px 32px; }
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 36px;
          }
          .footer-collab { align-items: flex-start; }
          .footer-logos { justify-content: flex-start; gap: 32px; }
        }
      `}</style>

      {/* Gradient top border */}
      <div style={{ height: '3px', background: 'linear-gradient(90deg,#2563eb 0%,#06b6d4 50%,#2563eb 100%)' }} />

      <div className="footer-wrap">
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="footer-grid">

            {/* ── Col 1: In Collaboration with ── */}
            <div className="footer-collab">
              <p style={{ fontWeight: 700, fontSize: '14px', color: '#ffffff', marginBottom: '20px', textAlign: 'center', width: '100%' }}>
                In Collaboration with:
              </p>
              <div className="footer-logos">
                {/* BRIDA */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <img
                    src="/images/logo-brida-jatim.png"
                    alt="BRIDA"
                    style={{ height: '56px', width: 'auto', objectFit: 'contain', marginBottom: '10px' }}
                  />
                  <p style={{ fontSize: '12px', textAlign: 'center', lineHeight: 1.5, color: '#94a3b8', margin: 0 }}>
                    Badan Riset dan Inovasi<br />Daerah Prov. Jatim
                  </p>
                </div>
                {/* PENS */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <img
                    src="/images/logo-pens.png"
                    alt="PENS"
                    style={{ height: '56px', width: 'auto', objectFit: 'contain', marginBottom: '10px' }}
                  />
                  <p style={{ fontSize: '12px', textAlign: 'center', lineHeight: 1.5, color: '#94a3b8', margin: 0 }}>
                    Politeknik Elektronika Negeri<br />Surabaya
                  </p>
                </div>
              </div>
            </div>

            {/* ── Col 2: Hubungi Kami ── */}
            <div>
              <p style={{ fontWeight: 700, fontSize: '15px', color: '#ffffff', marginBottom: '20px' }}>
                Hubungi Kami
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <MapPin size={16} color="#94a3b8" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>
                    Jl. Gayung Kebonsari No.56<br />
                    Gayungan, Surabaya<br />
                    Jawa Timur 60235
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Phone size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
                  <a href="tel:+62318290738" style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'none', transition: 'color .2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                    (031) 8290738
                  </a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Mail size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
                  <a href="mailto:sec.dn@brin.go.id" style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'none', transition: 'color .2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                    sec.dn@brin.go.id
                  </a>
                </div>
              </div>
            </div>

            {/* ── Col 3: Ikuti Kami ── */}
            <div>
              <p style={{ fontWeight: 700, fontSize: '15px', color: '#ffffff', marginBottom: '20px' }}>
                Ikuti Kami
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <a href="https://www.instagram.com/bridajatim/" target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#94a3b8', textDecoration: 'none', transition: 'color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                  <div style={{ background: 'linear-gradient(135deg,#2563eb,#06b6d4)', borderRadius: '10px', padding: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Instagram size={17} color="white" />
                  </div>
                  <span style={{ fontSize: '14px' }}>@bridajatim</span>
                </a>
                <a href="https://x.com/balitbangjatim" target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#94a3b8', textDecoration: 'none', transition: 'color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                  <div style={{ background: 'linear-gradient(135deg,#2563eb,#06b6d4)', borderRadius: '10px', padding: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Twitter size={17} color="white" />
                  </div>
                  <span style={{ fontSize: '14px' }}>@balitbangjatim</span>
                </a>
              </div>
            </div>

          </div>

          {/* Copyright */}
          <div style={{ maxWidth: '1000px', margin: '40px auto 0', paddingTop: '24px', borderTop: '1px solid rgba(100,116,139,.22)', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              © {new Date().getFullYear()} BRIDA Jatim. All Rights Reserved
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
