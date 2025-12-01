import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const webhooks = new Hono<{ Bindings: Bindings }>();

// Webhook ルートは後日実装（Square決済連携）
webhooks.post('/square', async (c) => {
  return c.json({ message: 'Not implemented yet' }, 501);
});

export default webhooks;
