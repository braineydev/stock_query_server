"""Minimal Flask app to test if basic routing works."""

from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


@app.route("/api/auth/login", methods=["POST"])
def login():
    return jsonify({"message": "Hello from minimal Flask!"}), 200


@app.route("/test", methods=["GET"])
def test():
    return jsonify({"status": "working"}), 200


if __name__ == "__main__":
    print("Starting minimal Flask app...")
    app.run(debug=True, host="0.0.0.0", port=5001)
