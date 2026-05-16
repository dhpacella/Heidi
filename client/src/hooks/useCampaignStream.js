import { useEffect, useRef, useState } from 'react';

export function useCampaignStream() {
  const [events, setEvents] = useState([]);
  const [latestBlast, setLatestBlast] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    const connectToStream = () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('No auth token, skipping campaign stream connection');
          return;
        }

        const eventSource = new EventSource('/api/email/stream', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        eventSource.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            setLatestBlast(data);
            setEvents((prev) => [...prev, { ...data, receivedAt: Date.now() }].slice(-50));
          } catch (err) {
            console.error('Failed to parse campaign event:', err);
          }
        });

        eventSource.addEventListener('error', () => {
          setIsConnected(false);
          eventSource.close();
          reconnectTimeoutRef.current = setTimeout(connectToStream, 3000);
        });

        eventSource.addEventListener('open', () => {
          setIsConnected(true);
        });

        eventSourceRef.current = eventSource;
      } catch (err) {
        console.error('Failed to connect to campaign stream:', err);
        reconnectTimeoutRef.current = setTimeout(connectToStream, 3000);
      }
    };

    connectToStream();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return { events, latestBlast, isConnected };
}
