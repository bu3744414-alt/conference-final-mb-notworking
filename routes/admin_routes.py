from flask import Blueprint, request, jsonify, session, send_file
from datetime import datetime, date
from database.db import get_connection
import pandas as pd
from utils.email_service import send_email, build_email_template

COMMON_EMAIL = "#priyanka.y@vslp.in"

admin = Blueprint("admin", __name__)


# ---------------- ADMIN CANCEL ----------------
@admin.route('/cancel/<int:booking_id>', methods=['POST'])
def cancel(booking_id):

    if session.get('role') != 'admin':
        return jsonify(status="error", message="Unauthorized")

    reason = request.form.get("reason")

    conn = get_connection()
    cursor = conn.cursor()

    # 🔥 GET BOOKING DETAILS
    cursor.execute("""
    SELECT 
        m.conference_name,
        t.trn_date,
        t.start_time,
        t.end_time,
        t.empno
    FROM booking_transactions t
    JOIN conference_master m ON t.conference_id = m.conference_id
    WHERE t.booking_id=?
    """, (booking_id,))

    row = cursor.fetchone()

    hall = row[0]
    date = row[1]
    start = str(row[2])[:5]
    end = str(row[3])[:5]
    empno = row[4]

    # 🔥 GET USER EMAIL
    cursor.execute("SELECT email FROM login_mas WHERE employee_id=?", (empno,))
    email_row = cursor.fetchone()
    user_email = email_row[0] if email_row and email_row[0] else None

    # 🔥 UPDATE STATUS
    cursor.execute("""
        UPDATE booking_transactions
        SET
            status='Cancelled',
            admin_id=?,
            admin_name=?,
            admin_status='Cancelled',
            admin_remarks=?
        WHERE booking_id=?
    """,(
        session['empno'],
        session['user'],
        reason,
        booking_id
    ))

    conn.commit()
    conn.close()

    # 🔥 SEND EMAIL
    body = build_email_template(
        "Booking Cancelled",
        session['user'],
        hall,
        date,
        start,
        end,
        reason   # ✅ FIXED
    )

    
    # 🔥 SEND EMAIL TO BOTH

    recipients = []

    if user_email:
        recipients.append(user_email)

    recipients.append(COMMON_EMAIL)

    send_email(recipients, "Booking Cancelled", body)

    return jsonify(status="success", message="Booking cancelled successfully")

