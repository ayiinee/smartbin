from app.extensions import db
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='operator') # admin/operator

class SmartBin(db.Model):
    __tablename__ = 'smart_bins'
    id = db.Column(db.Integer, primary_key=True)
    location_name = db.Column(db.String(100), nullable=False) # Area penempatan [cite: 376]
    latitude = db.Column(db.Float, nullable=False)  # Untuk pemetaan GIS
    longitude = db.Column(db.Float, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    fill_level = db.Column(db.Integer, default=0)   # Persentase kepenuhan
    
    logs = db.relationship('WasteLog', backref='bin', lazy=True)

class WasteLog(db.Model):
    __tablename__ = 'waste_logs'
    id = db.Column(db.Integer, primary_key=True)
    bin_id = db.Column(db.Integer, db.ForeignKey('smart_bins.id'), nullable=False)
    category = db.Column(db.String(50), nullable=False) # Label final (Plastik, Kertas, dll) [cite: 170]
    confidence_score = db.Column(db.Float, nullable=False) # Hasil fusi 70% visual, 30% audio 
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Detail tambahan untuk audit sistem (opsional tapi disarankan)
    visual_conf = db.Column(db.Float)
    audio_conf = db.Column(db.Float)
    image_path = db.Column(db.String(255))

    carbon_metric = db.relationship('CarbonMetric', backref='log', uselist=False)

class CarbonMetric(db.Model):
    __tablename__ = 'carbon_metrics'
    id = db.Column(db.Integer, primary_key=True)
    log_id = db.Column(db.Integer, db.ForeignKey('waste_logs.id'), unique=True)
    co2_reduction_value = db.Column(db.Float, nullable=False) # Reduksi CO2e [cite: 34, 87]
    methane_reduction = db.Column(db.Float, nullable=False)   # Fokus utama mitigasi gas agresif [cite: 22, 33]

class AnomalyData(db.Model):
    __tablename__ = 'anomaly_data'
    id = db.Column(db.Integer, primary_key=True)
    waste_log_id = db.Column(db.Integer, db.ForeignKey('waste_logs.id')) # Relasi ke log asal
    image_path = db.Column(db.String(255), nullable=False) # Foto sampah dengan confidence rendah (<60%) [cite: 175]
    user_label = db.Column(db.String(50))   # Label yang diberikan admin secara manual [cite: 175]
    status_verified = db.Column(db.Boolean, default=False) # Apakah sudah divalidasi [cite: 26, 201]