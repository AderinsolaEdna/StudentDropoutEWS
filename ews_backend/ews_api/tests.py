from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Student, StudentRecord, PredictionResult, Alert
from .utils import resolve_intervention, calculate_student_drivers
from .serializers import StudentRecordSerializer

User = get_user_model()


class EWSTests(TestCase):
    def setUp(self):
        # Create standard user accounts
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@ews.ng',
            password='testpassword123',
            role='admin'
        )
        self.adviser_user = User.objects.create_user(
            username='adviser_test',
            email='adviser@ews.ng',
            password='testpassword123',
            role='adviser'
        )

        # Create student profile
        self.student = Student.objects.create(
            student_id='STU-9999',
            first_name='Amina',
            last_name='Bello',
            email='amina.bello@univel.edu.ng'
        )

    def test_risk_tier_resolutions(self):
        """Test rule-based intervention logic mapping."""
        # 1. Financial High Risk
        top_drivers_fin = ["Fee_Arrears_Status", "Age_at_Matriculation"]
        rec = resolve_intervention(top_drivers_fin, "High Risk")
        self.assertIn("Bursary Office", rec)
        self.assertIn("Dean of Student Affairs", rec)

        # 2. Academic Medium Risk
        top_drivers_acad = ["CGPA_5point_Scale", "Study_Mode"]
        rec = resolve_intervention(top_drivers_acad, "Medium Risk")
        self.assertIn("peer tutoring", rec)

        # 3. Units Passed High Risk
        top_drivers_units = ["Units_Passed_Semester_1", "Units_Passed_Semester_2"]
        rec = resolve_intervention(top_drivers_units, "High Risk")
        self.assertIn("Head of Department", rec)

        # 4. Multi-agency high risk drivers (Financial + Academic overlap)
        top_drivers_multi = ["Fee_Arrears_Status", "CGPA_5point_Scale"]
        rec = resolve_intervention(top_drivers_multi, "High Risk")
        self.assertEqual("Multi-agency intervention (adviser, welfare officer, bursary); case flagged for Dean of Students review", rec)

    def test_student_record_serializer_validation(self):
        """Test serializer validation thresholds for student features."""
        invalid_data = {
            "student": self.student.id,
            "Gender": 3,  # Invalid (must be 0/1)
            "Age_at_Matriculation": 20,
            "Marital_Status_Binary": 0,
            "Special_Needs_Status": 0,
            "Mother_Education_Level": 5,
            "Father_Education_Level": 5,
            "Mother_Occupation": 2,
            "Father_Occupation": 2,
            "First_Generation_Student": 1,
            "UTME_PostUME_Score": 120.0,
            "Secondary_School_Exit_Grade": 130.0,
            "Study_Mode": 1,
            "Faculty": "Sciences",
            "Year_of_Study": 6,  # Invalid (must be 1-5)
            "Non_Resident_Student": 0,
            "Hostel_Residency": 1,
            "School_Fees_Payment_Status": 1,
            "Fee_Arrears_Status": 0,
            "Bursary_Scholarship_Status": 0,
            "Units_Registered_Semester_1": 6,
            "Units_Passed_Semester_1": 6,
            "Assessments_Sat_Semester_1": 6,
            "Units_No_Assessment_Semester_1": 0,
            "GPA_Semester_1_5pt": 5.5,  # Invalid (max 5.0)
            "Pass_Rate_Semester_1": 1.0,
            "Units_Registered_Semester_2": 6,
            "Units_Passed_Semester_2": 6,
            "Assessments_Sat_Semester_2": 6,
            "Units_No_Assessment_Semester_2": 0,
            "GPA_Semester_2_5pt": 4.0,
            "Pass_Rate_Semester_2": 1.0,
            "CGPA_5point_Scale": 4.75,
            "GPA_Change": 0.5
        }

        serializer = StudentRecordSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("Gender", serializer.errors)
        self.assertIn("Year_of_Study", serializer.errors)
        self.assertIn("GPA_Semester_1_5pt", serializer.errors)

    def test_alert_creation_on_prediction(self):
        """Test active alerts are successfully tied to prediction results."""
        record = StudentRecord.objects.create(
            student=self.student,
            semester_index=1,
            Gender=1,
            Age_at_Matriculation=20,
            Marital_Status_Binary=0,
            Special_Needs_Status=0,
            Mother_Education_Level=3,
            Father_Education_Level=3,
            Mother_Occupation=1,
            Father_Occupation=1,
            First_Generation_Student=0,
            UTME_PostUME_Score=120.0,
            Secondary_School_Exit_Grade=115.0,
            Study_Mode=1,
            Faculty='Engineering',
            Year_of_Study=2,
            Non_Resident_Student=0,
            Hostel_Residency=1,
            School_Fees_Payment_Status=0,
            Fee_Arrears_Status=1,
            Bursary_Scholarship_Status=0,
            Units_Registered_Semester_1=6,
            Units_Passed_Semester_1=2,
            Assessments_Sat_Semester_1=4,
            Units_No_Assessment_Semester_1=2,
            GPA_Semester_1_5pt=1.5,
            Pass_Rate_Semester_1=0.33,
            Units_Registered_Semester_2=6,
            Units_Passed_Semester_2=1,
            Assessments_Sat_Semester_2=3,
            Units_No_Assessment_Semester_2=3,
            GPA_Semester_2_5pt=0.8,
            Pass_Rate_Semester_2=0.16,
            CGPA_5point_Scale=1.15,
            GPA_Change=-0.7
        )

        # Create prediction result (High Risk)
        pred = PredictionResult.objects.create(
            student_record=record,
            probability=0.85,
            risk_tier='High Risk',
            top_drivers=['Fee_Arrears_Status', 'CGPA_5point_Scale'],
            actionable_intervention='Multi-agency response'
        )

        alert = Alert.objects.create(
            prediction_result=pred,
            risk_tier=pred.risk_tier,
            status='open'
        )

        self.assertEqual(Alert.objects.count(), 1)
        self.assertEqual(alert.risk_tier, 'High Risk')
        self.assertEqual(alert.status, 'open')
