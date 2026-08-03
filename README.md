# Educational Early Warning System (EWS) 🎓📊
[![Python Version](https://img.shields.io/badge/python-3.10%20%7C%203.11%20%7C%203.12-blue.svg)](#)
[![Django Version](https://img.shields.io/badge/django-4.2-green.svg)](#)
[![React Version](https://img.shields.io/badge/react-18.0-blue.svg)](#)
[![Deploy on Render](https://img.shields.io/badge/Deploy%20to-Render-4642FF?style=flat&logo=render&logoColor=white)](#production-deployment-on-render)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=flat&logo=github&logoColor=white)](https://github.com/AderinsolaEdna/StudentDropoutEWS)

An intelligent, machine-learning-driven Early Warning System (EWS) designed to identify university students at risk of academic dropout. The platform leverages serialized machine learning models (XGBoost & Scikit-Learn) alongside rule-based expert recommendation engines to help academic advisers intervene early and improve student retention rates.

---

## 🏗️ System Architecture

The project is structured into two main components, but configured to run as a single unified service:
1. **Backend (`ews_backend`)**: Django 4.2 REST Framework API. It executes machine learning predictions on student data, processes CSV uploads, handles user authentication, tracks advisory alerts, and serves recommendations.
2. **Frontend (`ews_frontend`)**: A React 18 single-page application. For local modular development, a Vite project is available in `ews_frontend`. For production simplicity and deployment efficiency, the React dashboard is compiled/bundled directly into Django's templates ([dashboard.html](file:///c:/Users/USER/OneDrive/Desktop/SCHOOL/AI-EWS%20v2/ews_backend/templates/dashboard.html)) using modern CDN dependencies (React, Recharts, Axios, Lucide Icons).

---

## 🌟 Key Features

* **Real-time Machine Learning Predictions**: Vectorized batch inference on student profiles using pre-trained ML models.
* **Interactive Analytics Dashboard**: Visualizations of cohort risk distributions, gender-based risk dynamics, and core indicators (GPA, attendance) built using **Recharts**.
* **Adviser Alert Workflows**: Actionable warning statuses (High, Medium, Low Risk) with customizable advisory intervention forms.
* **Role-Based Access Control (RBAC)**: Secure access configurations distinguishing between **Administrators** (full access) and **Academic Advisers** (read/write alerts, no config/batch uploads).
* **Batch Ingestion**: Bulk ingest capability via CSV file uploads to run batch inferences and populate student rosters.
* **Dual Theme Support**: Beautiful glassmorphism UI with persistent Dark/Light modes.

---

## 🛠️ Tech Stack

* **Backend & ML**: Python, Django 4.2, Django REST Framework, NumPy, Pandas, Scikit-Learn, XGBoost, SQLite (default) / PostgreSQL (production).
* **Frontend**: React 18, Tailwind CSS / Custom CSS custom variables, Recharts, Axios, Lucide Icons.

---

## 🚀 Local Quick Start

### 1. Prerequisites
Make sure you have **Python 3.10+** installed on your system.

### 2. Setup Virtual Environment & Install Dependencies
Activate the virtual environment and verify python packages:

```powershell
# 1. Activate the pre-configured virtual environment
.\.venv\Scripts\Activate.ps1

# 2. Install backend dependencies
pip install django djangorestframework django-cors-headers
```

### 3. Initialize Database & Seed Ground-Truth Data
Migrate the database schema and populate it with the ground-truth dataset of 4,424 student profiles (which triggers the ML inference engine):

```bash
# Run migrations
python ews_backend/manage.py makemigrations ews_api
python ews_backend/manage.py migrate

# Seed data from CSV (executes predictions and populates the database)
python ews_backend/manage.py seed_from_csv
```

### 4. Run the Server
Launch the Django server:
```bash
python ews_backend/manage.py runserver
```
Visit the system locally at **[http://localhost:8000/](http://localhost:8000/)**.

---

## 🔒 Default User Credentials

Use the credentials below to log in and inspect the role-based views:

| Username | Password | Role | Permitted Actions |
|---|---|---|---|
| **`admin`** | `password123` | Administrator | Full access, including CSV uploads, alert resolving, and manual data entries. |
| **`adviser`** | `password123` | Academic Adviser | Access to Overview, Case Profiles, and Alert management. Admin Ingest Console is hidden. |

---

## ☁️ Cloud Deployment (Production)

For details on how to deploy the system to a cloud environment (e.g. Render with a production PostgreSQL database), please refer to the [Render Deployment Guide](file:///c:/Users/USER/OneDrive/Desktop/SCHOOL/AI-EWS%20v2/DEPLOYMENT.md).

---

## 🧪 Running Automated Tests

Run the test suite to verify the ML prediction pipeline, alert warning trigger logic, and API serialization schemas:

```bash
python ews_backend/manage.py test ews_api
```
