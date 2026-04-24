from flask import Blueprint, request, jsonify, session, render_template, redirect
from database.db import get_connection
from datetime import datetime, date
from utils.email_service import send_email, build_email_template


COMMON_EMAIL = "conference.room@vslp.in"

booking = Blueprint("booking", __name__)

@booking.route('/availability')
def availability():
    hall = request.args.get('hall')
    date_val = request.args.get('date')

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT 
    CASE 
        WHEN ISNULL(reassign_flag,0)=1 THEN re_conference_id
        ELSE conference_id
    END AS hall,

    CASE 
        WHEN ISNULL(rescheduled,0)=1 THEN rescheduled_date
        ELSE trn_date
    END AS booking_date,

    CASE 
        WHEN ISNULL(rescheduled,0)=1 THEN re_start_time
        ELSE start_time
    END AS start_time,

    CASE 
        WHEN ISNULL(rescheduled,0)=1 THEN re_end_time
        ELSE end_time
    END AS end_time,

    department,
    empname

    FROM booking_transactions

    WHERE 
    (
        (ISNULL(reassign_flag,0)=0 AND conference_id = ?)
        OR
        (ISNULL(reassign_flag,0)=1 AND re_conference_id = ?)
    )

    AND CAST(
        CASE 
            WHEN ISNULL(rescheduled,0)=1 THEN rescheduled_date 
            ELSE trn_date 
        END AS DATE
    ) = CAST(? AS DATE)

    AND (
    status = 'Booked'
    OR ISNULL(rescheduled,0) = 1
    )

    ORDER BY start_time
    """, (hall, hall, date_val))

    rows = cursor.fetchall()
    conn.close()
    
    data = []

    for r in rows:
        start = datetime.strptime(str(r[2])[:8], "%H:%M:%S").strftime("%I:%M %p")
        end = datetime.strptime(str(r[3])[:8], "%H:%M:%S").strftime("%I:%M %p")

        dept = r[4]
        user = r[5]

        data.append([start, end, dept, user])

    return jsonify(data)
#--------Checking-------------

# ---------------- BOOK ----------------
@booking.route('/book', methods=['POST'])
def book():

    if not session.get('user'):
        return jsonify(status="error", message="Login expired")

    hall = request.form['hall']
    meeting_date = request.form['date']
    start = request.form['start_time']
    end = request.form['end_time']
    # 🔒 ADD HERE
    if hall == '201' and session.get('role') != 'admin':
        return jsonify(status="error", message="Only admin can book Auditorium")
    department = request.form.get('department')
    purpose = request.form.get('purpose')

    # Admin / user department logic
    if session.get('role') == 'admin' and department:
        dept_to_book = department
    else:
        dept_to_book = session['dept']

    conn = get_connection()
    cursor = conn.cursor()

    # 🔍 CONFLICT CHECK
    cursor.execute("""
    SELECT start_time, end_time, department, empname
    FROM booking_transactions
    WHERE 
    (
        (ISNULL(reassign_flag,0)=0 AND conference_id = ?)
        OR
        (ISNULL(reassign_flag,0)=1 AND re_conference_id = ?)
    )
    AND CAST(trn_date AS DATE) = CAST(? AS DATE)
    AND status='Booked'
    AND (? < end_time AND ? > start_time)
    """, (hall, hall, meeting_date, start, end))

    # ⏱ VALIDATIONS
    if end <= start:
        conn.close()
        return jsonify(status="error", message="End time must be after start time")

    if start < "09:00" or end > "20:00":
        conn.close()
        return jsonify(status="error", message="Booking allowed only between 9 AM and 8 PM")

    conflict = cursor.fetchone()

    if conflict:
        s, e, d, u = conflict

        s = datetime.strptime(str(s)[:8], "%H:%M:%S").strftime("%I:%M %p")
        e = datetime.strptime(str(e)[:8], "%H:%M:%S").strftime("%I:%M %p")

        conn.close()
        return jsonify(
            status="error",
            message=f"Hall already booked by {d} ({u}) from {s} to {e}"
        )

    # 🔥 INSERT BOOKING
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    cursor.execute("""
    INSERT INTO booking_transactions
    (empno, empname, conference_id, department, trn_date,
     start_time, end_time, booked_on, purpose, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        session['empno'],
        session['user'],
        hall,
        dept_to_book,
        meeting_date,
        start,
        end,
        now,
        purpose,
        "Booked"
    ))

    # 🔥 GET USER EMAIL BEFORE CLOSING CONNECTION
    cursor.execute("""
    SELECT email FROM login_mas WHERE employee_id=?
    """, (session['empno'],))

    email_row = cursor.fetchone()
    user_email = email_row[0] if email_row and email_row[0] else None

    # 🔥 GET HALL NAME
    cursor.execute("""
SELECT conference_name 
FROM conference_master 
WHERE conference_id = ?
""", (hall,))

    hall_row = cursor.fetchone()
    hall_name = hall_row[0] if hall_row else hall

    conn.commit()
    conn.close()

    # 🔥 SEND EMAIL
    # 🔥 ALWAYS CREATE BODY
    body = build_email_template(
    "Booking Created",
    session['user'],
    hall_name,
    meeting_date,
    start,
    end,
    purpose
    )

