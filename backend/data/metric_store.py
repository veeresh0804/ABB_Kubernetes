import sqlite3
import json
import time
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("MetricStore")

class MetricStore:
    """
    Persistent storage for metrics and incidents using SQLite.
    Acts as a Hybrid Operational Memory for the intelligence fabric.
    """
    def __init__(self, db_path: str = "kubemind.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                # Table for raw metrics snapshots
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS metrics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp REAL,
                        tick INTEGER,
                        pod_id TEXT,
                        pod_name TEXT,
                        data TEXT
                    )
                """)
                # Table for anomalies
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS anomalies (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp REAL,
                        pod_id TEXT,
                        metric TEXT,
                        severity TEXT,
                        message TEXT
                    )
                """)
                # Table for incidents (correlations)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS incidents (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp REAL,
                        rule_id TEXT,
                        name TEXT,
                        summary TEXT,
                        namespace TEXT,
                        data TEXT
                    )
                """)
                
                # Table for anomaly fingerprints (semantic memory)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS fingerprints (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp REAL,
                        fingerprint_hash TEXT UNIQUE,
                        pod_id TEXT,
                        metric TEXT,
                        data TEXT
                    )
                """)
                # Table for remediation history
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS remediations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp REAL,
                        action TEXT,
                        target TEXT,
                        namespace TEXT,
                        status TEXT,
                        message TEXT
                    )
                """)

                # Migration: Add namespace column if it doesn't exist
                try:
                    cursor.execute("ALTER TABLE incidents ADD COLUMN namespace TEXT;")
                except sqlite3.OperationalError:
                    pass 
                
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to initialize database: {str(e)}")

    def save_metrics(self, tick: int, metrics: List[Dict[str, Any]]):
        try:
            now = time.time()
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                for m in metrics:
                    cursor.execute(
                        "INSERT INTO metrics (timestamp, tick, pod_id, pod_name, data) VALUES (?, ?, ?, ?, ?)",
                        (now, tick, m["pod_id"], m["pod_name"], json.dumps(m))
                    )
                conn.commit()
        except Exception as e:
            logger.error(f"Error saving metrics: {str(e)}")

    def save_anomalies(self, anomalies: List[Dict[str, Any]]):
        try:
            now = time.time()
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                for a in anomalies:
                    cursor.execute(
                        "INSERT INTO anomalies (timestamp, pod_id, metric, severity, message) VALUES (?, ?, ?, ?, ?)",
                        (now, a["pod_id"], a["metric"], a["severity"], a["message"])
                    )
                conn.commit()
        except Exception as e:
            logger.error(f"Error saving anomalies: {str(e)}")

    def save_incident(self, incident: Dict[str, Any], namespace: str):
        try:
            now = time.time()
            
            # --- Phase 12: Failure Fingerprinting ---
            # Create a unique topological fingerprint hash
            chain_str = "-".join(incident.get("causal_chain", []))
            f_hash = f"{incident.get('root_cause_pod')}:{incident.get('root_metric')}:{chain_str}"
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO incidents (timestamp, rule_id, name, summary, namespace, data) VALUES (?, ?, ?, ?, ?, ?)",
                    (now, incident["rule_id"], incident["name"], incident["summary"], namespace, json.dumps(incident))
                )
                # Also save to semantic memory (fingerprints table)
                cursor.execute(
                    "INSERT OR REPLACE INTO fingerprints (timestamp, fingerprint_hash, pod_id, metric, data) VALUES (?, ?, ?, ?, ?)",
                    (now, f_hash, incident.get("root_cause_pod"), incident.get("root_metric"), json.dumps(incident))
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Error saving incident with fingerprint: {str(e)}")

    def save_fingerprint(self, pod_id: str, metric: str, data: Dict[str, Any]):
        """Saves a unique anomaly pattern for future correlation."""
        try:
            now = time.time()
            f_hash = f"{pod_id}:{metric}" 
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT OR REPLACE INTO fingerprints (timestamp, fingerprint_hash, pod_id, metric, data) VALUES (?, ?, ?, ?, ?)",
                    (now, f_hash, pod_id, metric, json.dumps(data))
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Error saving fingerprint: {str(e)}")

    def find_similar_incidents(self, pod_id: str, metric: str) -> List[Dict[str, Any]]:
        """Retrieves past incidents with similar fingerprints."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT data FROM incidents WHERE data LIKE ? LIMIT 5",
                    (f"%{metric}%",)
                )
                return [json.loads(row["data"]) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Error finding similar incidents: {str(e)}")
            return []

    def save_remediation(self, action: str, target: str, namespace: str, status: str, message: str):
        """Records a stabilization action in the memory history."""
        try:
            now = time.time()
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO remediations (timestamp, action, target, namespace, status, message) VALUES (?, ?, ?, ?, ?, ?)",
                    (now, action, target, namespace, status, message)
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Error saving remediation: {str(e)}")

    def get_history(self, pod_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT data FROM metrics WHERE pod_id = ? ORDER BY timestamp DESC LIMIT ?",
                    (pod_id, limit)
                )
                return [json.loads(row["data"]) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Error fetching history: {str(e)}")
            return []

    def get_recent_incidents(self, limit: int = 20, namespace: str = "all") -> List[Dict[str, Any]]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                if namespace == "all":
                    cursor.execute(
                        "SELECT data FROM incidents ORDER BY timestamp DESC LIMIT ?",
                        (limit,)
                    )
                else:
                    cursor.execute(
                        "SELECT data FROM incidents WHERE namespace = ? ORDER BY timestamp DESC LIMIT ?",
                        (namespace, limit)
                    )
                return [json.loads(row["data"]) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Error fetching incidents: {str(e)}")
            return []

    def clear_all(self):
        """Resets the entire database for a clean demo state."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM metrics")
                cursor.execute("DELETE FROM anomalies")
                cursor.execute("DELETE FROM incidents")
                cursor.execute("DELETE FROM fingerprints")
                cursor.execute("DELETE FROM remediations")
                conn.commit()
                logger.info("Database reset successfully.")
        except Exception as e:
            logger.error(f"Failed to reset database: {str(e)}")

# Singleton instance
metric_store = MetricStore()
