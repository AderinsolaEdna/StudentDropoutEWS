import logging
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)


def dispatch_alert_email(alert):
    """
    Clearly isolated, mockable service that dispatches email notification for High/Medium risk alerts.
    Gracefully no-ops (logs to console only) if SMTP is not configured.
    """
    # Check if SMTP email backend is configured
    is_smtp = getattr(settings, 'EMAIL_BACKEND', '') == 'django.core.mail.backends.smtp.EmailBackend'
    has_host = bool(getattr(settings, 'EMAIL_HOST', ''))

    student = alert.prediction_result.student_record.student
    prob = alert.prediction_result.probability
    tier = alert.risk_tier
    drivers = alert.prediction_result.top_drivers
    intervention = alert.prediction_result.actionable_intervention

    if not is_smtp or not has_host:
        logger.info(
            f"\n[SIMULATED EMAIL ALERT]"
            f"\n------------------------------------------------------------"
            f"\nRecipient Role(s): Advisers, Welfare Officers, Dean"
            f"\nSubject: Early Warning Alert: Student {student.student_id} is at {tier}"
            f"\nBody:"
            f"\n  Student ID: {student.student_id} ({student.first_name} {student.last_name})"
            f"\n  Email: {student.email}"
            f"\n  Risk Probability: {prob:.2%}"
            f"\n  Risk Tier: {tier}"
            f"\n  Top Drivers: {', '.join(drivers)}"
            f"\n  Intervention recommendation: {intervention}"
            f"\n------------------------------------------------------------\n"
        )
        return False

    try:
        subject = f"EWS Alert: Student {student.student_id} is at {tier}"
        message = (
            f"An early warning alert has been generated for a student:\n\n"
            f"Student ID: {student.student_id}\n"
            f"Name: {student.first_name} {student.last_name}\n"
            f"Email: {student.email}\n"
            f"Risk Probability: {prob:.2%}\n"
            f"Risk Tier: {tier}\n"
            f"Top Contributing Drivers: {', '.join(drivers)}\n\n"
            f"Recommended Intervention:\n{intervention}\n\n"
            f"Please log in to the Early Warning System dashboard to manage this case."
        )

        User = get_user_model()
        # Find all advisers, welfare officers, and deans
        recipients = list(User.objects.filter(role__in=['adviser', 'welfare_officer', 'dean']).values_list('email', flat=True))
        
        # Fallback to default sender email if no users exist
        if not recipients:
            recipients = [getattr(settings, 'DEFAULT_FROM_EMAIL', 'ews-alerts@univel.edu.ng')]

        send_mail(
            subject,
            message,
            getattr(settings, 'DEFAULT_FROM_EMAIL', 'ews-alerts@univel.edu.ng'),
            recipients,
            fail_silently=False,
        )
        logger.info(f"[EMAIL SENT] Alert {alert.id} email dispatched to {recipients}.")
        return True
    except Exception as e:
        logger.error(f"[EMAIL ERROR] Failed to send email alert for student {student.student_id}: {e}")
        return False
