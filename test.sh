# 1. Basic test - single request
curl -i http://localhost:3000/api

# 2. Test with specific user ID
curl -i -H "user-id: user123" http://localhost:3000/api

# 3. Check rate limit headers
curl -i -H "user-id: testuser" http://localhost:3000/api | grep -i "X-RateLimit"

# 4. Rapid fire - send 105 requests to trigger rate limit
for i in {1..105}; do
  echo "Request $i:"
  curl -H "user-id: user123" http://localhost:3000/api
  echo ""
done

# 5. Better rapid fire - show only status codes and rate limit info
for i in {1..105}; do
  response=$(curl -s -w "\n%{http_code}" -H "user-id: spammer" http://localhost:3000/api)
  status=$(echo "$response" | tail -n1)
  remaining=$(curl -s -I -H "user-id: spammer" http://localhost:3000/api | grep -i "X-RateLimit-Remaining" | cut -d' ' -f2)
  echo "Request $i: Status=$status, Remaining=$remaining"
done

# 6. Test POST endpoint
curl -i -X POST \
  -H "Content-Type: application/json" \
  -H "user-id: user456" \
  -d '{"name":"test","value":123}' \
  http://localhost:3000/api/submit

# 7. Test different users (should have separate limits)
curl -H "user-id: alice" http://localhost:3000/api
curl -H "user-id: bob" http://localhost:3000/api
curl -H "user-id: charlie" http://localhost:3000/api

# 8. Stress test - parallel requests (requires GNU parallel)
seq 1 150 | parallel -j 10 curl -s -H "user-id: loadtest" http://localhost:3000/api

# 9. Simple parallel test (without GNU parallel)
for i in {1..20}; do
  curl -s -H "user-id: parallel-test" http://localhost:3000/api &
done
wait

# 10. Watch rate limit countdown
watch -n 1 'curl -s -I -H "user-id: watcher" http://localhost:3000/api | grep -i "X-RateLimit"'

# 11. Test until rate limited, then show error
while true; do
  response=$(curl -s -H "user-id: looper" http://localhost:3000/api)
  echo "$response"
  if echo "$response" | grep -q "Rate limit exceeded"; then
    echo "✗ Rate limit hit!"
    break
  fi
  echo "✓ Request successful"
  sleep 0.1
done

# 12. Test home route (not rate limited)
curl -i http://localhost:3000/

# 13. Extract and display all rate limit info
curl -s -i -H "user-id: info-test" http://localhost:3000/api | \
  awk '/^X-RateLimit/ {print} /^{/ {print}'

# 14. Simulate multiple users hitting limit
for user in alice bob charlie dave; do
  echo "Testing user: $user"
  for i in {1..105}; do
    curl -s -H "user-id: $user" http://localhost:3000/api > /dev/null
  done
  echo "User $user: $(curl -s -H "user-id: $user" http://localhost:3000/api | jq -r .error)"
  echo ""
done

# 15. Monitor Redis keys in real-time (run in separate terminal)
# redis-cli --scan --pattern "rate:user:*"
# redis-cli GET "rate:user:user123"
# redis-cli TTL "rate:user:user123"

#!/bin/bash

USER_ID="${1:-testuser}"
ENDPOINT="${2:-http://localhost:3000/api}"

echo "Testing rate limiter for user: $USER_ID"
echo "Endpoint: $ENDPOINT"
echo "----------------------------------------"

for i in {1..110}; do
  response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "user-id: $USER_ID" "$ENDPOINT")
  body=$(echo "$response" | sed '$d')
  status=$(echo "$response" | grep "HTTP_CODE" | cut -d: -f2)
  
  # Get headers separately
  remaining=$(curl -s -I -H "user-id: $USER_ID" "$ENDPOINT" 2>/dev/null | grep -i "X-RateLimit-Remaining" | awk '{print $2}' | tr -d '\r')
  
  if [ "$status" = "429" ]; then
    echo "❌ Request $i: RATE LIMITED (Status: $status)"
    echo "   Response: $(echo $body | jq -r .message 2>/dev/null || echo $body)"
    break
  else
    echo "✅ Request $i: Success (Status: $status, Remaining: $remaining)"
  fi
  
  # Small delay to see output
  sleep 0.05
done

echo "----------------------------------------"
echo "Test complete!"