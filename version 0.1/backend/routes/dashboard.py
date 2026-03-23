from flask import Blueprint, jsonify
from sqlalchemy import func
from models import db
from models import Product, Sale

dashboard_bp = Blueprint('dashboard_bp', __name__)

@dashboard_bp.route('/dashboard/stats', methods=['GET'])
def get_stats():
    total_products = db.session.query(func.count(Product.id)).scalar()

    total_sales = db.session.query(
        func.coalesce(func.sum(Sale.quantity), 0)
    ).scalar()

    total_revenue = db.session.query(
        func.coalesce(func.sum(Sale.quantity * Product.price), 0)
    ).join(Product, Product.id == Sale.product_id).scalar()

    low_stock = db.session.query(func.count(Product.id)).filter(Product.quantity < 5).scalar()

    return jsonify({
        "total_products": total_products,
        "total_sales": int(total_sales),
        "total_revenue": float(total_revenue),
        "low_stock": low_stock
    })