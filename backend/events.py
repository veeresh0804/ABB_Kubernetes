"""
KubeMind AI - Event Schemas

This module defines the structured, typed events that are passed through the 
event bus. Using Pydantic models ensures data consistency and provides
automatic validation.
"""
import uuid
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import time

class BaseEvent(BaseModel):
    """
    Base model for all events with governance metadata.
    Enables tracing, priority routing, and loop prevention.
    """
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: float = Field(default_factory=time.time)
    source: str
    priority: int = 1 # 0: Critical, 1: Standard, 2: Low
    ttl: int = 5      # Max propagation depth to prevent infinite loops
    correlation_id: Optional[str] = None
    causal_chain_id: Optional[str] = None
    confidence: float = 1.0

class TelemetryMetricsEvent(BaseEvent):
    """Event carrying a fresh batch of metrics from the simulator or live drivers."""
    source: str = "telemetry_ingestor"
    metrics: List[Dict[str, Any]]
    namespace: str

class AnomalyEvent(BaseEvent):
    """Event representing a single detected anomaly."""
    source: str = "anomaly_detector"
    anomaly: Dict[str, Any]

class CorrelationEvent(BaseEvent):
    """Event representing a group of correlated anomalies forming an incident."""
    source: str = "correlation_engine"
    correlation: Dict[str, Any]
    causal_evidence: Optional[Dict[str, Any]] = None 
    
    # Phase 10: Governance & Reliability
    version: int = 1
    previous_version_id: Optional[str] = None
    reasoning_audit_trail: List[Dict[str, Any]] = [] # Trace of contributors
    conflict_detected: bool = False
    evidence_lineage: List[str] = [] # IDs of anomalies/insights used

class CognitiveFeedbackEvent(BaseEvent):
    """
    Priority 1: Adaptive Learning.
    Carries the ground truth outcome of a previous prediction or diagnostic.
    """
    source: str = "truth_observer"
    target_event_id: str
    outcome: str # "CONFIRMED", "FALSE_POSITIVE", "MISSED", "STABILIZED"
    accuracy_score: float # 0.0 to 1.0
    impacted_agents: List[str]

class AgentInsightEvent(BaseEvent):
    """Event carrying the diagnostic output from a single AI agent."""
    source: str = "agent_mesh"
    insight: Dict[str, Any]

class HealthScoreEvent(BaseEvent):
    """Event carrying the latest calculated cluster health score."""
    source: str = "health_monitor"
    health: Dict[str, Any]
    namespace: str

class StateUpdateEvent(BaseEvent):
    """
    A comprehensive event published by the State Engine, containing the complete,
    aggregated state ready to be sent to the frontend.
    """
    source: str = "state_engine"
    state_payload: Dict[str, Any]

class PredictionEvent(BaseEvent):
    """Event for predictive intelligence findings."""
    source: str = "predictive_layer"
    prediction: Dict[str, Any]

class ActionEvaluation(BaseModel):
    """Evaluation of a single potential operational action."""
    action: str
    target: str
    predicted_recovery_prob: float
    risk_score: float
    reasoning: str

class StrategyEvent(BaseEvent):
    """
    Phase 11: Autonomous Decision Intelligence.
    Carries a set of evaluated strategies for stabilizing an incident.
    """
    source: str = "decision_engine"
    correlation_id: str
    strategies: List[ActionEvaluation]
    recommended_strategy_index: int
