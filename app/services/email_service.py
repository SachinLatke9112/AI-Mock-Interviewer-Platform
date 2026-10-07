import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, FROM_EMAIL

def send_interview_reminder_email(to_email: str, subject: str, body: str):
    """
    Sends an email using the configured SMTP server.
    """
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print(f"Skipping email to {to_email} because SMTP credentials are not configured.")
        return False

    sender_email = FROM_EMAIL or SMTP_USERNAME

    message = MIMEMultipart()
    message["From"] = sender_email
    message["To"] = to_email
    message["Subject"] = subject

    message.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
            print(f"Email sent successfully to {to_email}")
            return True
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        return False
