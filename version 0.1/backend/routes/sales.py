from flask import Blueprint, request, jsonify
from models import db
from models import Product, Sale

sales_bp = Blueprint('sales_bp', __name__)

@sales_bp.route('/sales', methods=['POST'])
def add_sale():
    try:
        data = request.get_json()

        product_id = data.get('product_id')
        quantity = data.get('quantity')

        # Validate input
        if not product_id or not quantity:
            return jsonify({"error": "Missing product_id or quantity"}), 400

        product = Product.query.get(product_id)

        if not product:
            return jsonify({"error": "Product not found"}), 404

        # Check stock
        if product.quantity < quantity:
            return jsonify({"error": "Not enough stock"}), 400

        # Create sale
        sale = Sale(
            product_id=product_id,
            quantity=quantity
        )

        # Reduce stock
        product.quantity -= quantity

        db.session.add(sale)
        db.session.commit()

        return jsonify({"message": "Sale added successfully"}), 201

    except Exception as e:
        print("SALE ERROR:", str(e))
        return jsonify({"error": "Internal Server Error"}), 500