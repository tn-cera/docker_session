import os

from flask import Flask, jsonify, render_template

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


# Health check (used by ECS / Cloud Run / load balancers)
@app.route("/health")
def health():
    return jsonify(status="ok")


if __name__ == "__main__":
    # Cloud Run and ECS provide PORT; default to 8080 for local use
    port = int(os.environ.get("PORT", 8088))
    app.run(host="0.0.0.0", port=port)
