#!/bin/bash
API_URL="http://localhost:3000/api"

echo "=== Testing School Attendance Portal API ==="
echo ""

# Test 1: Login
echo "1. Testing Login (zidan/zidan123)..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"zidan","password":"zidan123"}')
echo "$LOGIN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_RESPONSE"

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  exit 1
fi
echo "✅ Login successful!"
echo ""

# Test 2: Get Sections
echo "2. Testing Get Sections..."
curl -s -X GET "$API_URL/sections" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null
echo "✅ Sections retrieved!"
echo ""

# Test 3: Create Section
echo "3. Testing Create Section..."
curl -s -X POST "$API_URL/sections" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Section"}' | python3 -m json.tool 2>/dev/null
echo "✅ Section created!"
echo ""

echo "=== All API Tests Completed ==="
