from flask_mail import Message

def send_low_stock_email(mail, product_name, quantity):
    msg = Message(
        subject='Low Stock Alert',
        sender='your_email@gmail.com',
        recipients=['admin@email.com']
    )
    msg.body = f'Product "{product_name}" is low in stock. Remaining: {quantity}'
    mail.send(msg)