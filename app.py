# app.py
from flask import Flask
from flask_cors import CORS
from extension import db  # import db here
import os
import stripe
from dotenv import load_dotenv  # Add this import

load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # Enable CORS for all routes
    CORS(app, resources={
        r"/api/*": {"origins": "*"},
        r"/login": {"origins": "*"},
        r"/register": {"origins": "*"},
        r"/donations/*": {"origins": "*"},
        r"/users/*": {"origins": "*"},
        r"/payments/*": {"origins": "*"}
    })

    # Config - USE ENVIRONMENT VARIABLES
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///hunger_app.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY') # Get from env
    
    # Stripe Configuration - USING ENVIRONMENT VARIABLES
    app.config['STRIPE_PUBLISHABLE_KEY'] = os.getenv('STRIPE_PUBLISHABLE_KEY')  # From environment
    app.config['STRIPE_SECRET_KEY'] = os.getenv('STRIPE_SECRET_KEY')  # From environment
    
    # Initialize Stripe with the secret key from environment
    stripe.api_key = os.getenv('STRIPE_SECRET_KEY')  # Use directly from env

    # Initialize extensions
    db.init_app(app)

    # Import routes
    from routes import main
    app.register_blueprint(main)

    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
        print("Database tables created successfully!")

    return app

if __name__ == "__main__":
    # Get the PORT environment variable from Render, default to 5000 for local dev
    port = int(os.environ.get("PORT", 5000))
    app = create_app()
    print("Starting Flask application...")
    print(f"Visit: http://localhost:{port}")
    app.run(debug=False, host='0.0.0.0', port=port) # Set debug=False for production!

app = create_app()

# This is the WSGI callable that Gunicorn will use
def wsgi_app(environ, start_response):
    return app(environ, start_response)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print("Starting Flask application...")
    print(f"Visit: http://localhost:{port}")
    app.run(debug=False, host='0.0.0.0', port=port)