# send to user
    recipients = []

    if user_email:
        recipients.append(user_email)

    recipients.append(COMMON_EMAIL)
    
    send_email(recipients, "Booking Successful", body)

    return jsonify(status="success", message="Booking Successful")




#-------HALL STATS

@booking.route("/hall_stats")
def hall_stats():

    conn = get_connection()
    cursor = conn.cursor()# --- GET HALL IDS ---
    cursor.execute("""
    SELECT conference_id
    FROM conference_master
    WHERE status='A'
    """)

    halls = [row[0] for row in cursor.fetchall()]


# --- GET BOOKING COUNTS ---
    cursor.execute("""
    SELECT conference_id, COUNT(*)
    FROM booking_transactions
    GROUP BY conference_id
    """)

    counts = dict(cursor.fetchall())

    conn.close()

    data = {hall: counts.get(hall, 0) for hall in halls}
    return jsonify(data)


#---Reschduled API Backend program
@booking.route('/reschedule/<int:booking_id>', methods=['POST'])
def reschedule(booking_id):

    # 🔐 Session check
    if not session.get('user'):
        return jsonify(status="error", message="Login expired")

    # 📥 Get form data
    new_date = request.form.get('date')
    new_start = request.form.get('start_time')
    new_end = request.form.get('end_time')
    reason = request.form.get('reason')

    if not new_date or not new_start or not new_end:
        return jsonify(status="error", message="Missing required fields")

    # ⏱️ Convert time safely
    try:
        start = datetime.strptime(new_start, "%H:%M")
        end = datetime.strptime(new_end, "%H:%M")
    except:
        return jsonify(status="error", message="Invalid time format")

    # ❌ Validation
    if end <= start:
        return jsonify(status="error", message="End time must be after start time")

    if start.hour < 9 or end.hour > 20 or (end.hour == 20 and end.minute > 0):
        return jsonify(status="error", message="Booking allowed only between 9 AM and 8 PM")

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # 🔍 Get booking + hall + emp
        cursor.execute("""
            SELECT t.conference_id, m.conference_name, t.empno
            FROM booking_transactions t
            JOIN conference_master m 
                ON t.conference_id = m.conference_id
            WHERE t.booking_id=?
        """, (booking_id,))

        row = cursor.fetchone()

        if not row:
            conn.close()
            return jsonify(status="error", message="Booking not found")

        conference_id, hall_name, empno = row

        # 🚫 OPTIONAL: Check clash (recommended)
        cursor.execute("""
            SELECT COUNT(*) FROM booking_transactions
            WHERE conference_id=?
            AND (
                (start_time < ? AND end_time > ?)
                OR
                (rescheduled=1 AND re_start_time < ? AND re_end_time > ?)
            )
            AND (
                trn_date=? OR rescheduled_date=?
            )
            AND booking_id != ?
            AND status='Booked'
        """, (conference_id, new_end, new_start, new_end, new_start,
              new_date, new_date, booking_id))

        clash = cursor.fetchone()[0]

        if clash > 0:
            conn.close()
            return jsonify(status="error", message="Time slot already booked")

        # 🔄 Update booking
        cursor.execute("""
            UPDATE booking_transactions
            SET
                rescheduled_date=?,
                re_start_time=?,
                re_end_time=?,
                resch_reason=?,
                rescheduled=1,
                status='Rescheduled'
            WHERE booking_id=?
        """, (new_date, new_start, new_end, reason, booking_id))

        # 📧 Get email
        cursor.execute("""
            SELECT email FROM login_mas WHERE employee_id=?
        """, (empno,))

        email_row = cursor.fetchone()
        user_email = email_row[0] if email_row and email_row[0] else None

        conn.commit()

    except Exception as e:
        conn.rollback()
        return jsonify(status="error", message=str(e))

    finally:
        conn.close()

    # 📩 Email
    body = build_email_template(
        "Booking Rescheduled",
        session['user'],
        hall_name,
        new_date,
        new_start,
        new_end,
        reason
    )

    recipients = []

    if user_email:
        recipients.append(user_email)

    recipients.append(COMMON_EMAIL)

    send_email(recipients, "Booking Rescheduled", body)

    return jsonify(status="success", message="Booking rescheduled successfully")



