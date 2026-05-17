import React, { useState } from 'react';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;0,900;1,400&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');
  .ab { font-family: 'Source Sans 3', sans-serif; color: #1a1a1a; background: #fff; overflow-x: hidden; }
  .ab-header { background: #fff; border-bottom: 3px solid #1b3a2b; padding: 0 6%; display: flex; align-items: stretch; justify-content: space-between; }
  .ab-header-name { font-family: 'Merriweather', serif; font-size: 20px; font-weight: 900; color: #1b3a2b; padding: 20px 0; }
  .ab-nav { display: flex; align-items: center; gap: 6px; }
  .ab-nav a { font-size: 13px; font-weight: 600; color: #1b3a2b; text-decoration: none; padding: 8px 14px; }
  .ab-nav a:hover { color: #c9a84c; }
  .ab-nav .cta { background: #1b3a2b; color: #fff; padding: 10px 20px; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
  .ab-nav .cta:hover { background: #c9a84c; color: #fff; }
  .ab-hamburger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 8px; }
  .ab-hamburger span { display: block; width: 24px; height: 2px; background: #1b3a2b; }
  .ab-mobile-menu { display: none; flex-direction: column; background: #fff; border-top: 1px solid #e8e8e8; padding: 12px 5%; gap: 4px; }
  .ab-mobile-menu.open { display: flex; }
  .ab-mobile-menu a { font-size: 16px; font-weight: 600; color: #1b3a2b; text-decoration: none; padding: 14px 0; border-bottom: 1px solid #f0f0f0; }
  .ab-mobile-menu a:last-child { border-bottom: none; }

  .ab-hero { background: #1b3a2b; padding: 80px 6%; text-align: center; }
  .ab-hero p { font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #c9a84c; margin-bottom: 20px; }
  .ab-hero h1 { font-family: 'Merriweather', serif; font-size: 48px; font-weight: 900; color: #fff; line-height: 1.15; letter-spacing: -1px; }
  .ab-hero h1 span { color: #c9a84c; }

  .ab-body { max-width: 860px; margin: 0 auto; padding: 80px 6%; }
  .ab-photo { width: 100%; max-height: 480px; object-fit: cover; object-position: center top; border-radius: 2px; margin-bottom: 48px; display: block; box-shadow: 0 12px 40px rgba(0,0,0,0.12); }
  .ab-body p { font-size: 18px; line-height: 1.85; color: #333; margin-bottom: 24px; }
  .ab-divider { border: none; border-top: 2px solid #e8e8e8; margin: 48px 0; }

  .ab-creds { list-style: none; display: flex; flex-direction: column; gap: 16px; }
  .ab-creds li { display: flex; align-items: flex-start; gap: 14px; font-size: 16px; color: #444; line-height: 1.5; }
  .ab-creds li::before { content: '—'; color: #c9a84c; font-weight: 700; flex-shrink: 0; margin-top: 1px; }

  .ab-cta { background: #f7f3eb; border-top: 1px solid #e5ddd0; padding: 64px 6%; text-align: center; }
  .ab-cta h2 { font-family: 'Merriweather', serif; font-size: 32px; font-weight: 900; color: #1b3a2b; margin-bottom: 16px; }
  .ab-cta p { font-size: 17px; color: #666; max-width: 520px; margin: 0 auto 32px; line-height: 1.7; font-weight: 300; }
  .ab-btn { background: #c9a84c; color: #fff; font-size: 14px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 15px 36px; text-decoration: none; display: inline-block; }
  .ab-btn:hover { background: #b8922e; }

  .ab-footer { background: #111; padding: 26px 6%; text-align: center; color: #555; font-size: 13px; }

  @media (max-width: 560px) {
    .ab-nav { display: none; }
    .ab-hamburger { display: flex; }
    .ab-header { padding: 0 5%; }
    .ab-header-name { font-size: 17px; }
    .ab-hero { padding: 56px 5%; }
    .ab-hero h1 { font-size: 30px; }
    .ab-body { padding: 48px 5%; }
    .ab-body p { font-size: 16px; }
    .ab-creds li { font-size: 14px; }
    .ab-cta { padding: 48px 5%; }
    .ab-cta h2 { font-size: 24px; }
    .ab-btn { width: 100%; text-align: center; padding: 16px; }
  }
`;

export default function About() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <style>{styles}</style>
      <div className="ab">
        <header className="ab-header">
          <div className="ab-header-name">Heidi For Homer</div>
          <nav className="ab-nav">
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/#issue">The Issue</a>
            <a href="mailto:heidi@hadleytrees.com" className="cta">Get Involved</a>
          </nav>
          <button className="ab-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </header>

        <div className={`ab-mobile-menu${menuOpen ? ' open' : ''}`}>
          <a href="/" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="/about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="/#issue" onClick={() => setMenuOpen(false)}>The Issue</a>
          <a href="mailto:heidi@hadleytrees.com">Get Involved →</a>
        </div>

        <div className="ab-hero">
          <p>About the Candidate</p>
          <h1>A Neighbor, <span>Not a Politician.</span></h1>
        </div>

        <div className="ab-body">
          <img src="/heidi.jpeg" alt="Heidi Pacella" className="ab-photo" />

          <p>
            Heidi Pacella has spent years listening to Homer Glen residents — hearing their stories,
            their challenges, and their hopes for the community. She is not a career politician.
            She is a neighbor who saw her village's character being threatened and chose to act.
          </p>
          <p>
            When Will County threatened to expand Parker Hadley Road and 143rd Street, Heidi organized
            her neighbors and fought back. In 2023 she founded Parker Hadley Preservation — an
            information hub keeping residents informed about local development projects affecting their
            homes and livelihoods.
          </p>
          <p>
            This is a nonpartisan race. Heidi's campaign is focused entirely on Homer Glen — not a
            political party. Her priorities are being professional, accountable, and delivering real
            results for every resident.
          </p>

          <hr className="ab-divider" />

          <ul className="ab-creds">
            <li>Lifelong Homer Glen resident</li>
            <li>BA Psychology &amp; Creative Writing — DePaul University, Chicago</li>
            <li>AA <em>magna cum laude</em> — Moraine Valley Community College</li>
            <li>Alleman Catholic High School, Rock Island, IL</li>
            <li>Family business background (raised in &amp; married into)</li>
            <li>Founder, Parker Hadley Preservation (2023)</li>
          </ul>
        </div>

        <div className="ab-cta">
          <h2>Ready to Help Homer Glen?</h2>
          <p>Join Heidi in building a village that listens to its residents — not ignores them.</p>
          <a href="mailto:heidi@hadleytrees.com" className="ab-btn">Contact Heidi</a>
        </div>

        <footer className="ab-footer">
          Paid for by Heidi For Homer &nbsp;·&nbsp; heidi@hadleytrees.com &nbsp;·&nbsp; A copy of our report is filed with the Illinois State Board of Elections (elections.il.gov)
        </footer>
      </div>
    </>
  );
}
