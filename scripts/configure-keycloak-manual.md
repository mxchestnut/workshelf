# Manual Keycloak Registration Configuration

Since the User Profile API isn't available, here's how to configure registration manually via the Keycloak Admin Console:

## 🔐 Access Keycloak Admin

1. Open: https://workshelf-keycloak.wonderfulstone-7c41e05e.centralus.azurecontainerapps.io/admin
2. Login with: `admin` / `e00NiIf26fJzdkdBt1kw`
3. Select the **workshelf** realm (top-left dropdown)

---

## 📝 Step 1: Enable User Registration

1. Click **Realm Settings** (left sidebar)
2. Click the **Login** tab
3. Enable these options:
   - ☑️ **User registration**
   - ☑️ **Forgot password**
   - ☑️ **Remember me**
   - ☑️ **Verify email**
   - ☑️ **Login with email**
4. Click **Save**

---

## 📧 Step 2: Configure Email (SendGrid)

**Important**: You need your SendGrid API key first!

1. Still in **Realm Settings**, click the **Email** tab
2. Configure:
   - **From**: `noreply@workshelf.dev`
   - **From Display Name**: `Work Shelf`
   - **Reply To**: `support@workshelf.dev` (optional)
   - **Reply To Display Name**: `Work Shelf Support` (optional)
   - **Host**: `smtp.sendgrid.net`
   - **Port**: `587`
   - **Enable StartTLS**: ☑️ (checked)
   - **Enable SSL**: ☐ (unchecked)
   - **Authentication**: ☑️ (checked)
   - **Username**: `apikey`
   - **Password**: `YOUR_SENDGRID_API_KEY`
3. Click **Save**
4. Click **Test connection** to verify it works

---

## ✅ Step 3: Configure Required Actions

1. Click **Authentication** (left sidebar)
2. Click the **Required Actions** tab
3. Enable these actions (click the checkboxes):
   - ☑️ **Verify Email** (should be enabled by default)
   - ☑️ **Terms and Conditions** (if available)
   - ☑️ **Update Profile** (optional, for first login)
4. Make sure **Verify Email** is set as **Default Action**

---

## 🎯 Current State

Your Keycloak is now configured for:
- ✅ User registration enabled
- ✅ Email verification required
- ✅ Email service configured (once you add SendGrid)
- ✅ Terms and Conditions (if available in your version)

---

## 📱 What About Phone Numbers and Custom Fields?

Unfortunately, your Keycloak version doesn't support custom user attributes through the User Profile feature. Here are your options:

### Option A: Use Backend Validation (Recommended for Now)
We've already built backend endpoints that handle:
- Phone number validation and uniqueness
- Age verification (birth year ≤ 2007)
- Newsletter/SMS opt-in checkboxes
- House Rules acceptance

**This is the hybrid approach we discussed!**

The flow will be:
1. User registers in Keycloak (basic: username, email, password)
2. User verifies email
3. User is redirected to our **onboarding flow** where they provide:
   - Phone number
   - Birth year (18+ verification)
   - Newsletter opt-in
   - SMS opt-in
   - House Rules acceptance

**Pros**:
- Works with your current Keycloak version
- Better UX (modern React UI instead of Keycloak's basic forms)
- More control over validation and error messages
- Can add duplicate detection ("Sign In Instead" prompts)

**Cons**:
- Two-step process (Keycloak registration → onboarding)
- Users could theoretically skip onboarding (we'd enforce in API)

### Option B: Upgrade Keycloak (Future)
Upgrade to Keycloak 15.0+ to get the User Profile feature with custom attributes.

### Option C: Custom Registration Page (Phase 2)
Build a completely custom registration page that:
- Creates Keycloak user via Admin API
- Saves all data to our database in one step
- Full control over UX

---

## 🚀 Recommended Next Steps

Since you're getting SendGrid, I recommend:

1. **Get SendGrid API key** → Configure email in Keycloak
2. **Test basic registration**: 
   - Try registering a new user
   - Verify email verification works
3. **Build onboarding flow UI** (frontend/src/pages/Onboarding.tsx):
   - Phone number input with validation
   - Birth year dropdown (1900-2007)
   - Newsletter checkbox
   - SMS notifications checkbox
   - House Rules acceptance checkbox with link
   - Terms of Service acceptance checkbox
4. **Deploy backend** with the registration endpoints we created
5. **Run migration 013** to add the new database fields
6. **Test end-to-end** registration flow

Want me to start building the onboarding UI while you get SendGrid set up?

