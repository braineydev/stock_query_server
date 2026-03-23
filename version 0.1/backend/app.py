from flask import Flask
from config import Config
from models import db
from routes.auth import auth_bp
from routes.products import product_bp
from routes.sales import sales_bp
from flask_cors import CORS
from flask_mail import Mail
from routes.dashboard import dashboard_bp

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)
CORS(app)

mail = Mail(app)

from routes.auth import auth_bp
from routes.products import product_bp
from routes.sales import sales_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(product_bp, url_prefix='/api')
app.register_blueprint(sales_bp, url_prefix='/api')
app.register_blueprint(dashboard_bp, url_prefix='/api')

@app.before_request
def create_tables():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)