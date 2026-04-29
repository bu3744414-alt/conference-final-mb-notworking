import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import io
from flask import Flask, render_template, request, redirect, session, jsonify, send_file
from database.db import get_connection
from reportlab.platypus import SimpleDocTemplate, Table
import pandas as pd
from waitress import serve

app = Flask(__name__)
app.secret_key = "secret123"

# Application is created by AADI SAI NEEKSHAY(IT Intern) if any software wants to be created or maintained contact:aadisaineekshay@gmail.com
import logging
logging.basicConfig(level=logging.DEBUG)

# import all blueprints
from routes.auth_routes import auth
from routes.booking_routes import booking
from routes.admin_routes import admin
from routes.main_routes import main
from routes.update_halls import update_halls_bp
from utils.email_service import email

app.register_blueprint(auth)
app.register_blueprint(booking)
app.register_blueprint(admin)
app.register_blueprint(main)
app.register_blueprint(update_halls_bp)
app.register_blueprint(email)

@app.route("/export-excel")
def export_excel():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT
        FORMAT(bt.trn_date, 'yyyy-MM-dd') AS trn_date,
        c.conference_name,
        FORMAT(bt.start_time, 'HH:mm') AS start_time,
        FORMAT(bt.end_time, 'HH:mm') AS end_time,
        bt.purpose,
        bt.status
    FROM booking_transactions bt
    JOIN conference_master c
        ON bt.conference_id = c.conference_id
    """)

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    # ✅ NO strftime here
    data = [list(row) for row in rows]

    df = pd.DataFrame(data, columns=["Date","Hall","Start","End","Purpose","Status"])

    file_path = "Monthly_Report.xlsx"
    df.to_excel(file_path, index=False)

    return send_file(file_path, as_attachment=True)

@app.route("/export-pdf")
def export_pdf():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT
        FORMAT(bt.trn_date, 'yyyy-MM-dd') AS trn_date,
        c.conference_name,
        FORMAT(bt.start_time, 'HH:mm') AS start_time,
        FORMAT(bt.end_time, 'HH:mm') AS end_time,
        bt.purpose,
        bt.status
    FROM booking_transactions bt
    JOIN conference_master c
        ON bt.conference_id = c.conference_id
    """)

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer)

    table_data = [["Date", "Hall", "Start", "End", "Purpose", "Status"]]

    # ✅ NO strftime here
    for row in rows:
        table_data.append(list(row))

    table = Table(table_data)

    doc.build([table])

    buffer.seek(0)

    return send_file(buffer, as_attachment=True, download_name="Monthly_Report.pdf")

# Code for Today bookings Chart
@app.route("/chart/today-halls")
def today_halls():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT c.conference_name, COUNT(*) as total
        FROM booking_transactions bt
        JOIN conference_master c
            ON bt.conference_id = c.conference_id
        WHERE CAST(bt.trn_date AS DATE) = CAST(GETDATE() AS DATE)
        GROUP BY c.conference_name
    """)

    data = cursor.fetchall()
    conn.close()

    result = [{"hall": row[0], "count": row[1]} for row in data]

    return jsonify(result)

# Code for Montly bookings
@app.route("/chart/monthly-halls")
def monthly_halls():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT c.conference_name, COUNT(*) as total
        FROM booking_transactions bt
        JOIN conference_master c
            ON bt.conference_id = c.conference_id
        WHERE FORMAT(bt.trn_date, 'yyyy-MM') = FORMAT(GETDATE(), 'yyyy-MM')
        GROUP BY c.conference_name
    """)

    rows = cursor.fetchall()
    conn.close()

    result = [{"hall": r[0], "count": r[1]} for r in rows]

    return jsonify(result)
# Code for Department wise chart usage
@app.route("/chart/departments")
def department_usage():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT department, COUNT(*)
        FROM booking_transactions
        GROUP BY department
    """)

    rows = cursor.fetchall()
    conn.close()

    result = [{"dept": r[0], "count": r[1]} for r in rows]

    return jsonify(result)



if __name__ == "__main__":
    serve(app, host="0.0.0.0", port=5000)

# Application is created by AADI SAI NEEKSHAY(IT Intern) if any software wants to be created or maintained contact:aadisaineekshay@gmail.com