# ---------------- REASSIGN HALL ----------------
@booking.route('/reassign', methods=['POST'])
def reassign():

    if not session.get('user') or session.get('role') != 'admin':
        return jsonify(status="error", message="Unauthorized")

    try:
        data = request.json

        booking_id = data["booking_id"]
        new_hall = data["hall_id"]
        new_date = data["date"]
        new_start = data["start"]
        new_end = data["end"]
        reason = data.get("reason", "")

        from datetime import datetime

        # ✅ Convert time (handles "09:00" or "09:00:00")
        new_start_time = datetime.strptime(new_start[:5], "%H:%M").time()
        new_end_time = datetime.strptime(new_end[:5], "%H:%M").time()

        # ✅ Convert date
        new_date_obj = datetime.strptime(new_date, "%Y-%m-%d")

        # ✅ Strings for SQL (ODBC safe)
        new_start_str = new_start[:5]
        new_end_str = new_end[:5]

        # ✅ VALIDATIONS
        if new_end_time <= new_start_time:
            return jsonify(status="error", message="End time must be after start time")

        if new_start_time < datetime.strptime("09:00", "%H:%M").time() or \
           new_end_time > datetime.strptime("20:00", "%H:%M").time():
            return jsonify(status="error", message="Booking allowed only between 9 AM and 8 PM")

        conn = get_connection()
        cursor = conn.cursor()

        # 🔥 GET OLD HALL + USER
        cursor.execute("""
            SELECT m.conference_name, t.empno
            FROM booking_transactions t
            JOIN conference_master m ON t.conference_id = m.conference_id
            WHERE t.booking_id=?
        """, (booking_id,))

        row = cursor.fetchone()

        if not row:
            conn.close()
            return jsonify(status="error", message="Booking not found")

        old_hall = row[0]
        empno = row[1]

        # 🔥 CONFLICT CHECK
        cursor.execute("""
            SELECT start_time, end_time, department, empname
            FROM booking_transactions
            WHERE 
                (
                    (ISNULL(reassign_flag,0)=0 AND conference_id = ?)
                    OR
                    (ISNULL(reassign_flag,0)=1 AND re_conference_id = ?)
                )
            AND CAST(trn_date AS DATE) = CAST(? AS DATE)
            AND status = 'Booked'
            AND booking_id != ?
            AND (CAST(? AS TIME) < end_time AND CAST(? AS TIME) > start_time)
        """, (new_hall, new_hall, new_date_obj, booking_id, new_start_str, new_end_str))

        conflict = cursor.fetchone()

        if conflict:
            s, e, d, u = conflict

            s = datetime.strptime(str(s)[:8], "%H:%M:%S").strftime("%I:%M %p")
            e = datetime.strptime(str(e)[:8], "%H:%M:%S").strftime("%I:%M %p")

            conn.close()

            return jsonify(
                status="error",
                message=f"Hall already booked by {d} ({u}) from {s} to {e}"
            )

        # 🔥 UPDATE BOOKING
        cursor.execute("""
            UPDATE booking_transactions
            SET
                reassign_flag = 1,
                status = 'Reassigned',
                re_conference_id = ?,
                reassign_reason = ?,
                admin_id = ?,
                admin_name = ?,
                reassigned_on = GETDATE()
            WHERE booking_id = ?
        """, (
            new_hall,
            reason,
            session['empno'],
            session['user'],
            booking_id
        ))

        # 🔥 GET NEW HALL NAME
        cursor.execute("""
            SELECT conference_name 
            FROM conference_master 
            WHERE conference_id = ?
        """, (new_hall,))

        hall_row = cursor.fetchone()
        new_hall_name = hall_row[0] if hall_row else new_hall

        # 🔥 GET USER EMAIL
        cursor.execute("""
            SELECT email 
            FROM login_mas 
            WHERE employee_id=?
        """, (empno,))

        email_row = cursor.fetchone()
        user_email = email_row[0] if email_row and email_row[0] else None

        conn.commit()
        conn.close()

        # 🔥 EMAIL BODY
        body = f"""
        <h2>Hall Reassigned</h2>

        <p><b>User:</b> {session['user']}</p>
        <p><b>Old Hall:</b> {old_hall}</p>
        <p><b>New Hall:</b> {new_hall_name}</p>
        <p><b>Date:</b> {new_date}</p>
        <p><b>Time:</b> {new_start} - {new_end}</p>
        <p><b>Reason:</b> {reason if reason else "N/A"}</p>
        """

        # 🔥 SEND EMAIL (safe)
        recipients = []

        if user_email:
            recipients.append(user_email)

        recipients.append(COMMON_EMAIL)

        try:
            send_email(recipients, "Booking Reassigned", body)
        except Exception as e:
            print("EMAIL ERROR:", e)

        return jsonify(status="success", message="Hall Reassigned successfully")

    except Exception as e:
        print("REASSIGN ERROR:", e)
        return jsonify(status="error", message=str(e)), 500    

