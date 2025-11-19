import express from "express";
import routes from "./routes";

/**
 * Small REST API with basic token-based auth using ADMIN_API_TOKEN env var.
 */

export function createServer() {
  const app = express();
  const token = process.env.ADMIN_API_TOKEN || "";

  app.use((req, res, next) => {
    // Simple token check for mutating endpoints
    if (req.path.startsWith('/wallets') && req.method !== 'GET') {
      const h = req.headers['authorization'] || '';
      if (String(h) !== `Bearer ${token}`) return res.status(401).json({error: 'unauthorized'});
    }
    next();
  });

  app.use(routes);

  return app;
}

export default createServer;
