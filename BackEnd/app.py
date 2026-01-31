"""
SmartBin Backend - Flask application entry point.
Run with: python app.py  OR  flask run (from BackEnd directory)
"""
from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