#Shows all bookings for only the logged in users 
@booking.route("/my_bookings")
def my_bookings():

    if not session.get("user"):
        return jsonify([])

    selected_date = request.args.get("date")
    if not selected_date:
        selected_date = str(date.today())

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
    t.booking_id,

    m.conference_name,        -- ✅ OLD hall name
    m2.conference_name,       -- ✅ NEW hall name

    CASE 
        WHEN ISNULL(t.rescheduled,0)=1 THEN t.rescheduled_date
        ELSE t.trn_date
    END,

    CASE 
        WHEN ISNULL(t.rescheduled,0)=1 THEN t.re_start_time
        ELSE t.start_time
    END,

    CASE 
        WHEN ISNULL(t.rescheduled,0)=1 THEN t.re_end_time
        ELSE t.end_time
    END,

    CASE 
    WHEN t.status = 'Cancelled' THEN 'Cancelled'
    WHEN ISNULL(t.reassign_flag,0)=1 THEN 'Reassigned'
    WHEN ISNULL(t.rescheduled,0)=1 THEN 'Rescheduled'
    ELSE t.status
    END,

    t.purpose,
    t.admin_remarks,
    ISNULL(t.department, l.department),   -- ✅ Fix for the booked by dep
    t.admin_name,
    t.reassign_reason,   -- ✅ ADDED THIS

    ISNULL(t.rescheduled,0),
    ISNULL(t.reassign_flag,0)

FROM booking_transactions t
JOIN login_mas l
ON t.empno = l.employee_id
                   
JOIN conference_master m
ON t.conference_id = m.conference_id

LEFT JOIN conference_master m2
ON t.re_conference_id = m2.conference_id

WHERE (t.empno=? OR t.empname=?)

AND CAST(
    CASE 
        WHEN ISNULL(t.rescheduled,0)=1 THEN t.rescheduled_date
        ELSE t.trn_date
    END AS DATE
) = CAST(? AS DATE)

