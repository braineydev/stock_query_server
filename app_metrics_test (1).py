#======================================================================
#Name:Lewis Thegetha
#REG NO: BSCCS/2025/69379
#ROLE: Algorithm specialist (Theme C2)
#TASK: Rollling Metrics Implementation (Heaps/Deques)
#======================================================================
from flask import Flask, request, jsonify
from metrics import StockMetrics
app = Flask(__name__)
tracker = StockMetrics(window_size=3)
@app.route('/add_price', methods=['POST'])
def add_price():
    data = request.get_json()
    price = data.get('price')
    if price is not None:
        avg = tracker.add_price(float(price))
        return jsonify({
            "status": "success",
            "average": round(avg, 2),
            "max": tracker.get_max(),
            "min": tracker.get_min()
        })
    return jsonify({"error": "No price provided"}), 400
if __name__ == "__main__":
    app.run(debug=True, port=5000)