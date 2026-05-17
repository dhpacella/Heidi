import React, { useState } from 'react';
import Poll from './Poll';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;0,900;1,400&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html, body { overflow-x: hidden; max-width: 100vw; }

  .hp { font-family: 'Source Sans 3', sans-serif; color: #1a1a1a; background: #fff; overflow-x: hidden; }

  /* ── HEADER ── */
  .hp-header {
    background: #fff;
    border-bottom: 3px solid #1b3a2b;
    padding: 0 6%;
    display: flex;
    align-items: stretch;
    justify-content: space-between;
  }
  .hp-header-name {
    font-family: 'Merriweather', serif;
    font-size: 20px;
    font-weight: 900;
    color: #1b3a2b;
    padding: 20px 0;
    letter-spacing: -0.3px;
  }
  .hp-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .hp-badge {
    background: #1b3a2b;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 8px 20px;
    height: 100%;
    display: flex;
    align-items: center;
  }

  /* ── HERO ── */
  .hp-hero {
    display: grid;
    grid-template-columns: 1fr 480px;
    min-height: 580px;
    background: #1b3a2b;
  }
  .hp-hero-left {
    padding: 80px 6% 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .hp-hero-eyebrow {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #c9a84c;
    margin-bottom: 24px;
  }
  .hp-hero h1 {
    font-family: 'Merriweather', serif;
    font-size: 54px;
    font-weight: 900;
    color: #fff;
    line-height: 1.12;
    margin-bottom: 28px;
    letter-spacing: -1px;
  }
  .hp-hero h1 span { color: #c9a84c; }
  .hp-hero-sub {
    font-size: 18px;
    font-weight: 300;
    color: #a8c4b4;
    line-height: 1.7;
    max-width: 460px;
    margin-bottom: 44px;
  }
  .hp-hero-btns { display: flex; gap: 14px; flex-wrap: wrap; }
  .hp-btn-gold {
    background: #c9a84c;
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 15px 36px;
    text-decoration: none;
    border: none;
    cursor: pointer;
    display: inline-block;
    transition: background 0.2s, transform 0.15s;
  }
  .hp-btn-gold:hover { background: #b8922e; transform: translateY(-2px); }
  .hp-btn-ghost {
    background: transparent;
    color: rgba(255,255,255,0.8);
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 14px 36px;
    text-decoration: none;
    border: 1px solid rgba(255,255,255,0.3);
    display: inline-block;
    transition: all 0.2s;
  }
  .hp-btn-ghost:hover { border-color: #c9a84c; color: #c9a84c; }

  .hp-hero-photo {
    position: relative;
    overflow: hidden;
    background: #163024;
  }
  .hp-hero-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 15%;
    display: block;
    filter: grayscale(15%);
  }
  .hp-hero-photo::after {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 80px;
    background: linear-gradient(to right, #1b3a2b, transparent);
  }

  /* ── QUOTE ── */
  .hp-quote {
    background: #f7f3eb;
    padding: 56px 6%;
    border-bottom: 1px solid #e5ddd0;
    text-align: center;
  }
  .hp-quote blockquote {
    font-family: 'Merriweather', serif;
    font-size: 22px;
    font-style: italic;
    font-weight: 400;
    color: #1b3a2b;
    max-width: 780px;
    margin: 0 auto 14px;
    line-height: 1.7;
  }
  .hp-quote cite {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #c9a84c;
    font-style: normal;
  }

  /* ── SECTIONS ── */
  .hp-sec {
    padding: 80px 6%;
    max-width: 1280px;
    margin: 0 auto;
  }
  .hp-sec-wide {
    padding: 80px 6%;
  }
  .hp-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #c9a84c;
    margin-bottom: 12px;
  }
  .hp-title {
    font-family: 'Merriweather', serif;
    font-size: 38px;
    font-weight: 900;
    color: #1b3a2b;
    margin-bottom: 52px;
    line-height: 1.2;
    letter-spacing: -0.5px;
  }

  /* ── PILLARS ── */
  .hp-pillars {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
    border: 1px solid #e0e0e0;
  }
  .hp-pillar {
    padding: 44px 36px;
    border-right: 1px solid #e0e0e0;
    transition: background 0.2s;
  }
  .hp-pillar:last-child { border-right: none; }
  .hp-pillar:hover { background: #f9faf9; }
  .hp-pillar-n {
    font-family: 'Merriweather', serif;
    font-size: 48px;
    font-weight: 900;
    color: #eef2ef;
    margin-bottom: 20px;
    line-height: 1;
  }
  .hp-pillar h3 {
    font-size: 19px;
    font-weight: 700;
    color: #1b3a2b;
    margin-bottom: 12px;
  }
  .hp-pillar p {
    font-size: 15px;
    color: #555;
    line-height: 1.75;
  }

  /* ── ABOUT ── */
  .hp-about-wrap { background: #f4f7f5; border-top: 1px solid #e0e8e4; overflow: hidden; }
  .hp-about-grid {
    display: grid;
    grid-template-columns: 400px 1fr;
    gap: 72px;
    align-items: center;
    max-width: 1280px;
    width: 100%;
    margin: 0 auto;
    padding: 80px 6%;
  }
  .hp-about-photo {
    height: 650px;
    overflow: hidden;
    border-radius: 2px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.18);
    position: relative;
  }
  .hp-about-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
    display: block;
  }
  .hp-about {
    min-width: 0;
    overflow: hidden;
  }
  .hp-about p {
    font-size: 17px;
    line-height: 1.85;
    color: #333;
    margin-bottom: 22px;
  }
  .hp-creds {
    margin-top: 32px;
    padding-top: 28px;
    border-top: 1px solid #ccd9d3;
    display: flex;
    flex-direction: column;
    gap: 11px;
  }
  .hp-cred {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-size: 15px;
    color: #444;
    line-height: 1.4;
    overflow-wrap: break-word;
    word-break: break-word;
    min-width: 0;
  }
  .hp-cred::before {
    content: '—';
    color: #c9a84c;
    font-weight: 700;
    flex-shrink: 0;
    margin-top: 1px;
  }

  /* ── TRACK RECORD ── */
  .hp-track-wrap { background: #1b3a2b; }
  .hp-track-inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 80px 6%;
  }
  .hp-track-inner .hp-label { color: #c9a84c; }
  .hp-track-inner .hp-title { color: #fff; margin-bottom: 44px; }
  .hp-track-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border-top: 1px solid rgba(255,255,255,0.12);
  }
  .hp-track-item {
    padding: 36px 28px 36px 0;
    border-right: 1px solid rgba(255,255,255,0.1);
    padding-left: 28px;
    transition: background 0.2s;
  }
  .hp-track-item:last-child { border-right: none; }
  .hp-track-item:hover { background: rgba(255,255,255,0.04); }
  .hp-track-item h4 {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 10px;
    line-height: 1.3;
  }
  .hp-track-item p { font-size: 14px; color: #7ea898; line-height: 1.65; }

  /* ── CTA ── */
  .hp-cta {
    background: #fff;
    padding: 96px 6%;
    text-align: center;
    border-top: 1px solid #e8e8e8;
  }
  .hp-cta h2 {
    font-family: 'Merriweather', serif;
    font-size: 42px;
    font-weight: 900;
    color: #1b3a2b;
    margin-bottom: 18px;
    letter-spacing: -0.5px;
  }
  .hp-cta p {
    font-size: 18px;
    color: #666;
    max-width: 580px;
    margin: 0 auto 44px;
    line-height: 1.7;
    font-weight: 300;
  }

  /* ── NAV ── */
  .hp-nav {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .hp-nav a {
    font-size: 13px;
    font-weight: 600;
    color: #1b3a2b;
    text-decoration: none;
    padding: 8px 14px;
    letter-spacing: 0.5px;
    transition: color 0.15s;
  }
  .hp-nav a:hover { color: #c9a84c; }
  .hp-nav .hp-nav-cta {
    background: #1b3a2b;
    color: #fff;
    padding: 10px 20px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    text-decoration: none;
    transition: background 0.2s;
  }
  .hp-nav .hp-nav-cta:hover { background: #c9a84c; color: #fff; }
  .hp-hamburger {
    display: none;
    flex-direction: column;
    gap: 5px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
  }
  .hp-hamburger span {
    display: block;
    width: 24px;
    height: 2px;
    background: #1b3a2b;
    transition: all 0.2s;
  }
  .hp-mobile-menu {
    display: none;
    flex-direction: column;
    background: #fff;
    border-top: 1px solid #e8e8e8;
    padding: 12px 5%;
    gap: 4px;
  }
  .hp-mobile-menu.open { display: flex; }
  .hp-mobile-menu a {
    font-size: 16px;
    font-weight: 600;
    color: #1b3a2b;
    text-decoration: none;
    padding: 14px 0;
    border-bottom: 1px solid #f0f0f0;
    letter-spacing: 0.3px;
  }
  .hp-mobile-menu a:last-child { border-bottom: none; }

  /* ── FOOTER ── */
  .hp-footer {
    background: #111;
    padding: 26px 6%;
    text-align: center;
    color: #555;
    font-size: 13px;
    letter-spacing: 0.3px;
  }

  /* ── FLOCK + FAQ GRIDS (using classes so media queries can override) ── */
  .hp-flock-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 48px;
    align-items: start;
  }
  .hp-faq-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 40px;
  }

  /* ── RESPONSIVE: tablet ── */
  @media (max-width: 900px) {
    .hp-hero { grid-template-columns: 1fr; }
    .hp-hero-photo { height: 420px; order: -1; }
    .hp-hero-left { padding: 48px 6% 40px; }
    .hp-hero h1 { font-size: 36px; }
    .hp-hero-sub { font-size: 16px; }
    .hp-pillars { grid-template-columns: 1fr; }
    .hp-pillar { border-right: none; border-bottom: 1px solid #e0e0e0; }
    .hp-about-grid { grid-template-columns: 1fr; gap: 32px; }
    .hp-about-photo { height: 480px; }
    .hp-about-photo img { object-position: center top; }
    .hp-track-grid { grid-template-columns: 1fr 1fr; }
    .hp-title { font-size: 28px; margin-bottom: 36px; }
    .hp-cta h2 { font-size: 28px; }
    .hp-sec { padding: 60px 6%; }
    .hp-sec-wide { padding: 60px 6%; }
  }

  /* ── RESPONSIVE: phone ── */
  @media (max-width: 560px) {
    .hp-nav { display: none; }
    .hp-hamburger { display: flex; }
    .hp-header { padding: 0 5%; }
    .hp-header-name { font-size: 17px; }
    .hp-badge { font-size: 11px; padding: 8px 14px; letter-spacing: 1px; }
    .hp-hero-photo { height: 360px; }
    .hp-hero-left { padding: 36px 5% 32px; }
    .hp-hero h1 { font-size: 28px; letter-spacing: -0.5px; }
    .hp-hero-eyebrow { font-size: 11px; margin-bottom: 16px; }
    .hp-hero-sub { font-size: 15px; margin-bottom: 32px; }
    .hp-hero-btns { flex-direction: column; }
    .hp-btn-gold, .hp-btn-ghost { text-align: center; padding: 16px 20px; width: 100%; }
    .hp-quote { padding: 40px 5%; }
    .hp-quote blockquote { font-size: 17px; }
    .hp-sec { padding: 48px 5%; }
    .hp-sec-wide { padding: 48px 5%; }
    .hp-title { font-size: 24px; margin-bottom: 28px; }
    .hp-pillar { padding: 32px 24px; }
    .hp-pillar-n { font-size: 36px; }
    .hp-about-grid { padding: 40px 20px; width: 100%; }
    .hp-about-photo { height: 420px; }
    .hp-about-photo img { object-position: center top; }
    .hp-about { width: 100%; max-width: 100%; }
    .hp-creds { gap: 14px; width: 100%; }
    .hp-cred { font-size: 13px; gap: 10px; width: 100%; max-width: 100%; }
    .hp-track-grid { grid-template-columns: 1fr; }
    .hp-track-item { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .hp-track-inner { padding: 48px 5%; }
    .hp-flock-grid { grid-template-columns: 1fr; gap: 32px; }
    .hp-faq-grid { grid-template-columns: 1fr; gap: 24px; }
    .hp-cta { padding: 64px 5%; }
    .hp-cta h2 { font-size: 24px; }
    .hp-cta p { font-size: 16px; margin-bottom: 32px; }
    .hp-footer { padding: 24px 5%; font-size: 12px; line-height: 1.7; }
  }
`;

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <style>{styles}</style>
      <div className="hp">

        {/* Header */}
        <header className="hp-header">
          <div className="hp-header-name">Heidi For Homer</div>
          <nav className="hp-nav">
            <a href="#platform">Platform</a>
            <a href="#about">About</a>
            <a href="#issue">The Issue</a>
            <a href="mailto:heidi@hadleytrees.com" className="hp-nav-cta">Get Involved</a>
          </nav>
          <button className="hp-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </header>

        {/* Mobile menu */}
        <div className={`hp-mobile-menu${menuOpen ? ' open' : ''}`}>
          <a href="#platform" onClick={() => setMenuOpen(false)}>Platform</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#issue" onClick={() => setMenuOpen(false)}>The Issue</a>
          <a href="mailto:heidi@hadleytrees.com" onClick={() => setMenuOpen(false)}>Get Involved →</a>
        </div>

        {/* Hero */}
        <section className="hp-hero">
          <div className="hp-hero-left">
            <div className="hp-hero-eyebrow">Homer Glen, Illinois · 2027</div>
            <h1>Fighting for the <span>Future of Homer Glen.</span></h1>
            <p className="hp-hero-sub">
              Heidi Pacella is running for Mayor of Homer Glen — to protect our open spaces,
              champion our local businesses, and deliver the professional, accountable leadership our village deserves.
            </p>
            <div className="hp-hero-btns">
              <a href="mailto:heidi@hadleytrees.com" className="hp-btn-gold">Get Involved</a>
              <a href="https://www.parker-hadley.com/vote" target="_blank" rel="noopener noreferrer" className="hp-btn-ghost">Full Campaign Site</a>
            </div>
          </div>
          <div className="hp-hero-photo">
            <img src="/heidi.jpeg" alt="Heidi Pacella for Mayor of Homer Glen" />
          </div>
        </section>

        {/* Quote */}
        <section className="hp-quote">
          <blockquote>
            "The opulence of Homer Glen is its environment and natural biomes. I am an advocate for preserving open space and maintaining the assets of Homer Glen."
          </blockquote>
          <cite>— Heidi Pacella</cite>
        </section>

        {/* Platform */}
        <div id="platform" className="hp-sec">
          <p className="hp-label">Platform</p>
          <h2 className="hp-title">What Heidi Stands For</h2>
          <div className="hp-pillars">
            <div className="hp-pillar">
              <div className="hp-pillar-n">01</div>
              <h3>Protect Our Environment</h3>
              <p>Preserving open spaces, farmland, wetlands, trees, and historical integrity from high-density development and unnecessary road widenings. Homer Glen's natural character is worth defending.</p>
            </div>
            <div className="hp-pillar">
              <div className="hp-pillar-n">02</div>
              <h3>Champion Local Business</h3>
              <p>Family-run establishments are the backbone of Homer Glen's economy and identity. Heidi will prioritize their needs while ensuring the long-term financial health of our village.</p>
            </div>
            <div className="hp-pillar">
              <div className="hp-pillar-n">03</div>
              <h3>Professional &amp; Accountable</h3>
              <p>A nonpartisan mayor who delivers results — not party politics. Listening to residents, embracing new ideas, and guiding Homer Glen to be the most extraordinary community in the Chicago suburbs.</p>
            </div>
          </div>
        </div>

        {/* About */}
        <div id="about" className="hp-about-wrap">
          <div className="hp-about-grid">
            <div className="hp-about-photo">
              <img src="/heidi.jpeg" alt="Heidi Pacella" />
            </div>
            <div className="hp-about">
              <p className="hp-label">About Heidi</p>
              <h2 className="hp-title" style={{ marginBottom: '24px' }}>A Neighbor, Not a Politician</h2>
              <p>
                Heidi Pacella has spent years listening to Homer Glen residents — hearing their stories, their challenges, and their hopes for our community. When Will County threatened to expand Parker Hadley Road and 143rd Street, Heidi organized her neighbors and fought back.
              </p>
              <p>
                In 2023 she founded Parker Hadley Preservation to keep residents informed about local projects affecting their homes and livelihoods. She's a forward-oriented thinker who harnesses opportunities that encourage creative growth, harmony, and potential.
              </p>
              <p>
                This is a nonpartisan race. Heidi's campaign is focused on the village — not a political party. Her priorities are being professional, accountable, and delivering results for every Homer Glen resident.
              </p>
              <div className="hp-creds">
                <div className="hp-cred">Lifelong Homer Glen resident</div>
                <div className="hp-cred">BA Psychology &amp; Creative Writing — DePaul University, Chicago</div>
                <div className="hp-cred">AA <em>magna cum laude</em> — Moraine Valley Community College</div>
                <div className="hp-cred">Alleman Catholic High School, Rock Island, IL</div>
                <div className="hp-cred">Family business background (raised in &amp; married into)</div>
                <div className="hp-cred">Founder, Parker Hadley Preservation (2023)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Track Record */}
        <div className="hp-track-wrap">
          <div className="hp-track-inner">
            <p className="hp-label">Track Record</p>
            <h2 className="hp-title">Proven, Not Just Promised.</h2>
            <div className="hp-track-grid">
              {[
                { title: 'Stopped Road Expansions', desc: 'Organized community opposition to Parker Hadley Road & 143rd Street widening projects (2022–23)' },
                { title: 'Founded Parker Hadley Preservation', desc: 'Created an information hub keeping Will County residents informed about local development projects' },
                { title: 'Environmental Advocacy', desc: 'Vocalized need for clearer communication on projects threatening open space, farmland, and wildlife' },
                { title: 'Local Business Champion', desc: 'Actively supports family-run businesses — understanding firsthand the dedication required to build a thriving local enterprise' },
              ].map((item, i) => (
                <div key={i} className="hp-track-item">
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Flock Camera Issue */}
        <div id="issue" style={{ background: '#fff', borderTop: '1px solid #e8e8e8', padding: '80px 6%' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <p className="hp-label">Issue Spotlight</p>
            <h2 className="hp-title">The Village Board Ignored Your Vote</h2>
            <div className="hp-flock-grid">
              <div>
                <p style={{ fontSize: '17px', lineHeight: '1.85', color: '#333', marginBottom: '20px' }}>
                  In 2023, Homer Glen residents were asked whether License Plate Readers (LPRs) — known as "Flock" cameras — were necessary in our village. The people spoke clearly:
                </p>
                <div style={{ background: '#1b3a2b', borderRadius: '4px', padding: '36px', marginBottom: '24px', display: 'flex', gap: '32px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Merriweather, serif', fontSize: '52px', fontWeight: '900', color: '#c9a84c', lineHeight: '1' }}>60%</div>
                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: '700', marginTop: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>Voted NO</div>
                    <div style={{ color: '#7ea898', fontSize: '13px', marginTop: '4px' }}>3,268 residents</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Merriweather, serif', fontSize: '52px', fontWeight: '900', color: '#666', lineHeight: '1' }}>40%</div>
                    <div style={{ color: '#aaa', fontSize: '14px', fontWeight: '700', marginTop: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>Voted YES</div>
                    <div style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>2,141 residents</div>
                  </div>
                </div>
                <p style={{ fontSize: '16px', lineHeight: '1.8', color: '#333' }}>
                  The majority voted NO. The money allocated was to remain in the general budget. The issue was settled.
                </p>
              </div>
              <div>
                <div style={{ background: '#fff8f0', border: '2px solid #c9a84c', borderRadius: '4px', padding: '36px', marginBottom: '24px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>December 2025</p>
                  <p style={{ fontSize: '16px', lineHeight: '1.8', color: '#333', marginBottom: '0' }}>
                    On <strong>December 3rd, 2025</strong>, despite the referendum result, the Village Board brought Flock cameras back at their Public Service & Safety meeting. On <strong>December 10th, 2025</strong>, the board approved Legislative Action Item #7 — a proposal from Flock Safety for <strong>twelve license plate cameras</strong> at a total cost of <strong>$106,650</strong> ($57,150 upfront + $49,500 annual subscription).
                  </p>
                </div>
                <Poll pollId={1} />
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Highlight */}
        <div style={{ background: '#f7f3eb', borderTop: '1px solid #e5ddd0', padding: '80px 6%' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <p className="hp-label">In Her Own Words</p>
            <h2 className="hp-title">Questions &amp; Answers</h2>
            <div className="hp-faq-grid">
              {[
                {
                  q: 'Are you running as a Republican or Democrat?',
                  a: 'This is a nonpartisan race, and I am focused on serving the whole community regardless of anyone\'s party. My campaign is focused on the village, not a political party — being professional and accountable.'
                },
                {
                  q: 'What is your stance on high-density development and road widenings?',
                  a: 'I am an advocate for preserving open space and maintaining the assets of Homer Glen. I was actively involved in the 2022–23 Parker Hadley Road Expansion opposition and the 143rd Street Expansion opposition.'
                },
                {
                  q: 'What qualifies you to lead Homer Glen?',
                  a: 'I have interacted with many residents over four years and heard their stories and challenges. Homer Glen needs a leader that can deliver results. As a forward-oriented thinker, I embrace new ideas and improvement.'
                },
              ].map((item, i) => (
                <div key={i} style={{ background: '#fff', padding: '36px', border: '1px solid #e5ddd0' }}>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: '#c9a84c', letterSpacing: '0.5px', marginBottom: '12px' }}>Q</p>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: '#1b3a2b', marginBottom: '16px', lineHeight: '1.4' }}>{item.q}</p>
                  <p style={{ fontSize: '15px', color: '#555', lineHeight: '1.75', fontStyle: 'italic' }}>"{item.a}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <section className="hp-cta">
          <h2>Homer Glen Deserves Extraordinary Leadership.</h2>
          <p>Join Heidi in fighting for a Homer Glen that listens to its residents — not ignores them.</p>
          <a href="mailto:heidi@hadleytrees.com" className="hp-btn-gold">Contact Heidi Today</a>
        </section>

        {/* Footer */}
        <footer className="hp-footer">
          Paid for by Heidi For Homer &nbsp;·&nbsp; heidi@hadleytrees.com &nbsp;·&nbsp; A copy of our report is filed with the Illinois State Board of Elections (elections.il.gov)
        </footer>

      </div>
    </>
  );
}
