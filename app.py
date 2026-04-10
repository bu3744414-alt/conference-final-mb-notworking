import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, render_template, request, redirect, session, jsonify, send_file


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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

# Application is created by AADI SAI NEEKSHAY(IT Intern) if any software wants to be created or maintained contact:aadisaineekshay@gmail.com