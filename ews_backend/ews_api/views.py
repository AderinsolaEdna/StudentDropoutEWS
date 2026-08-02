import csv
import io
import random
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListAPIView, RetrieveAPIView, UpdateAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.conf import settings
from django.db import transaction, models
from django.shortcuts import get_object_or_404
import json
import os

from .models import Student, StudentRecord, PredictionResult, Alert
from .serializers import (
    UserSerializer, StudentSerializer, StudentRecordSerializer,
    PredictionResultSerializer, AlertSerializer
)
from .utils import predict_dropout_risk, load_assets
from .services import dispatch_alert_email

NIGERIAN_FIRST_NAMES = ["Tunde", "Chinelo", "Amina", "Obi", "Oluwaseun", "Fatima", "Emeka", "Ngozi", "Yusuf", "Aderinsola", "Babatunde", "Chinedu", "Zainab", "Ibrahim", "Kehinde", "Taiwo", "Yetunde", "Chidi"]
NIGERIAN_LAST_NAMES = ["Obi", "Adeniran", "Bello", "Okonkwo", "Olayemi", "Abubakar", "Eze", "Balogun", "Chukwu", "Olorunfemi", "Soyinka", "Adeyemi", "Babangida", "Nwachukwu", "Okeke", "Danjuma"]


# Custom Permissions
class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'role', None) == 'admin'


class IsEwsStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        role = getattr(request.user, 'role', None)
        return role in ['admin', 'adviser', 'welfare_officer', 'dean']


# Custom Auth Token View to return user details & role
class CustomObtainAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'role': user.role,
            'email': user.email
        })


class MetricsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsEwsStaff]

    def get(self, request):
        """Serves the training pipeline's model comparison metrics."""
        metrics_path = os.path.join(settings.BASE_DIR, 'models', 'metrics_summary.json')
        if os.path.exists(metrics_path):
            with open(metrics_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return Response(data)
        return Response({"error": "Metrics summary file not found."}, status=status.HTTP_404_NOT_FOUND)


class UploadView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request):
        """Batch CSV student record upload."""
        if 'file' not in request.FILES:
            return Response({"error": "No CSV file provided."}, status=status.HTTP_400_BAD_REQUEST)

        csv_file = request.FILES['file']
        if not csv_file.name.endswith('.csv'):
            return Response({"error": "Uploaded file is not a CSV."}, status=status.HTTP_400_BAD_REQUEST)

        # Read file contents
        file_data = csv_file.read().decode('utf-8')
        io_string = io.StringIO(file_data)
        reader = csv.DictReader(io_string)

        success_count = 0
        failed_count = 0
        errors = []

        # Make sure assets are loaded
        load_assets()

        # Execute inside a transaction to protect database state on major errors
        with transaction.atomic():
            for idx, row in enumerate(reader, start=1):
                # Clean row dictionary keys (remove spaces)
                clean_row = {k.strip(): v.strip() if isinstance(v, str) else v for k, v in row.items()}
                
                # Check for student ID or auto-generate
                student_id = clean_row.pop('student_id', None)
                first_name = clean_row.pop('first_name', None)
                last_name = clean_row.pop('last_name', None)
                email = clean_row.pop('email', None)

                # Validate data fields using StudentRecordSerializer
                # To feed into serializer, we must temporarily mock the student FK
                # We will write temporary validation dict
                val_data = clean_row.copy()
                # Dummy student id for validation, will replace with real ID
                # Find or create Student
                try:
                    if student_id:
                        student = Student.objects.filter(student_id=student_id).first()
                        if not student:
                            # Create new student with custom details
                            f_name = first_name or random.choice(NIGERIAN_FIRST_NAMES)
                            l_name = last_name or random.choice(NIGERIAN_LAST_NAMES)
                            em = email or f"{f_name.lower()}.{l_name.lower()}@univel.edu.ng"
                            # Ensure unique email
                            while Student.objects.filter(email=em).exists():
                                em = f"{f_name.lower()}.{l_name.lower()}{random.randint(1, 999)}@univel.edu.ng"
                            student = Student.objects.create(
                                student_id=student_id,
                                first_name=f_name,
                                last_name=l_name,
                                email=em
                            )
                    else:
                        # Auto generate student
                        count = Student.objects.count() + 1
                        generated_id = f"STU-{count:04d}"
                        # Loop until unique ID is found
                        while Student.objects.filter(student_id=generated_id).exists():
                            count += 1
                            generated_id = f"STU-{count:04d}"
                            
                        f_name = first_name or random.choice(NIGERIAN_FIRST_NAMES)
                        l_name = last_name or random.choice(NIGERIAN_LAST_NAMES)
                        em = email or f"{f_name.lower()}.{l_name.lower()}@univel.edu.ng"
                        # Ensure unique email
                        while Student.objects.filter(email=em).exists():
                            em = f"{f_name.lower()}.{l_name.lower()}{random.randint(1, 999)}@univel.edu.ng"
                            
                        student = Student.objects.create(
                            student_id=generated_id,
                            first_name=f_name,
                            last_name=l_name,
                            email=em
                        )

                    val_data['student'] = student.id
                    # Also default semester_index based on past records
                    sem_idx = StudentRecord.objects.filter(student=student).count() + 1
                    
                    serializer = StudentRecordSerializer(data=val_data)
                    if serializer.is_valid():
                        record = serializer.save(semester_index=sem_idx)
                        
                        # Generate PredictionResult
                        pred_input = val_data.copy()
                        # Restore Faculty nominal representation for prediction mapping
                        pred_input['Faculty'] = record.Faculty
                        pred_result = predict_dropout_risk(pred_input)
                        
                        pred_obj = PredictionResult.objects.create(
                            student_record=record,
                            probability=pred_result['probability'],
                            risk_tier=pred_result['risk_tier'],
                            top_drivers=pred_result['top_drivers'],
                            actionable_intervention=pred_result['actionable_intervention']
                        )
                        
                        # Auto-Create Alert if Medium or High risk
                        if pred_obj.risk_tier in ('High Risk', 'Medium Risk'):
                            alert_obj = Alert.objects.create(
                                prediction_result=pred_obj,
                                risk_tier=pred_obj.risk_tier,
                                status='open'
                            )
                            # Dispatch alert email (gracefully logs inside service if SMTP is missing)
                            dispatch_alert_email(alert_obj)
                            
                        success_count += 1
                    else:
                        failed_count += 1
                        errors.append({
                            "row": idx,
                            "errors": serializer.errors
                        })
                except Exception as e:
                    failed_count += 1
                    errors.append({
                        "row": idx,
                        "errors": {"system": [str(e)]}
                    })

        return Response({
            "success_count": success_count,
            "failed_count": failed_count,
            "errors": errors
        }, status=status.HTTP_201_CREATED if success_count > 0 else status.HTTP_400_BAD_REQUEST)


