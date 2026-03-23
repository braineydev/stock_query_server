from flask import Blueprint, request, jsonify
from models import db, Product, Sale
from utils import token_required, admin_required
from sqlalchemy import func
from mail_service import send_low_stock_email

product_bp = Blueprint('products', __name__)

@product_bp.route('products/ongeza', methods=['POST'])
@token_required
@admin_required
def add_product(current_user):
    data = request.get_json()

    product = Product(
        name=data['name'],
        price=data['price'],
        quantity=data['quantity'],
        threshold_quantity=data.get('threshold_quantity',5)
    )

    db.session.add(product)
    db.session.commit()

    if product.quantity <= product.threshold_quantity:
        send_low_stock_email(product.name, product.quantity)

    return jsonify({'message':'Product added'})


@product_bp.route('/products', methods=['GET'])
@token_required
def get_products(current_user):
    products = Product.query.all()

    result = []
    alerts = []

    for p in products:
        low = p.quantity <= p.threshold_quantity

        if low:
            alerts.append(f"{p.name} low stock ({p.quantity})")

        result.append({
            'id': p.id,
            'name': p.name,
            'price': p.price,
            'quantity': p.quantity,
            'low_stock': low
        })

    return jsonify({'products': result, 'alerts': alerts})


@product_bp.route('/products/most_sold', methods=['GET'])
def most_sold_products():
    from sqlalchemy import func

    results = (
        db.session.query(
            Product.name,
            func.coalesce(func.sum(Sale.quantity), 0).label('total')
        )
        .outerjoin(Sale, Product.id == Sale.product_id)
        .group_by(Product.name)
        .all()
    )

    data = [{"name": r.name, "total": int(r.total)} for r in results]

    return jsonify(data)