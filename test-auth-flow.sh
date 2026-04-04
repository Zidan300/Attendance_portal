#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "School Attendance Portal - Auth Flow Test"
echo "=========================================="
echo ""

BASE_URL="http://localhost:3000"
PASS=0
FAIL=0

test_case() {
    local name="$1"
    local expected="$2"
    local actual="$3"
    
    if [[ "$actual" == *"$expected"* ]]; then
        echo -e "${GREEN}✓${NC} $name"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $name"
        echo "  Expected: $expected"
        echo "  Got: $actual"
        ((FAIL++))
    fi
}

# Test 1: Login with correct credentials
echo -e "${YELLOW}Test 1: Login with correct credentials${NC}"
RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"zidan","password":"zidan123"}')
test_case "Should return token" '"token"' "$RESPONSE"
test_case "Should return user object" '"user"' "$RESPONSE"
TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "  Token extracted: ${TOKEN:0:20}..."
echo ""

# Test 2: Login with wrong password
echo -e "${YELLOW}Test 2: Login with wrong password${NC}"
RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"zidan","password":"wrongpass"}')
test_case "Should return 'Invalid credentials'" "Invalid credentials" "$RESPONSE"
echo ""

# Test 3: Login with empty fields
echo -e "${YELLOW}Test 3: Login with empty fields${NC}"
RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"","password":""}')
test_case "Should require fields" "required" "$RESPONSE"
echo ""

# Test 4: Verify token
echo -e "${YELLOW}Test 4: Verify valid token${NC}"
RESPONSE=$(curl -s -X GET $BASE_URL/api/auth/verify \
  -H "Authorization: Bearer $TOKEN")
test_case "Should validate token" '"valid":true' "$RESPONSE"
test_case "Should return user info" '"username":"zidan"' "$RESPONSE"
echo ""

# Test 5: Verify invalid token
echo -e "${YELLOW}Test 5: Verify invalid token${NC}"
RESPONSE=$(curl -s -X GET $BASE_URL/api/auth/verify \
  -H "Authorization: Bearer invalidtoken123")
test_case "Should reject invalid token" "Invalid Token" "$RESPONSE"
echo ""

# Test 6: Access protected route with token
echo -e "${YELLOW}Test 6: Access protected route WITH token${NC}"
RESPONSE=$(curl -s -X GET $BASE_URL/api/sections \
  -H "Authorization: Bearer $TOKEN")
test_case "Should return sections array" "[" "$RESPONSE"
echo ""

# Test 7: Access protected route without token
echo -e "${YELLOW}Test 7: Access protected route WITHOUT token${NC}"
RESPONSE=$(curl -s -X GET $BASE_URL/api/sections)
test_case "Should deny access" "Access Denied" "$RESPONSE"
echo ""

# Test 8: Access students endpoint with token
echo -e "${YELLOW}Test 8: Access students endpoint WITH token${NC}"
RESPONSE=$(curl -s -X GET $BASE_URL/api/students \
  -H "Authorization: Bearer $TOKEN")
test_case "Should return students array" "[" "$RESPONSE"
echo ""

# Test 9: Create section with token
echo -e "${YELLOW}Test 9: Create new section WITH token${NC}"
SECTION_NAME="Test Section $(date +%s)"
RESPONSE=$(curl -s -X POST $BASE_URL/api/sections \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$SECTION_NAME\"}")
test_case "Should create section" "$SECTION_NAME" "$RESPONSE"
echo ""

# Test 10: Try to create section without token
echo -e "${YELLOW}Test 10: Create section WITHOUT token${NC}"
RESPONSE=$(curl -s -X POST $BASE_URL/api/sections \
  -H "Content-Type: application/json" \
  -d '{"name":"Unauthorized Section"}')
test_case "Should deny access" "Access Denied" "$RESPONSE"
echo ""

echo ""
echo "=========================================="
echo "Test Results"
echo "=========================================="
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed ✗${NC}"
    exit 1
fi
