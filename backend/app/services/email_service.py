"""
Email Service using AWS SES
Handles sending transactional emails including group invitations
"""
import boto3
from botocore.exceptions import ClientError
from typing import Optional
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via AWS SES"""
    
    def __init__(self):
        """Initialize SES client"""
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            self.ses_client = boto3.client(
                'ses',
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )
        else:
            # Use default AWS credentials (IAM role, environment, etc.)
            self.ses_client = boto3.client('ses', region_name=settings.AWS_REGION)
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None
    ) -> bool:
        """
        Send an email via AWS SES
        
        Args:
            to_email: Recipient email address
            subject: Email subject line
            html_body: HTML content of the email
            text_body: Plain text version (optional, falls back to stripped HTML)
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            # If no text body provided, create a simple version
            if not text_body:
                # Strip HTML tags for basic text version
                import re
                text_body = re.sub('<[^<]+?>', '', html_body)
            
            response = self.ses_client.send_email(
                Source=settings.FROM_EMAIL,
                Destination={'ToAddresses': [to_email]},
                Message={
                    'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                    'Body': {
                        'Text': {'Data': text_body, 'Charset': 'UTF-8'},
                        'Html': {'Data': html_body, 'Charset': 'UTF-8'}
                    }
                }
            )
            
            logger.info(f"Email sent to {to_email}. Message ID: {response['MessageId']}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to send email to {to_email}: {e.response['Error']['Message']}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending email to {to_email}: {str(e)}")
            return False
    
    async def send_group_invitation(
        self,
        to_email: str,
        group_name: str,
        inviter_name: str,
        invitation_token: str,
        role: str,
        message: Optional[str] = None
    ) -> bool:
        """
        Send a group invitation email
        
        Args:
            to_email: Recipient email address
            group_name: Name of the group they're invited to
            inviter_name: Name of the person who sent the invitation
            invitation_token: Unique token for accepting the invitation
            role: Role they'll have in the group (member, moderator, admin)
            message: Optional personal message from inviter
        
        Returns:
            bool: True if email sent successfully
        """
        invitation_url = f"{settings.FRONTEND_URL}/invite/{invitation_token}"
        
        subject = f"You're invited to join {group_name} on WorkShelf"
        
        # Create HTML email
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }}
        .header {{
            background-color: #B34B0C;
            padding: 30px 20px;
            text-align: center;
        }}
        .header h1 {{
            color: #ffffff;
            margin: 0;
            font-size: 24px;
        }}
        .content {{
            padding: 40px 30px;
        }}
        .group-name {{
            font-size: 28px;
            font-weight: bold;
            color: #B34B0C;
            margin: 20px 0;
        }}
        .role-badge {{
            display: inline-block;
            background-color: #7C3306;
            color: #ffffff;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            margin: 10px 0;
        }}
        .message-box {{
            background-color: #f9f9f9;
            border-left: 4px solid #B34B0C;
            padding: 15px 20px;
            margin: 20px 0;
            font-style: italic;
            color: #666;
        }}
        .cta-button {{
            display: inline-block;
            background-color: #B34B0C;
            color: #ffffff;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            text-align: center;
        }}
        .cta-button:hover {{
            background-color: #8A3809;
        }}
        .footer {{
            padding: 20px 30px;
            background-color: #f9f9f9;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            font-size: 12px;
            color: #666;
        }}
        .link {{
            color: #B34B0C;
            word-break: break-all;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 You're Invited!</h1>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            
            <p><strong>{inviter_name}</strong> has invited you to join:</p>
            
            <div class="group-name">{group_name}</div>
            
            <p>You'll be joining as a <span class="role-badge">{role}</span></p>
            
            {f'''
            <div class="message-box">
                <p style="margin: 0;">{message}</p>
            </div>
            ''' if message else ''}
            
            <p style="margin-top: 30px;">Click the button below to accept your invitation and join the group:</p>
            
            <div style="text-align: center;">
                <a href="{invitation_url}" class="cta-button">Accept Invitation</a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
                Or copy and paste this link into your browser:<br>
                <a href="{invitation_url}" class="link">{invitation_url}</a>
            </p>
            
            <p style="margin-top: 30px; font-size: 14px; color: #999;">
                This invitation will expire in 7 days.
            </p>
        </div>
        
        <div class="footer">
            <p>You received this email because {inviter_name} invited you to join their group on WorkShelf.</p>
            <p style="margin-top: 10px;">
                <a href="{settings.FRONTEND_URL}" style="color: #B34B0C; text-decoration: none;">Visit WorkShelf</a>
            </p>
        </div>
    </div>
</body>
</html>
"""
        
        # Create plain text version
        text_body = f"""
You're Invited to Join {group_name} on WorkShelf!

Hello,

{inviter_name} has invited you to join {group_name} as a {role}.

{f'Personal message: {message}' if message else ''}

To accept this invitation and join the group, visit:
{invitation_url}

This invitation will expire in 7 days.

---
You received this email because {inviter_name} invited you to join their group on WorkShelf.
Visit WorkShelf: {settings.FRONTEND_URL}
"""
        
        return await self.send_email(to_email, subject, html_body, text_body)


# Global email service instance
email_service = EmailService()
