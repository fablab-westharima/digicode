import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const subscriptions = new Hono<{ Bindings: Bindings }>();

// サブスクリプションルートは後日実装
subscriptions.get('/status', async (c) => {
  return c.json({ message: 'Not implemented yet' }, 501);
});

export default subscriptions;
