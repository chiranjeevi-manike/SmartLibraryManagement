from app.services.email_service import send_email


send_email(
    to_email="chiru.research@gmail.com",
    subject="Smart Library Email Test",
    body="This is a test email from the Smart Library Management System.",
)

print("Email sent successfully")