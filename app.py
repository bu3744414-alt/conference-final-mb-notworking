import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import io
from flask import Flask, render_template, request, redirect, session, jsonify, send_file
from database.db import get_connection
from reportlab.platypus import SimpleDocTemplate, Table
import pandas as pd

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




# download options for the montly bookings in pdf and excel code for that 
@app.route("/export-excel")
def export_excel():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT trn_date, conference_id, start_time, end_time, purpose, status
        FROM booking_transactions
    """)

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    

    # 🔥 FIX: Convert properly
    data = [list(row) for row in rows]

    df = pd.DataFrame(data, columns=["Date","Hall","Start","End","Purpose","Status"])

    file_path = "report.xlsx"
    df.to_excel(file_path, index=False)

    return send_file(file_path, as_attachment=True)





@app.route("/export-pdf")
def export_pdf():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT trn_date, conference_id, start_time, end_time, purpose, status
        FROM booking_transactions
    """)

    data = cursor.fetchall()

    cursor.close()
    conn.close()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer)

    table_data = [["Date", "Hall", "Start", "End", "Purpose", "Status"]]

    for row in data:
        table_data.append(list(row))

    table = Table(table_data)

    doc.build([table])

    buffer.seek(0)

    return send_file(buffer, as_attachment=True, download_name="report.pdf")











if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

# Application is created by AADI SAI NEEKSHAY(IT Intern) if any software wants to be created or maintained contact:aadisaineekshay@gmail.com