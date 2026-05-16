import os
import logging
import asyncio
import time
import httpx
from typing import List, Dict, Any, Optional

logger = logging.getLogger("PrometheusDriver")

class PrometheusDriver:
    """
    Fetches real-time metrics from a Prometheus instance.
    Configured via PROMETHEUS_URL environment variable.
    """
    def __init__(self, url: Optional[str] = None):
        self.url = url or os.getenv("PROMETHEUS_URL", "http://localhost:9090")
        self.connected = False
        self.last_check = 0
        self._client = httpx.AsyncClient(base_url=self.url, timeout=5.0)

    async def check_connection(self) -> bool:
        """Verifies if Prometheus is reachable."""
        now = time.time()
        if now - self.last_check < 30 and self.connected:
            return True
        
        try:
            response = await self._client.get("/api/v1/query", params={"query": "up"})
            if response.status_code == 200:
                self.connected = True
                logger.info(f"Connected to Prometheus at {self.url}")
            else:
                self.connected = False
                logger.warning(f"Prometheus returned status {response.status_code}")
        except Exception as e:
            self.connected = False
            logger.warning(f"Could not connect to Prometheus at {self.url}: {str(e)}")
        
        self.last_check = now
        return self.connected

    async def _query(self, promql: str) -> List[Dict[str, Any]]:
        """Executes a PromQL query and returns the results."""
        if not await self.check_connection():
            return []
        
        try:
            response = await self._client.get("/api/v1/query", params={"query": promql})
            if response.status_code != 200:
                return []
            
            data = response.json()
            if data.get("status") != "success":
                return []
            
            return data.get("data", {}).get("result", [])
        except Exception as e:
            logger.error(f"Error querying Prometheus: {str(e)}")
            return []

    async def fetch_all_pod_metrics(self) -> List[Dict[str, Any]]:
        """
        Fetches CPU, Memory, Network, and Storage metrics for all pods.
        Returns a list of metrics mapped by pod and namespace.
        """
        # PromQL queries
        queries = {
            "cpu": 'sum(rate(container_cpu_usage_seconds_total{pod!="", container!=""}[2m])) by (pod, namespace)',
            "memory": 'sum(container_memory_working_set_bytes{pod!="", container!=""}) by (pod, namespace)',
            "net_in": 'sum(rate(container_network_receive_bytes_total{pod!=""}[2m])) by (pod, namespace)',
            "net_out": 'sum(rate(container_network_transmit_bytes_total{pod!=""}[2m])) by (pod, namespace)',
            "fs_read": 'sum(rate(container_fs_reads_bytes_total{pod!="", container!=""}[2m])) by (pod, namespace)',
            "fs_write": 'sum(rate(container_fs_writes_bytes_total{pod!="", container!=""}[2m])) by (pod, namespace)',
        }

        # Run queries in parallel
        tasks = {name: self._query(q) for name, q in queries.items()}
        results = await asyncio.gather(*tasks.values())
        results_map = dict(zip(tasks.keys(), results))

        # Pivot data: pod_map[(namespace, pod)] = {metrics}
        pod_map = {}

        def get_pod_key(res):
            labels = res.get("metric", {})
            return labels.get("namespace"), labels.get("pod")

        for metric_name, data in results_map.items():
            for item in data:
                key = get_pod_key(item)
                if not key[0] or not key[1]: continue
                
                if key not in pod_map:
                    pod_map[key] = {
                        "namespace": key[0],
                        "pod_name": key[1],
                        "cpu_percent": 0.0,
                        "memory_mb": 0.0,
                        "network_in_mbps": 0.0,
                        "network_out_mbps": 0.0,
                        "pvc_read_mbps": 0.0,
                        "pvc_write_mbps": 0.0,
                    }
                
                val = float(item.get("value", [0, 0])[1])
                
                if metric_name == "cpu":
                    pod_map[key]["cpu_percent"] = round(val * 100, 2)
                elif metric_name == "memory":
                    pod_map[key]["memory_mb"] = round(val / (1024 * 1024), 2)
                elif metric_name == "net_in":
                    pod_map[key]["network_in_mbps"] = round(val * 8 / 1_000_000, 3)
                elif metric_name == "net_out":
                    pod_map[key]["network_out_mbps"] = round(val * 8 / 1_000_000, 3)
                elif metric_name == "fs_read":
                    pod_map[key]["pvc_read_mbps"] = round(val / 1_000_000, 3)
                elif metric_name == "fs_write":
                    pod_map[key]["pvc_write_mbps"] = round(val / 1_000_000, 3)

        return list(pod_map.values())

# Singleton instance
prometheus_driver = PrometheusDriver()
