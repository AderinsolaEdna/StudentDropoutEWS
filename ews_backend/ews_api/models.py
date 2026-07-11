from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Administrator'),
        ('adviser', 'Academic Adviser'),
        ('welfare_officer', 'Welfare Officer'),
        ('dean', 'Dean of Student Affairs'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='adviser')

    # Add unique related names to avoid auth collision
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='ews_users',
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='ews_user_permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class Student(models.Model):
    student_id = models.CharField(max_length=20, unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student_id} - {self.first_name} {self.last_name}"


class StudentRecord(models.Model):
    FACULTY_CHOICES = (
        ('Sciences', 'Sciences'),
        ('Engineering', 'Engineering'),
        ('Arts', 'Arts'),
        ('Social_Sciences', 'Social Sciences'),
        ('Law', 'Law'),
        ('Medicine', 'Medicine'),
    )

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='records')
    semester_index = models.IntegerField(default=1)  # Represents snapshot count
    created_at = models.DateTimeField(auto_now_add=True)

    # Preprocessing features matching CSV schema
    Gender = models.IntegerField(help_text="1 = Male, 0 = Female")
    Age_at_Matriculation = models.IntegerField()
    Marital_Status_Binary = models.IntegerField(help_text="1 = Married, 0 = Single")
    Special_Needs_Status = models.IntegerField(help_text="1 = Yes, 0 = No")
    Mother_Education_Level = models.IntegerField()
    Father_Education_Level = models.IntegerField()
    Mother_Occupation = models.IntegerField()
    Father_Occupation = models.IntegerField()
    First_Generation_Student = models.IntegerField(help_text="1 = Yes, 0 = No")
    UTME_PostUME_Score = models.FloatField()
    Secondary_School_Exit_Grade = models.FloatField()
    Study_Mode = models.IntegerField(help_text="1 = Full-time, 0 = Part-time")
    Faculty = models.CharField(max_length=30, choices=FACULTY_CHOICES)
    Year_of_Study = models.IntegerField(help_text="Year of Study (1-5)")
    Non_Resident_Student = models.IntegerField(help_text="1 = Yes, 0 = No")
    Hostel_Residency = models.IntegerField(help_text="1 = Residing in hostel, 0 = Off-campus")
    School_Fees_Payment_Status = models.IntegerField(help_text="1 = Paid, 0 = Unpaid")
    Fee_Arrears_Status = models.IntegerField(help_text="1 = Has arrears, 0 = No arrears")
    Bursary_Scholarship_Status = models.IntegerField(help_text="1 = Recipient, 0 = Non-recipient")

    # Semester 1 Academics
    Units_Registered_Semester_1 = models.IntegerField()
    Units_Passed_Semester_1 = models.IntegerField()
    Assessments_Sat_Semester_1 = models.IntegerField()
    Units_No_Assessment_Semester_1 = models.IntegerField()
    GPA_Semester_1_5pt = models.FloatField()
    Pass_Rate_Semester_1 = models.FloatField()

    # Semester 2 Academics
    Units_Registered_Semester_2 = models.IntegerField()
    Units_Passed_Semester_2 = models.IntegerField()
    Assessments_Sat_Semester_2 = models.IntegerField()
    Units_No_Assessment_Semester_2 = models.IntegerField()
    GPA_Semester_2_5pt = models.FloatField()
    Pass_Rate_Semester_2 = models.FloatField()

    # CGPA metrics
    CGPA_5point_Scale = models.FloatField()
    GPA_Change = models.FloatField()

    # Target ground truth
    Dropout_Status = models.IntegerField(default=0, help_text="1 = Dropout, 0 = Non-Dropout")

    def __str__(self):
        return f"{self.student.student_id} - Yr {self.Year_of_Study} Sem {self.semester_index}"


class PredictionResult(models.Model):
    student_record = models.OneToOneField(StudentRecord, on_delete=models.CASCADE, related_name='prediction')
    probability = models.FloatField()
    risk_tier = models.CharField(max_length=20)  # High Risk, Medium Risk, Low Risk
    top_drivers = models.JSONField(help_text="List of top contributing features")
    actionable_intervention = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Prediction for {self.student_record.student.student_id}: {self.risk_tier} ({self.probability:.2%})"


class Alert(models.Model):
    STATUS_CHOICES = (
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
    )

    prediction_result = models.OneToOneField(PredictionResult, on_delete=models.CASCADE, related_name='alert')
    risk_tier = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Alert for {self.prediction_result.student_record.student.student_id} - {self.risk_tier} [{self.get_status_display()}]"