class ManualEntryView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsEwsStaff]

    def post(self, request):
        """Single-student record manual submission."""
        data = request.data.copy()
        
        student_id = data.pop('student_id', None)
        first_name = data.pop('first_name', None)
        last_name = data.pop('last_name', None)
        email = data.pop('email', None)

        try:
            # Handle student lookup or creation
            if student_id:
                student = Student.objects.filter(student_id=student_id).first()
                if not student:
                    if not first_name or not last_name:
                        return Response({"error": "Student ID doesn't exist. Please provide first_name and last_name to create."}, status=status.HTTP_400_BAD_REQUEST)
                    em = email or f"{first_name.lower()}.{last_name.lower()}@univel.edu.ng"
                    student = Student.objects.create(
                        student_id=student_id,
                        first_name=first_name,
                        last_name=last_name,
                        email=em
                    )
            else:
                # Auto-generate student
                count = Student.objects.count() + 1
                generated_id = f"STU-{count:04d}"
                while Student.objects.filter(student_id=generated_id).exists():
                    count += 1
                    generated_id = f"STU-{count:04d}"
                f_name = first_name or random.choice(NIGERIAN_FIRST_NAMES)
                l_name = last_name or random.choice(NIGERIAN_LAST_NAMES)
                em = email or f"{f_name.lower()}.{l_name.lower()}@univel.edu.ng"
                student = Student.objects.create(
                    student_id=generated_id,
                    first_name=f_name,
                    last_name=l_name,
                    email=em
                )

            data['student'] = student.id
            sem_idx = StudentRecord.objects.filter(student=student).count() + 1

            serializer = StudentRecordSerializer(data=data)
            if serializer.is_valid():
                record = serializer.save(semester_index=sem_idx)

                # Execute ML Inference
                pred_input = data.copy()
                pred_input['Faculty'] = record.Faculty
                pred_result = predict_dropout_risk(pred_input)

                # Persist Prediction
                pred_obj = PredictionResult.objects.create(
                    student_record=record,
                    probability=pred_result['probability'],
                    risk_tier=pred_result['risk_tier'],
                    top_drivers=pred_result['top_drivers'],
                    actionable_intervention=pred_result['actionable_intervention']
                )

                # Auto-Create Alert
                if pred_obj.risk_tier in ('High Risk', 'Medium Risk'):
                    alert_obj = Alert.objects.create(
                        prediction_result=pred_obj,
                        risk_tier=pred_obj.risk_tier,
                        status='open'
                    )
                    dispatch_alert_email(alert_obj)

                return Response({
                    "student_id": student.student_id,
                    "student_name": f"{student.first_name} {student.last_name}",
                    "record_id": record.id,
                    "prediction": {
                        "probability": pred_obj.probability,
                        "risk_tier": pred_obj.risk_tier,
                        "top_drivers": pred_obj.top_drivers,
                        "actionable_intervention": pred_obj.actionable_intervention
                    }
                }, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PredictView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsEwsStaff]

    def post(self, request, record_id):
        """Runs inference or retrieves saved prediction results for a record."""
        record = get_object_or_404(StudentRecord, id=record_id)
        
        # Check if prediction exists
        if hasattr(record, 'prediction'):
            pred = record.prediction
            return Response({
                "probability": pred.probability,
                "risk_tier": pred.risk_tier,
                "top_drivers": pred.top_drivers,
                "actionable_intervention": pred.actionable_intervention
            })

        # Run inference otherwise
        try:
            # Map model inputs from model instance values
            # Reconstruct dictionary from database record
            fields = [f.name for f in StudentRecord._meta.fields]
            row_dict = {}
            for field in fields:
                if field not in ['id', 'student', 'created_at', 'semester_index']:
                    row_dict[field] = getattr(record, field)
            
            # Predict
            pred_result = predict_dropout_risk(row_dict)
            
            # Persist prediction
            pred_obj = PredictionResult.objects.create(
                student_record=record,
                probability=pred_result['probability'],
                risk_tier=pred_result['risk_tier'],
                top_drivers=pred_result['top_drivers'],
                actionable_intervention=pred_result['actionable_intervention']
            )

            # Auto-create alert
            if pred_obj.risk_tier in ('High Risk', 'Medium Risk'):
                alert_obj = Alert.objects.create(
                    prediction_result=pred_obj,
                    risk_tier=pred_obj.risk_tier,
                    status='open'
                )
                dispatch_alert_email(alert_obj)

            return Response(pred_result)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'limit'
    max_page_size = 100


class StudentListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsEwsStaff]

    def get(self, request):
        """Paginated lists of students with filters & sorting options."""
        # We query the latest StudentRecord for each student
        records = StudentRecord.objects.select_related('student', 'prediction')

        # Filters
        faculty = request.query_params.get('faculty', 'All')
        if faculty != 'All' and faculty:
            records = records.filter(Faculty__iexact=faculty)

        risk_tier = request.query_params.get('risk_tier', 'All')
        if risk_tier == 'High & Medium Risk':
            records = records.filter(prediction__risk_tier__in=['High Risk', 'Medium Risk'])
        elif risk_tier != 'All' and risk_tier:
            records = records.filter(prediction__risk_tier=risk_tier)

        year_of_study = request.query_params.get('year_of_study', '')
        if year_of_study:
            try:
                records = records.filter(Year_of_Study=int(year_of_study))
            except ValueError:
                pass

        search = request.query_params.get('search', '').strip().lower()
        if search:
            records = records.filter(
                models.Q(student__student_id__icontains=search) |
                models.Q(student__first_name__icontains=search) |
                models.Q(student__last_name__icontains=search) |
                models.Q(Faculty__icontains=search)
            )

        # Sorting
        sort_by = request.query_params.get('sort_by', 'student_id')
        sort_order = request.query_params.get('sort_order', 'asc')
        prefix = '-' if sort_order == 'desc' else ''

        if sort_by == 'cgpa':
            records = records.order_by(f"{prefix}CGPA_5point_Scale")
        elif sort_by == 'probability':
            records = records.order_by(f"{prefix}prediction__probability")
        else:
            # Default sorting by student ID
            records = records.order_by(f"{prefix}student__student_id")

        paginator = StandardResultsSetPagination()
        paginated_records = paginator.paginate_queryset(records, request, view=self)

        students_summary = []
        for r in paginated_records:
            pred = getattr(r, 'prediction', None)
            students_summary.append({
                "student_id": r.student.student_id,
                "first_name": r.student.first_name,
                "last_name": r.student.last_name,
                "faculty": r.Faculty,
                "cgpa": r.CGPA_5point_Scale,
                "year_of_study": r.Year_of_Study,
                "gender": "Male" if r.Gender == 1 else "Female",
                "risk_probability": pred.probability if pred else 0.0,
                "risk_tier": pred.risk_tier if pred else "Low Risk",
                "record_id": r.id
            })

        return paginator.get_paginated_response(students_summary)


class StudentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsEwsStaff]

    def get(self, request, student_id):
        """Fetches detailed profile + prediction history for a single student."""
        student = get_object_or_404(Student, student_id=student_id)
        records = StudentRecord.objects.filter(student=student).order_by('-semester_index')
        
        if not records.exists():
            return Response({"error": "No records found for this student."}, status=status.HTTP_404_NOT_FOUND)

        latest_record = records[0]
        latest_pred = getattr(latest_record, 'prediction', None)

        # Full feature representation
        fields = [f.name for f in StudentRecord._meta.fields]
        features_dict = {}
        for field in fields:
            if field not in ['id', 'student', 'created_at']:
                features_dict[field] = getattr(latest_record, field)

        # Prediction History
        history = []
        for r in records:
            pred = getattr(r, 'prediction', None)
            history.append({
                "semester_index": r.semester_index,
                "year_of_study": r.Year_of_Study,
                "cgpa": r.CGPA_5point_Scale,
                "probability": pred.probability if pred else None,
                "risk_tier": pred.risk_tier if pred else "Low Risk",
                "created_at": r.created_at
            })

        response_data = {
            "student_id": student.student_id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "email": student.email,
            "features": features_dict,
            "prediction": {
                "probability": latest_pred.probability if latest_pred else 0.0,
                "risk_tier": latest_pred.risk_tier if latest_pred else "Low Risk",
                "top_drivers": latest_pred.top_drivers if latest_pred else [],
                "actionable_intervention": latest_pred.actionable_intervention if latest_pred else "No intervention required."
            } if latest_pred else None,
            "history": history
        }
        return Response(response_data)


class AlertListView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsEwsStaff]
    serializer_class = AlertSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = Alert.objects.select_related('prediction_result__student_record__student').order_by('-created_at')
        
        status_param = self.request.query_params.get('status', '')
        if status_param and status_param != 'All':
            queryset = queryset.filter(status=status_param)

        risk_param = self.request.query_params.get('risk_tier', '')
        if risk_param and risk_param != 'All':
            queryset = queryset.filter(risk_tier=risk_param)

        return queryset


class AlertUpdateView(UpdateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsEwsStaff]
    serializer_class = AlertSerializer
    queryset = Alert.objects.all()
    lookup_field = 'id'

    def patch(self, request, *args, **kwargs):
        """Allows toggling status of alert: 'open', 'in_progress', 'resolved'."""
        alert = self.get_object()
        new_status = request.data.get('status')
        if new_status not in ['open', 'in_progress', 'resolved']:
            return Response({"error": "Invalid status value."}, status=status.HTTP_400_BAD_REQUEST)
        
        alert.status = new_status
        alert.save()
        serializer = self.get_serializer(alert)
        return Response(serializer.data)
