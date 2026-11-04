/**
 * Supabase JS SDK loader / loader fallback
 */
if (typeof window !== 'undefined' && typeof window.supabase === 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  script.async = false;
  document.head.appendChild(script);
}

