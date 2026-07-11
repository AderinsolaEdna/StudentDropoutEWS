# Educational Early Warning System (EWS) Setup Guide

This guide outlines instructions to run the production-grade Early Warning System (EWS) backend and frontend.

## System Architecture

The early warning system is split into two components:
1. **Backend (`ews_backend`)**: Django 4.2 REST Framework application utilizing an SQLite database. It consumes serialized ML models and preprocessors to serve student directory, batch predictions, and rule-based intervention recommendations.
2. **Frontend (`ews_frontend`)**: React 18 single-page application built on Vite. It features a Departmental Overview risk analyzer (charts in Recharts), alert workflows, and administrative batch upload / manual entry forms.

---

## 1. Backend Server Setup (Django)

The backend requires Python 3.14 (with scientific packages installed). Since NumPy, SciPy, Pandas, Scikit-Learn, and XGBoost are already pre-installed globally, we set up our virtual environment to inherit those packages to avoid compiling from source.

### Setup Steps:

1. **Activate the Virtual Environment**:
   We created a virtual environment inheriting system-level site packages.
   ```powershell
   # Windows PowerShell
   .\.venv\Scripts\Activate.ps1
   ```

2. **Verify Dependencies**:
   Install the required Django packages if not done already:
   ```bash
   pip install django djangorestframework django-cors-headers
   ```

3. **Initialize Database and Migrations**:
   Run database migrations:
   ```bash
   python ews_backend/manage.py makemigrations ews_api
   python ews_backend/manage.py migrate
   ```

4. **Seed Student Database**:
   Populate the database with the ground-truth 4,424 student profiles from `Actual_nigerian_student_dropout_dataset.csv`. This will execute vectorized ML predictions and bulk insert all records, alerts, and predictions in a few seconds:
   ```bash
   python ews_backend/manage.py seed_from_csv
   ```

5. **Start Development Server**:
   Launch the Django server:
   ```bash
   python ews_backend/manage.py runserver
   ```
   The backend API endpoints will be accessible at: `http://localhost:8000/`

---

## 2. Default User Credentials

For testing and grading convenience, default accounts have been configured during database initialization:

| Username | Password | Role | Permitted Actions |
|---|---|---|---|
| **`admin`** | `password123` | Administrator | Full access, including CSV uploads, alert resolving, and manual data entries. |
| **`adviser`** | `password123` | Academic Adviser | Access to Overview, Case Profiles, and Alert management. Admin Ingest Console is hidden. |

---

## 3. Frontend Dashboard Setup (React + Vite)

*Note: The frontend requires Node.js and NPM to compile and run.*

### Execution Steps:

1. **Navigate to Frontend Directory**:
   ```bash
   cd ews_frontend
   ```

2. **Install Node Packages**:
   ```bash
   npm install
   ```

3. **Run Vite Development Server**:
   ```bash
   npm run dev
   ```
   Open the browser to the local URL displayed (default: `http://localhost:3000/`).

4. **Theme Customization**:
   Use the **Theme Switcher** (Sun/Moon icon) in the header navigation bar to toggle between the slate-dark and clean-light modes. The selection persists in `localStorage` across page reloads.

---

## 4. Verification Test Suite

You can execute the automated unit test suite to verify the rule engine, serializer schemas, and database alerts:
```bash
python ews_backend/manage.py test ews_api
```
