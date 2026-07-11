from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Student, StudentRecord, PredictionResult, Alert

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'first_name', 'last_name')


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = '__all__'


class StudentRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentRecord
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'semester_index')

    def validate_Gender(self, value):
        if value not in (0, 1):
            raise serializers.ValidationError("Gender must be 0 (Female) or 1 (Male).")
        return value

    def validate_Marital_Status_Binary(self, value):
        if value not in (0, 1):
            raise serializers.ValidationError("Marital_Status_Binary must be 0 or 1.")
        return value

    def validate_Special_Needs_Status(self, value):
        if value not in (0, 1):
            raise serializers.ValidationError("Special_Needs_Status must be 0 or 1.")
        return value

    def validate_First_Generation_Student(self, value):
        if value not in (0, 1):
            raise serializers.ValidationError("First_Generation_Student must be 0 or 1.")
        return value

    def validate_Study_Mode(self, value):
        if value not in (0, 1):
            raise serializers.ValidationError("Study_Mode must be 0 or 1.")
        return value

    def validate_Year_of_Study(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Year_of_Study must be between 1 and 5.")
        return value

    def validate_Non_Resident_Student(self, value):
        if value not in (0, 1):
            raise serializers.ValidationError("Non_Resident_Student must be 0 or 1.")
        return value

    def validate_Hostel_Residency(self, value):
        if value not in (0, 1):
            raise serializers.ValidationError("Hostel_Residency must be 0 or 1.")
        return value

    def validate_School_Fees_Payment_Status(self, value):
        if value not in (0, 1):
            raise serializers.ValidationError("School_Fees_Payment_Status must be 0 or 1.")
        return value

    def validate_Fee_Arrears_Status(self, value):
        if value not in (0, 1):
            raise serializers.ValidationError("Fee_Arrears_Status must be 0 or 1.")
        return value

    def validate_Bursary_Scholarship_Status(self, value):
        if value not in (0, 1):
            raise serializers.ValidationError("Bursary_Scholarship_Status must be 0 or 1.")
        return value

    def validate_GPA_Semester_1_5pt(self, value):
        if not (0.0 <= value <= 5.0):
            raise serializers.ValidationError("GPA_Semester_1_5pt must be between 0.0 and 5.0.")
        return value

    def validate_GPA_Semester_2_5pt(self, value):
        if not (0.0 <= value <= 5.0):
            raise serializers.ValidationError("GPA_Semester_2_5pt must be between 0.0 and 5.0.")
        return value

    def validate_CGPA_5point_Scale(self, value):
        if not (0.0 <= value <= 5.0):
            raise serializers.ValidationError("CGPA_5point_Scale must be between 0.0 and 5.0.")
        return value

    def validate_Pass_Rate_Semester_1(self, value):
        if not (0.0 <= value <= 1.0):
            raise serializers.ValidationError("Pass_Rate_Semester_1 must be a ratio between 0.0 and 1.0.")
        return value

    def validate_Pass_Rate_Semester_2(self, value):
        if not (0.0 <= value <= 1.0):
            raise serializers.ValidationError("Pass_Rate_Semester_2 must be a ratio between 0.0 and 1.0.")
        return value


class PredictionResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = PredictionResult
        fields = '__all__'


class AlertSerializer(serializers.ModelSerializer):
    student_id = serializers.CharField(source='prediction_result.student_record.student.student_id', read_only=True)
    student_name = serializers.SerializerMethodField()
    faculty = serializers.CharField(source='prediction_result.student_record.Faculty', read_only=True)
    probability = serializers.FloatField(source='prediction_result.probability', read_only=True)
    actionable_intervention = serializers.CharField(source='prediction_result.actionable_intervention', read_only=True)
    top_drivers = serializers.JSONField(source='prediction_result.top_drivers', read_only=True)

    class Meta:
        model = Alert
        fields = ('id', 'student_id', 'student_name', 'faculty', 'risk_tier', 'probability', 'status', 'top_drivers', 'actionable_intervention', 'created_at', 'updated_at')

    def get_student_name(self, obj):
        student = obj.prediction_result.student_record.student
        return f"{student.first_name} {student.last_name}"
