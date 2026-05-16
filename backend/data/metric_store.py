import sqlite3
import json
import time
import logging
from typing import List, Dict, Any

logger = logging.getLogger("MetricStore")

class MetricStore:
    """
    Persistent storage for metrics and incidents using SQLite.
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
                        data TEXT
                    )
                """)
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

    def save_incident(self, incident: Dict[str, Any]):
        try:
            now = time.time()
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO incidents (timestamp, rule_id, name, summary, data) VALUES (?, ?, ?, ?, ?)",
                    (now, incident["rule_id"], incident["name"], incident["summary"], json.dumps(incident))
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Error saving incident: {str(e)}")

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

    def get_recent_incidents(self, limit: int = 20) -> List[Dict[str, Any]]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT data FROM incidents ORDER BY timestamp DESC LIMIT ?",
                    (limit,)
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
                conn.commit()
                logger.info("Database reset successfully.")
        except Exception as e:
            logger.error(f"Failed to reset database: {str(e)}")

# Singleton instance
metric_store = MetricStore()
