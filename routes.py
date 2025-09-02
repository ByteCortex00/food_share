from flask import Blueprint, request, jsonify, render_template, current_app
from extension import db
from models import User, Donation, Claim, Payment
from datetime import datetime
import stripe

main = Blueprint("main", __name__)

# ----------------------
# PAGE ROUTES (NEW)
# ----------------------

@main.route("/")
def index():
    """Serve the main application page"""
    return render_template("index.html")

# ----------------------
# USER ROUTES
# ----------------------

# Register User
@main.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    # check if email already exists
    existing_user = User.query.filter_by(email=data['email']).first()
    if existing_user:
        return jsonify({"error": "Email already registered"}), 400

    # otherwise, create new user
    new_user = User(
        name=data['name'],
        email=data['email'],
        password=data['password'],  # later we'll hash this
        role=data['role']
    )
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201


# User Login
@main.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data["email"], password=data["password"]).first()
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    return jsonify({
        "message": "Login successful",
        "user_id": user.id,
        "role": user.role
    }), 200


# Get User Profile
@main.route("/users/<int:user_id>", methods=["GET"])
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "created_at": str(user.created_at)
    }), 200


# ----------------------
# DONATION ROUTES
# ----------------------

# Create Donation
@main.route("/donations", methods=["POST"])
def create_donation():
    data = request.get_json()
    donation = Donation(
        donor_id=data["donor_id"],
        item_name=data["item_name"],
        quantity=data.get("quantity"),
        expiry_date=datetime.strptime(data["expiry_date"], "%Y-%m-%d").date() if data.get("expiry_date") else None,
        location=data.get("location"),
    )
    db.session.add(donation)
    db.session.commit()
    return jsonify({"message": "Donation created"}), 201


# Get Available Donations
@main.route("/donations", methods=["GET"])
def get_donations():
    donations = Donation.query.filter_by(status="available").all()
    results = []
    for d in donations:
        results.append({
            "id": d.id,
            "item_name": d.item_name,
            "quantity": d.quantity,
            "expiry_date": str(d.expiry_date) if d.expiry_date else None,
            "location": d.location,
            "donor_id": d.donor_id
        })
    return jsonify(results), 200


# Get Donations by Donor
@main.route("/users/<int:user_id>/donations", methods=["GET"])
def get_user_donations(user_id):
    donations = Donation.query.filter_by(donor_id=user_id).all()
    results = []
    for d in donations:
        results.append({
            "id": d.id,
            "item_name": d.item_name,
            "status": d.status,
            "created_at": str(d.created_at)
        })
    return jsonify(results), 200


# Claim a Donation
@main.route("/donations/<int:donation_id>/claim", methods=["POST"])
def claim_donation(donation_id):
    data = request.get_json()
    donation = Donation.query.get_or_404(donation_id)

    if donation.status == "claimed":
        return jsonify({"error": "Donation already claimed"}), 400

    claim = Claim(
        donation_id=donation.id,
        receiver_id=data["receiver_id"]
    )
    donation.status = "claimed"
    db.session.add(claim)
    db.session.commit()

    return jsonify({"message": "Donation claimed successfully"}), 200


# ----------------------
# CLAIM ROUTES
# ----------------------

# Get Claims by Receiver
@main.route("/users/<int:user_id>/claims", methods=["GET"])
def get_user_claims(user_id):
    claims = Claim.query.filter_by(receiver_id=user_id).all()
    results = []
    for c in claims:
        results.append({
            "id": c.id,
            "donation_id": c.donation_id,
            "claim_time": str(c.claim_time)
        })
    return jsonify(results), 200


# ----------------------
# PAYMENT ROUTES
# ----------------------

# Get Stripe Publishable Key
@main.route("/payments/config", methods=["GET"])
def get_stripe_config():
    return jsonify({
        "publishable_key": current_app.config["STRIPE_PUBLISHABLE_KEY"]
    }), 200


# Create Payment Intent
@main.route("/payments/create-payment-intent", methods=["POST"])
def create_payment_intent():
    try:
        data = request.get_json()
        amount = int(float(data["amount"]) * 100)  # Convert to cents
        donor_id = data["donor_id"]
        
        # Create payment intent
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency='usd',
            metadata={
                'donor_id': donor_id,
                'type': 'monetary_donation'
            }
        )
        
        # Save payment record
        payment = Payment(
            donor_id=donor_id,
            amount=data["amount"],
            stripe_payment_intent_id=intent.id,
            status="pending"
        )
        db.session.add(payment)
        db.session.commit()
        
        return jsonify({
            "client_secret": intent.client_secret,
            "payment_id": payment.id
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# Handle Payment Success
@main.route("/payments/success", methods=["POST"])
def payment_success():
    try:
        data = request.get_json()
        payment_intent_id = data["payment_intent_id"]
        
        # Update payment status in database
        payment = Payment.query.filter_by(stripe_payment_intent_id=payment_intent_id).first()
        if payment:
            payment.status = "succeeded"
            payment.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({"message": "Payment recorded successfully"}), 200
        else:
            return jsonify({"error": "Payment not found"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# Get User's Payment History
@main.route("/users/<int:user_id>/payments", methods=["GET"])
def get_user_payments(user_id):
    payments = Payment.query.filter_by(donor_id=user_id).order_by(Payment.created_at.desc()).all()
    results = []
    for p in payments:
        results.append({
            "id": p.id,
            "amount": p.amount,
            "status": p.status,
            "created_at": str(p.created_at)
        })
    return jsonify(results), 200


# Webhook endpoint for Stripe
@main.route("/payments/webhook", methods=["POST"])
def stripe_webhook():
    payload = request.data
    sig_header = request.headers.get("Stripe-Signature")
    
    try:
        # Verify the webhook signature (you'll need to set your webhook secret)
        # event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        
        # For now, just parse the event directly
        import json
        event = json.loads(payload)
        
        if event["type"] == "payment_intent.succeeded":
            payment_intent = event["data"]["object"]
            
            # Update payment status
            payment = Payment.query.filter_by(
                stripe_payment_intent_id=payment_intent["id"]
            ).first()
            
            if payment:
                payment.status = "succeeded"
                payment.updated_at = datetime.utcnow()
                db.session.commit()
                
        elif event["type"] == "payment_intent.payment_failed":
            payment_intent = event["data"]["object"]
            
            # Update payment status
            payment = Payment.query.filter_by(
                stripe_payment_intent_id=payment_intent["id"]
            ).first()
            
            if payment:
                payment.status = "failed"
                payment.updated_at = datetime.utcnow()
                db.session.commit()
        
        return jsonify({"status": "success"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400