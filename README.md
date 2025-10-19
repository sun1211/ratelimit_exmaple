# Rate Limiter API - Project Summary

## Overview
A simple Express.js API server with Redis-based rate limiting middleware to prevent abuse and control request traffic per user.

## Tech Stack
- **Framework**: Express.js with TypeScript
- **Cache/Storage**: Redis
- **Language**: TypeScript
- **Port**: 3000

## Core Features

### Rate Limiting
- **Limit**: 100 requests per user
- **Window**: 60 seconds (sliding window)
- **Identification**: Uses `user-id` header, falls back to IP address or 'anonymous'
- **Strategy**: Atomic counter with automatic expiration

### Rate Limit Headers
Every response includes:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Timestamp when limit resets

### Error Handling
- Returns `429 Too Many Requests` when limit exceeded
- Includes retry-after time in response
- **Fail-open policy**: Allows requests if Redis is unavailable

## API Endpoints

### `GET /api`
Simple endpoint returning success message and timestamp.

### `POST /api/submit`
Accepts JSON payload and returns confirmation with submitted data.

## How It Works

1. **Request arrives** → Middleware extracts user identifier
2. **Redis increment** → Atomically increments counter for user key
3. **First request** → Sets expiration on the key (60 seconds)
4. **Check limit** → Compares count against threshold
5. **Response** → Either proceeds to route handler or returns 429 error

## Key Implementation Details

### Redis Key Pattern
```
rate:user:{userId}
```

### Atomic Operations
Uses Redis `INCR` command for thread-safe counter incrementation, ensuring accuracy in high-concurrency scenarios.

### TTL Management
Automatically expires keys after the window period to prevent memory buildup.

## Configuration
Easily adjustable constants:
- `RATE_LIMIT`: Maximum requests per window
- `WINDOW_SIZE`: Time window in seconds

---

## Getting Started with Docker

### Prerequisites
- Docker and Docker Compose installed on your system
- Node.js and npm (for local development)

### Running with Docker Compose

#### 1. Start Redis and RedisInsight
```bash
# Start all services in detached mode
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

#### 2. Services Available
- **Redis**: `localhost:6379`
- **RedisInsight**: `http://localhost:5540` (Redis GUI for monitoring and debugging)

#### 3. Install Dependencies
```bash
npm install
```

#### 4. Start the Application
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

#### 5. Test the API
```bash
# Simple GET request
curl http://localhost:3000/api

# With user-id header
curl -H "user-id: user123" http://localhost:3000/api

# POST request
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -H "user-id: user123" \
  -d '{"data": "test"}'
```

### Docker Services Explained

#### Redis (cache)
- **Image**: `redis:7-alpine` (lightweight Redis 7.x)
- **Port**: 6379
- **Health Check**: Ensures Redis is ready before starting dependent services
- **Network**: Connected to `redis-cluster-net`

#### RedisInsight (redisinsight)
- **Image**: `redis/redisinsight:latest`
- **Port**: 5540
- **Purpose**: Web-based GUI for Redis monitoring, debugging, and data visualization
- **Depends On**: Waits for Redis to be healthy before starting
- **Data Persistence**: Stores configuration in `./redisinsight/data`

### Useful Docker Commands

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Restart services
docker-compose restart

# View Redis logs
docker-compose logs cache

# Access Redis CLI
docker-compose exec cache redis-cli

# Check Redis connection
docker-compose exec cache redis-cli ping
```

### Using RedisInsight

1. Open browser to `http://localhost:5540`
2. Add database connection:
   - **Host**: `cache`
   - **Port**: `6379`
   - **Name**: `Rate Limiter`
3. Monitor rate limit keys in real-time
4. View key expiration and TTL values
5. Debug rate limiting behavior

### Environment Variables

Create a `.env` file for configuration:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Rate Limiter Configuration
RATE_LIMIT=100
WINDOW_SIZE=60

# Server Configuration
PORT=3000
NODE_ENV=development
```

### Troubleshooting

**Redis connection refused:**
```bash
# Check if Redis is running
docker-compose ps

# Check Redis logs
docker-compose logs cache
```

**Port already in use:**
```bash
# Change ports in docker-compose.yml
ports:
  - "6380:6379"  # Redis on 6380
  - "5541:5540"  # RedisInsight on 5541
```

**Reset rate limits:**
```bash
# Connect to Redis and flush all keys
docker-compose exec cache redis-cli FLUSHALL
```

---

## Use Cases
- API protection against abuse
- Fair resource distribution among users
- DDoS mitigation
- Cost control for expensive operations

## Dependencies Required
- `express`
- `redis` (via custom config)
- `@types/express`
- `@types/node`