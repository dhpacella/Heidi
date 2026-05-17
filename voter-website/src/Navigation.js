import React, { useState, useEffect } from 'react';

export function Navigation() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch available pages from backend
    fetch('http://localhost:5000/api/content/pages')
      .then(res => res.json())
      .then(data => {
        setPages(data.pages || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load pages:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <nav style={styles.nav}><span>Loading...</span></nav>;
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        <div style={styles.logo}>
          <h1 style={styles.title}>Heidi for Homer 2027</h1>
        </div>
        <ul style={styles.links}>
          {pages.map(page => (
            <li key={page.slug} style={styles.item}>
              <a
                href={`/${page.slug === 'home' ? '' : page.slug}`}
                style={styles.link}
              >
                {page.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    background: '#0B1929',
    borderBottom: '2px solid #F5A623',
    padding: '0',
    marginBottom: '30px'
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    flex: 1
  },
  title: {
    color: '#F5A623',
    margin: '0',
    fontSize: '24px',
    fontFamily: 'Barlow, sans-serif'
  },
  links: {
    display: 'flex',
    gap: '30px',
    listStyle: 'none',
    margin: '0',
    padding: '0'
  },
  item: {
    margin: '0'
  },
  link: {
    color: '#EEF2F7',
    textDecoration: 'none',
    fontSize: '16px',
    fontFamily: 'Barlow, sans-serif',
    fontWeight: '500',
    transition: 'color 0.3s',
    cursor: 'pointer'
  }
};