ORDER BY start_time
    """, (session["empno"], session["user"], selected_date))

    rows = cursor.fetchall()
    conn.close()

    bookings = []

    for r in rows:
        bookings.append({
        "id": r[0],
        "old_hall": r[1],
        "new_hall": r[2],   
        "date": str(r[3]),
        "start": str(r[4])[:5],
        "end": str(r[5])[:5],
        "status": r[6],
        "purpose": r[7],
        "admin_remarks": r[8],   # ✅ FIXED
        "department": r[9],      # ✅ FIXED
        "admin_name": r[10],
        "reassign_reason": r[11],
        "rescheduled": r[12],
        "reassign": r[13]
    })

    return jsonify(bookings)

#shows the all bookings for the ADMIN at the All department bookings 
@booking.route("/all_bookings")
def all_bookings():

    if not session.get("user") or session.get("role") != "admin":
        return jsonify([])

    selected_date = request.args.get("date")
    if not selected_date:
        selected_date = str(date.today())

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
    t.booking_id,

    m.conference_name AS old_hall,
    m2.conference_name AS new_hall,

    t.department,
    l.department AS user_department,
    l.role,

    -- date
    CASE 
        WHEN ISNULL(t.rescheduled,0)=1 THEN t.rescheduled_date
        ELSE t.trn_date
    END AS booking_date,

    -- start
    CASE 
        WHEN ISNULL(t.rescheduled,0)=1 THEN t.re_start_time
        ELSE t.start_time
    END AS start_time,

    -- end
    CASE 
        WHEN ISNULL(t.rescheduled,0)=1 THEN t.re_end_time
        ELSE t.end_time
    END AS end_time,

    t.empname,

    -- ✅ FINAL STATUS (ONLY ONCE)
    CASE 
        WHEN t.status = 'Cancelled' THEN 'Cancelled'
        WHEN ISNULL(t.reassign_flag,0)=1 THEN 'Reassigned'
        WHEN ISNULL(t.rescheduled,0)=1 THEN 'Rescheduled'
        ELSE t.status
    END AS status,

    -- ✅ DIRECT DATA (NO CASE HERE)
    t.purpose,
    t.admin_remarks,
    t.resch_reason,
    t.reassign_reason,

    t.admin_name,

    ISNULL(t.rescheduled,0) AS rescheduled,
    ISNULL(t.reassign_flag,0) AS reassign

FROM booking_transactions t

JOIN conference_master m
ON t.conference_id = m.conference_id

LEFT JOIN conference_master m2
ON t.re_conference_id = m2.conference_id

JOIN login_mas l
ON t.empno = l.employee_id

WHERE CAST(
    CASE 
        WHEN ISNULL(t.rescheduled,0)=1 THEN t.rescheduled_date
        ELSE t.trn_date
    END AS DATE
) = CAST(? AS DATE)

ORDER BY start_time
    """, (selected_date,))

    rows = cursor.fetchall()
    conn.close()

    data = []

    for r in rows:
        data.append({
        "id": r[0],
        "old_hall": r[1],
        "new_hall": r[2],
        "department": r[3],
        "user_dept": r[4],
        "role": r[5],

        "date": str(r[6]),
        "start": str(r[7])[:5],
        "end": str(r[8])[:5],

        "user": r[9],
        "status": r[10],

        "purpose": r[11],
        "admin_remarks": r[12],
        "resch_reason": r[13],
        "reassign_reason": r[14],

        "admin_name": r[15],
        "rescheduled": r[16],
        "reassign": r[17]
    })

    return jsonify(data)

@booking.route('/monthly_bookings')
def monthly_bookings():

    if not session.get('user'):
        return jsonify([])

    month = request.args.get("month")   # example: 2026-03

    conn = get_connection()
    cur = conn.cursor()

    
    cur.execute("""
    SELECT 
    bt.TRN_DATE,

    CASE 
        WHEN ISNULL(bt.reassign_flag,0)=1 
            THEN cm1.conference_name + ' -> ' + cm2.conference_name
        ELSE cm1.conference_name
    END AS hall,

    bt.start_time,
    bt.end_time,
    bt.purpose,

    CASE 
        WHEN bt.status = 'Cancelled' THEN 'Cancelled'
        WHEN ISNULL(bt.rescheduled,0)=1 THEN 'Rescheduled'
        WHEN ISNULL(bt.reassign_flag,0)=1 THEN 'Reassigned'
        WHEN bt.status = 'Booked' THEN 'Booked'
        ELSE bt.status
    END AS status

    FROM booking_transactions bt

    JOIN conference_master cm1
        ON bt.conference_id = cm1.conference_id

    LEFT JOIN conference_master cm2
        ON bt.re_conference_id = cm2.conference_id

    WHERE bt.empno = ?
    AND bt.TRN_DATE LIKE ?

    ORDER BY 
        bt.TRN_DATE ASC,
        bt.conference_id ASC,
        bt.start_time ASC
    """, (session['empno'], month + "%"))

    rows = cur.fetchall()

    conn.close()

    data = []

    for r in rows:
        data.append({
            "trn_date": str(r[0]),
            "hall": r[1],
            "start_time": str(r[2]),
            "end_time": str(r[3]),
            "purpose": r[4],
            "status": r[5]
        })

    return jsonify(data)
