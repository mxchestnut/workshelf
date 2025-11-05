#!/bin/bash

# Keycloak Registration Configuration Script
# This script configures custom user attributes for the registration flow

KEYCLOAK_URL="https://workshelf-keycloak.wonderfulstone-7c41e05e.centralus.azurecontainerapps.io"
ADMIN_USER="admin"
ADMIN_PASS="e00NiIf26fJzdkdBt1kw"
REALM="workshelf"

echo "🔐 Step 1: Getting admin access token..."

# Get admin token
TOKEN_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${ADMIN_USER}" \
  -d "password=${ADMIN_PASS}" \
  -d "grant_type=password" \
  -d "client_id=admin-cli")

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Failed to get access token!"
    echo "Response: $TOKEN_RESPONSE"
    exit 1
fi

echo "✅ Got access token!"

# ==========================================
# Configure User Attributes
# ==========================================

echo ""
echo "📝 Step 2: Configuring user attributes..."

# Phone Number
echo "  → Adding phoneNumber attribute..."
curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users/profile/attributes" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "phoneNumber",
    "displayName": "Phone Number",
    "validations": {
      "pattern": {
        "pattern": "^\\+?[1-9]\\d{9,14}$",
        "error-message": "Phone number must be in E.164 format (e.g., +1234567890)"
      },
      "length": {
        "min": 10,
        "max": 15
      }
    },
    "annotations": {
      "inputType": "text"
    },
    "required": {
      "roles": ["user"],
      "scopes": ["profile"]
    },
    "permissions": {
      "view": ["admin", "user"],
      "edit": ["admin", "user"]
    },
    "multivalued": false
  }'

# Newsletter Opt-In
echo "  → Adding newsletterOptIn attribute..."
curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users/profile/attributes" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "newsletterOptIn",
    "displayName": "Subscribe to Newsletter",
    "annotations": {
      "inputType": "checkbox",
      "inputHelperTextBefore": "Receive updates about new features and community highlights"
    },
    "required": {
      "roles": [],
      "scopes": []
    },
    "permissions": {
      "view": ["admin", "user"],
      "edit": ["admin", "user"]
    },
    "multivalued": false
  }'

# SMS Opt-In
echo "  → Adding smsOptIn attribute..."
curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users/profile/attributes" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "smsOptIn",
    "displayName": "Receive SMS Notifications",
    "annotations": {
      "inputType": "checkbox",
      "inputHelperTextBefore": "Get text messages for important account updates"
    },
    "required": {
      "roles": [],
      "scopes": []
    },
    "permissions": {
      "view": ["admin", "user"],
      "edit": ["admin", "user"]
    },
    "multivalued": false
  }'

# House Rules Acceptance
echo "  → Adding houseRulesAccepted attribute..."
curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users/profile/attributes" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "houseRulesAccepted",
    "displayName": "I accept the House Rules",
    "annotations": {
      "inputType": "checkbox",
      "inputHelperTextBefore": "Required: You must agree to our <a href=\"https://workshelf.dev/legal/rules\" target=\"_blank\">House Rules</a>"
    },
    "validations": {
      "options": {
        "options": ["true"]
      }
    },
    "required": {
      "roles": ["user"],
      "scopes": ["profile"]
    },
    "permissions": {
      "view": ["admin", "user"],
      "edit": ["admin", "user"]
    },
    "multivalued": false
  }'

# Birth Year (for age verification)
echo "  → Adding birthYear attribute..."
curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users/profile/attributes" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "birthYear",
    "displayName": "Birth Year",
    "annotations": {
      "inputType": "select-one",
      "inputHelperTextBefore": "You must be 18 or older to register",
      "inputOptionsFromValidation": "options"
    },
    "validations": {
      "integer": {
        "min": 1900,
        "max": 2007
      }
    },
    "required": {
      "roles": ["user"],
      "scopes": ["profile"]
    },
    "permissions": {
      "view": ["admin", "user"],
      "edit": ["admin", "user"]
    },
    "multivalued": false
  }'

echo "✅ User attributes configured!"

# ==========================================
# Enable Email Verification
# ==========================================

echo ""
echo "📧 Step 3: Enabling email verification..."

curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "verifyEmail": true,
    "loginWithEmailAllowed": true,
    "registrationEmailAsUsername": false
  }'

echo "✅ Email verification enabled!"

# ==========================================
# Configure Registration Flow
# ==========================================

echo ""
echo "🎯 Step 4: Configuring registration flow..."

# Enable user registration
curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "registrationAllowed": true,
    "registrationEmailAsUsername": false,
    "resetPasswordAllowed": true,
    "rememberMe": true
  }'

echo "✅ Registration flow configured!"

# ==========================================
# Configure Terms and Conditions
# ==========================================

echo ""
echo "📜 Step 5: Enabling Terms and Conditions..."

# Get the list of required actions
REQUIRED_ACTIONS=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM}/authentication/required-actions" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

# Enable "terms_and_conditions" required action
curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM}/authentication/required-actions/terms_and_conditions" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "alias": "terms_and_conditions",
    "name": "Terms and Conditions",
    "providerId": "terms_and_conditions",
    "enabled": true,
    "defaultAction": true,
    "priority": 20,
    "config": {}
  }'

echo "✅ Terms and Conditions enabled!"

echo ""
echo "🎉 Configuration complete!"
echo ""
echo "Next steps:"
echo "1. Configure SendGrid in Keycloak (Realm Settings → Email tab)"
echo "2. Create Terms of Service and House Rules pages"
echo "3. Test registration flow"
echo ""
