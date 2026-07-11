from django.urls import path
from .views import (
    CustomObtainAuthToken, MetricsView, UploadView, ManualEntryView,
    PredictView, StudentListView, StudentDetailView, AlertListView, AlertUpdateView
)

urlpatterns = [
    path('login/', CustomObtainAuthToken.as_view(), name='api_login'),
    path('metrics/', MetricsView.as_view(), name='api_metrics'),
    path('upload/', UploadView.as_view(), name='api_upload'),
    path('students/manual-entry/', ManualEntryView.as_view(), name='api_manual_entry'),
    path('predict/<int:record_id>/', PredictView.as_view(), name='api_predict'),
    path('students/', StudentListView.as_view(), name='api_students'),
    path('students/<str:student_id>/', StudentDetailView.as_view(), name='api_student_detail'),
    path('alerts/', AlertListView.as_view(), name='api_alerts'),
    path('alerts/<int:id>/', AlertUpdateView.as_view(), name='api_alert_update'),
]
