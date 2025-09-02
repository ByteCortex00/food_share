# app.py
from flask import Flask
from flask_cors import CORS
from extension import db  # import db here
import os
import stripe

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

    # Config
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///hunger_app.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'your-secret-key-change-this-in-production'
    
    # Stripe Configuration
    app.config['STRIPE_PUBLISHABLE_KEY'] = 'pk_test_51S2nofJ4lYpxKIhhOo1G3xMWLx6hqPT4Bcypp1GCjrm0m9Umb0TxvcZDWCr4W0L9cVzYJLRtxEASv6LwOyOlZfpl005OtT4yI6'
    app.config['STRIPE_SECRET_KEY'] = 'REVOKED_STRIPE_KEY'
    
    # Initialize Stripe
    stripe.api_key = app.config['STRIPE_SECRET_KEY']

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
    app = create_app()
    print("Starting Flask application...")
    print("Visit: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)