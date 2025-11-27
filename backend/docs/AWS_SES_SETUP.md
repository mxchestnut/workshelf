# AWS SES Email Setup Guide

This guide explains how to configure AWS SES (Simple Email Service) for sending group invitation emails in WorkShelf.

## Prerequisites

- AWS account with SES access
- AWS IAM user with SES permissions
- Verified sender email address in SES

## Step 1: Verify Your Email Domain/Address

1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Select the region you want to use (e.g., `us-east-1`)
3. Navigate to **Verified identities**
4. Click **Create identity**
5. Choose **Email address** or **Domain**
   - For email: Enter `noreply@workshelf.dev` (or your custom email)
   - For domain: Enter `workshelf.dev` and follow DNS verification steps
6. Check your inbox and click the verification link (if using email address)

## Step 2: Request Production Access (Optional)

By default, SES is in **sandbox mode** which only allows:
- Sending to verified email addresses
- Up to 200 emails per day
- 1 email per second

For production use:
1. In SES Console, go to **Account dashboard**
2. Click **Request production access**
3. Fill out the form explaining your use case
4. Wait for AWS approval (usually 24-48 hours)

## Step 3: Create IAM User for SES

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Navigate to **Users** → **Create user**
3. Enter username: `workshelf-ses-sender`
4. Click **Next**
5. Select **Attach policies directly**
6. Search and select: `AmazonSESFullAccess` (or create custom policy below)
7. Click **Create user**

### Custom IAM Policy (Recommended - Least Privilege)

Instead of full access, create a custom policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

## Step 4: Generate Access Keys

1. Click on the created user
2. Go to **Security credentials** tab
3. Scroll to **Access keys**
4. Click **Create access key**
5. Select **Application running outside AWS**
6. Click **Next** and then **Create access key**
7. **IMPORTANT**: Save the access key ID and secret access key

## Step 5: Configure Environment Variables

Add the following to your `.env` file:

```bash
# AWS SES Email
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
FROM_EMAIL=noreply@workshelf.dev
FRONTEND_URL=https://workshelf.dev
```

Replace:
- `AWS_ACCESS_KEY_ID`: Your actual access key ID from Step 4
- `AWS_SECRET_ACCESS_KEY`: Your actual secret access key from Step 4
- `AWS_REGION`: The region where you verified your email (e.g., `us-east-1`, `us-west-2`)
- `FROM_EMAIL`: Your verified sender email address
- `FRONTEND_URL`: Your frontend URL for invitation links

## Step 6: Test Email Sending

### In Sandbox Mode

While in sandbox mode, you can only send to verified recipients:

1. Verify your test email address:
   - Go to SES Console → **Verified identities**
   - Create identity with your test email
   - Verify it via email link

2. Send a test invitation through the API

### After Production Access

Once approved, you can send to any email address.

## Troubleshooting

### Error: "Email address is not verified"

**Solution**: 
- If in sandbox mode, verify the recipient email address in SES Console
- If in production, ensure your sender email/domain is verified

### Error: "AccessDeniedException"

**Solution**:
- Check that your IAM user has SES permissions
- Verify the access keys are correct in `.env`
- Ensure the region in `.env` matches where your email is verified

### Error: "Rate exceeded"

**Solution**:
- You've hit the sending limit (200/day in sandbox, or your quota in production)
- Wait for the quota to reset or request a quota increase in SES Console

### Emails going to spam

**Solution**:
- Set up SPF, DKIM, and DMARC records for your domain
- Use SES with a verified domain (not just email address)
- Follow email best practices (avoid spammy content, clear unsubscribe)

## Email Template Features

The group invitation email includes:

- **Branded header** with WorkShelf colors
- **Group name** and inviter information
- **Role badge** showing assigned role
- **Personal message** (if provided)
- **Call-to-action button** with secure invitation link
- **Plain text fallback** for email clients that don't support HTML
- **7-day expiration notice**
- **Responsive design** for mobile devices

## Cost Estimation

AWS SES Pricing (as of 2024):
- First 62,000 emails/month: **FREE** (when sending from EC2, Lambda, etc.)
- Or: $0.10 per 1,000 emails
- Email receiving: $0.10 per 1,000 emails

Example:
- 10,000 invitations/month = ~$1.00/month (or free from AWS services)
- Very cost-effective compared to other email services

## Alternative: Using IAM Roles (Production)

For production on AWS infrastructure (EC2, ECS, Lambda):

1. Create an IAM role with SES permissions
2. Attach the role to your compute resource
3. Remove `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from `.env`
4. The boto3 client will automatically use the IAM role

This is more secure as you don't store credentials in environment variables.

## Monitoring

Check email sending metrics:
1. Go to SES Console → **Account dashboard**
2. View:
   - Sending quota and usage
   - Bounce rate
   - Complaint rate
   - Reputation dashboard

Maintain:
- Bounce rate < 5%
- Complaint rate < 0.1%

To avoid account suspension.

## Additional Resources

- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [SES Best Practices](https://docs.aws.amazon.com/ses/latest/dg/best-practices.html)
- [Email Authentication (SPF/DKIM)](https://docs.aws.amazon.com/ses/latest/dg/email-authentication-methods.html)
