class Config:
    SECRET_KEY = 'your-secret-key'

    SQLALCHEMY_DATABASE_URI = 'postgresql://postgres:root@localhost:5432/final'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = ''
    MAIL_PASSWORD = ''
