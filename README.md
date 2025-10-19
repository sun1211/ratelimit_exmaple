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

## Use Cases
- API protection against abuse
- Fair resource distribution among users
- DDoS mitigation
- Cost control for expensive operations

## Dependencies Required
- `express`
- `redis` (via custom config)
- `@types/express`