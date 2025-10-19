import express, { Request, Response, NextFunction } from 'express';
import { getRedisConnection } from './config/redis.config';

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Redis client setup
const redisClient = getRedisConnection();

// Rate limiter configuration
const RATE_LIMIT = 100; // requests per window
const WINDOW_SIZE = 60; // seconds

// Rate limiting middleware (must be async)
const rateLimiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Get user ID from request (could be from auth token, IP, etc.)
  const userId = req.headers['user-id'] as string || req.ip || 'anonymous';

  const key = `rate:user:${userId}`;
  
  try {
    // Atomically increment the counter
    const currentCount = await redisClient.incr(key);
    
    // If this is the first request, set expiration
    if (currentCount === 1) {
      await redisClient.expire(key, WINDOW_SIZE);
    }
    
    // Get TTL to include in response headers
    const ttl = await redisClient.ttl(key);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT - currentCount).toString());
    res.setHeader('X-RateLimit-Reset', (Date.now() + ttl * 1000).toString());
    
    // Check if limit exceeded
    if (currentCount > RATE_LIMIT) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${ttl} seconds.`,
        retryAfter: ttl
      });
      return;
    }
    
    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    // Fail open - allow request if Redis is down
    next();
  }
};

// Routes
// Apply rate limiter to protected routes
app.use(rateLimiter);

// Example routes
app.get('/api', (req: Request, res: Response): void => {
  res.json({
    message: 'Request successful!',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/submit', (req: Request, res: Response): void => {
  res.json({
    message: 'Data submitted successfully!',
    data: req.body
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;