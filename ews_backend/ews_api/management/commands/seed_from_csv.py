import os
import random
import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction
from django.conf import settings
from ews_api.models import Student, StudentRecord, PredictionResult, Alert
from ews_api.utils import predict_dropout_risk_batch, load_assets

NIGERIAN_FIRST_NAMES = ["Tunde", "Chinelo", "Amina", "Obi", "Oluwaseun", "Fatima", "Emeka", "Ngozi", "Yusuf", "Aderinsola", "Babatunde", "Chinedu", "Zainab", "Ibrahim", "Kehinde", "Taiwo", "Yetunde", "Chidi"]
NIGERIAN_LAST_NAMES = ["Obi", "Adeniran", "Bello", "Okonkwo", "Olayemi", "Abubakar", "Eze", "Balogun", "Chukwu", "Olorunfemi", "Soyinka", "Adeyemi", "Babangida", "Nwachukwu", "Okeke", "Danjuma"]


class Command(BaseCommand):
    help = "Seeds the database with students and records from the ground-truth CSV dataset."

    def handle(self, *args, **options):
        csv_path = os.path.join(settings.BASE_DIR, 'data', 'Actual_nigerian_student_dropout_dataset.csv')
        
        if not os.path.exists(csv_path):
            self.stdout.write(self.style.ERROR(f"Dataset CSV not found at {csv_path}"))
            return

        self.stdout.write("[*] Loading CSV dataset and pre-loading ML model assets...")
        df = pd.read_csv(csv_path)
        load_assets()

        self.stdout.write("[*] Purging existing database tables...")
        with transaction.atomic():
            Alert.objects.all().delete()
            PredictionResult.objects.all().delete()
            StudentRecord.objects.all().delete()
            Student.objects.all().delete()

        self.stdout.write(f"[*] Ingesting {len(df):,} student records...")
        
        # 1. Generate Students (bulk creation)
        students_to_create = []
        emails_set = set()

        for idx in range(len(df)):
            student_id = f"STU-{idx+1:04d}"
            first_name = random.choice(NIGERIAN_FIRST_NAMES)
            last_name = random.choice(NIGERIAN_LAST_NAMES)
            
            # Ensure unique email
            email = f"{first_name.lower()}.{last_name.lower()}@univel.edu.ng"
            counter = 1
            while email in emails_set:
                email = f"{first_name.lower()}.{last_name.lower()}{counter}@univel.edu.ng"
                counter += 1
            emails_set.add(email)

            students_to_create.append(Student(
                student_id=student_id,
                first_name=first_name,
                last_name=last_name,
                email=email
            ))

        self.stdout.write("[*] Bulk inserting Students into SQLite...")
        Student.objects.bulk_create(students_to_create, batch_size=1000)
        
        # Retrieve all inserted students to map their primary keys
        student_map = {s.student_id: s for s in Student.objects.all()}

        # 2. Generate StudentRecords (bulk creation)
        records_to_create = []
        for idx, row in df.iterrows():
            student_id = f"STU-{idx+1:04d}"
            student = student_map[student_id]
            
            records_to_create.append(StudentRecord(
                student=student,
                semester_index=1, # Initial snapshot
                Gender=int(row['Gender']),
                Age_at_Matriculation=int(row['Age_at_Matriculation']),
                Marital_Status_Binary=int(row['Marital_Status_Binary']),
                Special_Needs_Status=int(row['Special_Needs_Status']),
                Mother_Education_Level=int(row['Mother_Education_Level']),
                Father_Education_Level=int(row['Father_Education_Level']),
                Mother_Occupation=int(row['Mother_Occupation']),
                Father_Occupation=int(row['Father_Occupation']),
                First_Generation_Student=int(row['First_Generation_Student']),
                UTME_PostUME_Score=float(row['UTME_PostUME_Score']),
                Secondary_School_Exit_Grade=float(row['Secondary_School_Exit_Grade']),
                Study_Mode=int(row['Study_Mode']),
                Faculty=row['Faculty'].strip(),
                Year_of_Study=int(row['Year_of_Study']),
                Non_Resident_Student=int(row['Non_Resident_Student']),
                Hostel_Residency=int(row['Hostel_Residency']),
                School_Fees_Payment_Status=int(row['School_Fees_Payment_Status']),
                Fee_Arrears_Status=int(row['Fee_Arrears_Status']),
                Bursary_Scholarship_Status=int(row['Bursary_Scholarship_Status']),
                Units_Registered_Semester_1=int(row['Units_Registered_Semester_1']),
                Units_Passed_Semester_1=int(row['Units_Passed_Semester_1']),
                Assessments_Sat_Semester_1=int(row['Assessments_Sat_Semester_1']),
                Units_No_Assessment_Semester_1=int(row['Units_No_Assessment_Semester_1']),
                GPA_Semester_1_5pt=float(row['GPA_Semester_1_5pt']),
                Pass_Rate_Semester_1=float(row['Pass_Rate_Semester_1']),
                Units_Registered_Semester_2=int(row['Units_Registered_Semester_2']),
                Units_Passed_Semester_2=int(row['Units_Passed_Semester_2']),
                Assessments_Sat_Semester_2=int(row['Assessments_Sat_Semester_2']),
                Units_No_Assessment_Semester_2=int(row['Units_No_Assessment_Semester_2']),
                GPA_Semester_2_5pt=float(row['GPA_Semester_2_5pt']),
                Pass_Rate_Semester_2=float(row['Pass_Rate_Semester_2']),
                CGPA_5point_Scale=float(row['CGPA_5point_Scale']),
                GPA_Change=float(row['GPA_Change']),
                Dropout_Status=int(row['Dropout_Status'])
            ))

        self.stdout.write("[*] Bulk inserting StudentRecords into SQLite...")
        StudentRecord.objects.bulk_create(records_to_create, batch_size=1000)

        # Retrieve created student records to map database PKs
        all_records = StudentRecord.objects.all().select_related('student')
        record_map = {r.student.student_id: r for r in all_records}

        # 3. Compute predictions in batch (vectorized)
        self.stdout.write("[*] Computing batch ML inference predictions...")
        batch_preds = predict_dropout_risk_batch(df)

        # 4. Generate PredictionResults (bulk creation)
        predictions_to_create = []
        for idx, row in df.iterrows():
            student_id = f"STU-{idx+1:04d}"
            record = record_map[student_id]
            pred = batch_preds[idx]
            
            predictions_to_create.append(PredictionResult(
                student_record=record,
                probability=pred['probability'],
                risk_tier=pred['risk_tier'],
                top_drivers=pred['top_drivers'],
                actionable_intervention=pred['actionable_intervention']
            ))

        self.stdout.write("[*] Bulk inserting PredictionResults into SQLite...")
        PredictionResult.objects.bulk_create(predictions_to_create, batch_size=1000)

        # Retrieve prediction results to map database PKs
        all_predictions = PredictionResult.objects.all().select_related('student_record__student')
        pred_map = {p.student_record.student.student_id: p for p in all_predictions}

        # 5. Generate Alerts for Medium and High Risk (bulk creation)
        alerts_to_create = []
        for idx in range(len(df)):
            student_id = f"STU-{idx+1:04d}"
            pred = pred_map[student_id]
            
            if pred.risk_tier in ('High Risk', 'Medium Risk'):
                alerts_to_create.append(Alert(
                    prediction_result=pred,
                    risk_tier=pred.risk_tier,
                    status='open'
                ))

        self.stdout.write("[*] Bulk inserting active Alerts into SQLite...")
        Alert.objects.bulk_create(alerts_to_create, batch_size=1000)

        self.stdout.write(self.style.SUCCESS(f"[+] Seeding complete! Ingested {len(student_map):,} students and created {len(alerts_to_create):,} active alerts."))
