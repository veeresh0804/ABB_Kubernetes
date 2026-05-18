# backend/tests/test_causal_engine.py
import pytest
import asyncio
import time
from unittest.mock import AsyncMock, MagicMock
from collections import defaultdict

from engines.causal_engine import CausalEngine, _build_causal_chain
from knowledge_graph import knowledge_graph

@pytest.fixture
def mock_knowledge_graph(monkeypatch):
    mock_topology = {
        "nodes": [
            {"id": "frontend-service", "label": "frontend"},
            {"id": "auth-service", "label": "auth"},
            {"id": "postgres-db", "label": "postgres"},
            {"id": "redis-cache", "label": "redis"},
            {"id": "payment-service", "label": "payment"},
        ],
        "edges": [
            {"source": "frontend-service", "target": "auth-service", "type": "depends"},
            {"source": "auth-service", "target": "postgres-db", "type": "depends"},
            {"source": "auth-service", "target": "redis-cache", "type": "depends"}, # Multi-target
            {"source": "payment-service", "target": "postgres-db", "type": "depends"},
            {"source": "payment-service", "target": "redis-cache", "type": "depends"}, # Multi-target
        ]
    }
    async_mock = AsyncMock(return_value=mock_topology)
    monkeypatch.setattr(knowledge_graph, 'get_topology', async_mock)

@pytest.fixture
def causal_engine_instance():
    engine = CausalEngine()
    engine.EVIDENCE_DECAY_SEC = 3600 # Set a long decay for testing
    return engine

@pytest.mark.asyncio
async def test_infer_root_cause_single_anomaly(causal_engine_instance, mock_knowledge_graph):
    anomalies = [
        {"pod_id": "postgres-db", "metric": "cpu_percent", "severity": "CRITICAL", "timestamp": time.time()}
    ]
    incidents = await causal_engine_instance.infer_root_cause(anomalies)
    assert len(incidents) == 1
    assert incidents[0]["root_cause_pod"] == "postgres-db"
    assert incidents[0]["summary"].startswith("Inferred root cause in postgres-db")

@pytest.mark.asyncio
async def test_infer_root_cause_propagation(causal_engine_instance, mock_knowledge_graph):
    anomalies = [
        {"pod_id": "postgres-db", "metric": "cpu_percent", "severity": "CRITICAL", "timestamp": time.time()},
        {"pod_id": "auth-service", "metric": "latency_ms", "severity": "WARNING", "timestamp": time.time() + 1},
    ]
    incidents = await causal_engine_instance.infer_root_cause(anomalies)
    assert len(incidents) == 1
    # Auth-service depends on postgres-db, so postgres-db should be higher scored
    assert incidents[0]["root_cause_pod"] == "postgres-db"
    assert "auth-service" in incidents[0]["causal_chain"]

@pytest.mark.asyncio
async def test_infer_root_cause_multi_target_dependencies(causal_engine_instance, mock_knowledge_graph):
    # Anomalies on frontend and auth. Frontend depends on auth. Auth depends on postgres AND redis.
    anomalies = [
        {"pod_id": "frontend-service", "metric": "latency_ms", "severity": "CRITICAL", "timestamp": time.time() + 2},
        {"pod_id": "auth-service", "metric": "cpu_percent", "severity": "WARNING", "timestamp": time.time() + 1},
        {"pod_id": "postgres-db", "metric": "pvc_write_mbps", "severity": "WARNING", "timestamp": time.time()},
        {"pod_id": "redis-cache", "metric": "memory_pct", "severity": "WARNING", "timestamp": time.time()},
    ]
    incidents = await causal_engine_instance.infer_root_cause(anomalies)
    assert len(incidents) == 1
    # With corrected dependency parsing, postgres and redis should contribute to auth-service's score
    # and auth-service should score higher than frontend.
    # Root cause should be either postgres or redis based on scoring
    root_pod = incidents[0]["root_cause_pod"]
    assert root_pod in ["postgres-db", "redis-cache"]
    assert "auth-service" in incidents[0]["causal_chain"]
    assert "frontend-service" in incidents[0]["causal_chain"]

@pytest.mark.asyncio
async def test_infer_root_cause_decay(causal_engine_instance, mock_knowledge_graph):
    anomalies = [
        {"pod_id": "postgres-db", "metric": "cpu_percent", "severity": "CRITICAL", "timestamp": time.time() - causal_engine_instance.EVIDENCE_DECAY_SEC - 10}, # Stale
        {"pod_id": "auth-service", "metric": "latency_ms", "severity": "WARNING", "timestamp": time.time()}, # Fresh
    ]
    incidents = await causal_engine_instance.infer_root_cause(anomalies)
    assert len(incidents) == 1
    assert incidents[0]["root_cause_pod"] == "auth-service" # Stale anomaly should be ignored

def test_build_causal_chain():
    # Simple linear chain
    edges = [
        {"source": "A", "target": "B"},
        {"source": "B", "target": "C"},
    ]
    chain = _build_causal_chain("A", {"A", "B", "C"}, edges)
    assert chain == ["A", "B", "C"]

    # Chain with branching
    edges = [
        {"source": "A", "target": "B"},
        {"source": "B", "target": "C"},
        {"source": "B", "target": "D"},
    ]
    chain = _build_causal_chain("A", {"A", "B", "C", "D"}, edges)
    assert chain[0] == "A"
    assert "B" in chain[1:]
    assert "C" in chain[1:]
    assert "D" in chain[1:]
    assert len(chain) == 4

    # Chain with unaffected nodes
    edges = [
        {"source": "A", "target": "B"},
        {"source": "B", "target": "C"},
    ]
    chain = _build_causal_chain("A", {"A", "B"}, edges)
    assert chain == ["A", "B"]
