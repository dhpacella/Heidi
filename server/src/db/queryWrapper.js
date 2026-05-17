const THRESHOLD = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '500', 10);

function wrapPool(pool) {
  const original = pool.query.bind(pool);
  pool.query = async (...args) => {
    const start = Date.now();
    try {
      const result = await original(...args);
      const ms = Date.now() - start;
      if (ms > THRESHOLD) {
        console.warn('[SLOW QUERY]', ms + 'ms', typeof args[0] === 'string' ? args[0].substring(0, 200) : '[object]');
      }
      return result;
    } catch (err) {
      console.error('[QUERY ERROR]', err.message, typeof args[0] === 'string' ? args[0].substring(0, 200) : '[object]');
      throw err;
    }
  };
  return pool;
}

module.exports = { wrapPool };
