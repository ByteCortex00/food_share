from extension import db
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # donor or receiver
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    donations = db.relationship("Donation", backref="donor", lazy=True)
    claims = db.relationship("Claim", backref="receiver", lazy=True)
    payments = db.relationship("Payment", backref="donor", lazy=True)


class Donation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    donor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    item_name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.String(50))
    expiry_date = db.Column(db.Date)
    location = db.Column(db.String(255))
    status = db.Column(db.String(20), default="available")  # available/claimed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    claims = db.relationship("Claim", backref="donation", lazy=True)


class Claim(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    donation_id = db.Column(db.Integer, db.ForeignKey("donation.id"), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    claim_time = db.Column(db.DateTime, default=datetime.utcnow)


class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    donor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)  # Amount in dollars
    stripe_payment_intent_id = db.Column(db.String(255), unique=True, nullable=False)
    status = db.Column(db.String(20), default="pending")  # pending, succeeded, failed, cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)