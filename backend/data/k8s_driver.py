import logging
import asyncio
from typing import List, Dict, Any

# kubernetes is an optional dependency.
try:
    from kubernetes import client, config
    from kubernetes.client.rest import ApiException
except ImportError:
    client = None
    config = None
    ApiException = None

logger = logging.getLogger("KubeMindDriver")

def _parse_cpu(cpu_str: str) -> float:
    """Parse CPU string (e.g., '1024n', '1m') to millicores."""
    if not cpu_str:
        return 0.0
    if cpu_str.endswith('n'):
        return float(cpu_str[:-1]) / 1_000_000
    if cpu_str.endswith('u'):
        return float(cpu_str[:-1]) / 1_000
    if cpu_str.endswith('m'):
        return float(cpu_str[:-1])
    return float(cpu_str) * 1000

def _parse_mem(mem_str: str) -> float:
    """Parse memory string (e.g., '128974848', '129e6', '123Mi') to MB."""
    if not mem_str:
        return 0.0
    if mem_str.endswith('Ki'):
        return float(mem_str[:-2]) / 1024
    if mem_str.endswith('Mi'):
        return float(mem_str[:-2])
    if mem_str.endswith('Gi'):
        return float(mem_str[:-2]) * 1024
    # Assume bytes if no unit
    return float(mem_str) / (1024 * 1024)

class KubernetesLiveDriver:
    """
    Graceful real-time Kubernetes driver.
    Attempts to load kubeconfig. If cluster isn't responsive, it enables demo simulation fallback seamlessly.
    Uses asyncio.to_thread to run synchronous client calls in a non-blocking way.
    """
    def __init__(self):
        self.connected = False
        self.context_name = "Simulation-Mode"
        self.core_api = None
        self.custom_api = None
        if config:
            self._initialize_connection()

    def _initialize_connection(self):
        try:
            config.load_kube_config()
            _, active_context = config.list_kube_config_contexts()
            self.context_name = active_context.get('name', 'Active-Cluster')
            self.core_api = client.CoreV1Api()
            self.custom_api = client.CustomObjectsApi()
            # Perform a quick, non-blocking health check
            self.core_api.get_api_resources(timeout_seconds=2)
            self.connected = True
            logger.info(f"Successfully connected to live Kubernetes context: {self.context_name}")
        except Exception as e:
            logger.warning(f"Live Kubernetes config not found or cluster unreachable: {str(e)}")
            logger.warning("Proceeding with simulation-only mode.")
            self.connected = False
            self.context_name = "Fallback-EdgeSimulator"

    async def discover_dependencies(self) -> List[Dict]:
        """
        Dynamically discovers dependencies by analyzing Services, Endpoints, 
        and Pod environment variables.
        """
        if not self.connected or not self.core_api:
            return []

        try:
            services = await asyncio.to_thread(self.core_api.list_service_for_all_namespaces)
            endpoints = await asyncio.to_thread(self.core_api.list_endpoints_for_all_namespaces)
            pods = await asyncio.to_thread(self.core_api.list_pod_for_all_namespaces)

            # 1. Map Services to Pod UIDs using Endpoints
            svc_to_pods = {} # (namespace, svc_name) -> list of pod_uids
            svc_ip_to_name = {} # cluster_ip -> (namespace, svc_name)

            for svc in services.items:
                ns = svc.metadata.namespace
                name = svc.metadata.name
                svc_ip_to_name[svc.spec.cluster_ip] = (ns, name)
            
            for ep in endpoints.items:
                ns = ep.metadata.namespace
                name = ep.metadata.name
                uids = []
                if ep.subsets:
                    for subset in ep.subsets:
                        if subset.addresses:
                            for addr in subset.addresses:
                                if addr.target_ref and addr.target_ref.kind == "Pod":
                                    uids.append(addr.target_ref.uid)
                svc_to_pods[(ns, name)] = uids

            # 2. Analyze Pods for outbound dependencies
            edges = []
            pod_uid_to_name = {p.metadata.uid: p.metadata.name for p in pods.items}
            
            for pod in pods.items:
                source_uid = pod.metadata.uid
                found_targets = set()

                # Check Env Vars for Service Names or IPs
                for container in pod.spec.containers:
                    if not container.env: continue
                    for env in container.env:
                        val = env.value
                        if not val: continue
                        
                        # Match against Service IPs
                        if val in svc_ip_to_name:
                            target_svc = svc_ip_to_name[val]
                            found_targets.add(target_svc)
                        
                        # Match against Service Names (simple substring or exact match)
                        for (svc_ns, svc_name) in svc_to_pods.keys():
                            if svc_name in val.lower() and len(svc_name) > 3: # Avoid trivial matches
                                found_targets.add((svc_ns, svc_name))

                # Create edges from Pod -> Target Pods (via Service)
                for (t_ns, t_name) in found_targets:
                    target_uids = svc_to_pods.get((t_ns, t_name), [])
                    for t_uid in target_uids:
                        if t_uid != source_uid:
                            edges.append({
                                "source": pod_uid_to_name.get(source_uid, source_uid),
                                "target": pod_uid_to_name.get(t_uid, t_uid),
                                "type": "discovered",
                                "protocol": "TCP",
                                "weight": 0.5
                            })

            # Deduplicate edges
            unique_edges = []
            seen = set()
            for e in edges:
                key = (e["source"], e["target"])
                if key not in seen:
                    unique_edges.append(e)
                    seen.add(key)

            return unique_edges

        except Exception as e:
            logger.error(f"Error discovering dependencies: {str(e)}")
            return []

    async def list_real_pods(self) -> List[Dict]:
        """
        Asynchronously queries live pods and their metrics from the cluster.
        This is the primary method for fetching real-world data.
        """
        if not self.connected or not self.core_api:
            return []

        try:
            # Run blocking I/O in a separate thread
            pod_list_response = await asyncio.to_thread(
                self.core_api.list_pod_for_all_namespaces, watch=False, timeout_seconds=3
            )

            metrics_response = await asyncio.to_thread(
                self.custom_api.list_cluster_custom_object,
                "metrics.k8s.io", "v1beta1", "pods"
            )
            
            pod_metrics = {
                (item['metadata']['namespace'], item['metadata']['name']): {
                    'cpu': _parse_cpu(c['usage']['cpu']), 
                    'memory': _parse_mem(c['usage']['memory'])
                }
                for item in metrics_response.get('items', [])
                for c in item.get('containers', [])
            }

            real_pods = []
            for pod in pod_list_response.items:
                metrics = pod_metrics.get((pod.metadata.namespace, pod.metadata.name), {'cpu': 0.0, 'memory': 0.0})
                
                restarts = 0
                if pod.status.container_statuses:
                    restarts = sum(cs.restart_count for cs in pod.status.container_statuses)

                # Get memory limit for calculating percentage
                mem_limit_mb = 0
                if pod.spec.containers and pod.spec.containers[0].resources.limits:
                    mem_limit_mb = _parse_mem(pod.spec.containers[0].resources.limits.get("memory", "0"))
                    
                # Optionally fetch a small tail of logs if the pod is unhealthy
                recent_logs = ""
                if pod.status.phase in ["CrashLoopBackOff", "Failed"] or restarts > 0:
                    try:
                        logs = await asyncio.to_thread(
                            self.core_api.read_namespaced_pod_log,
                            name=pod.metadata.name,
                            namespace=pod.metadata.namespace,
                            tail_lines=20,
                            _request_timeout=2
                        )
                        recent_logs = logs
                    except Exception:
                        recent_logs = "Log fetch failed or unavailable."

                real_pods.append({
                    "pod_id": pod.metadata.uid,
                    "pod_name": pod.metadata.name,
                    "namespace": pod.metadata.namespace,
                    "node": pod.spec.node_name,
                    "status": pod.status.phase,
                    "restarts": restarts,
                    "replicas": 1, # Cannot be easily determined from a single pod
                    "image": pod.spec.containers[0].image if pod.spec.containers else "unknown",
                    "recent_logs": recent_logs,
                    
                    # Real metrics
                    "cpu_percent": round((metrics['cpu'] / 1000) * 100, 2) if metrics['cpu'] > 0 else 0.0, # Convert millicores to percent of 1 core
                    "memory_mb": round(metrics['memory'], 2),
                    "memory_limit_mb": mem_limit_mb,
                    "memory_pct": round((metrics['memory'] / mem_limit_mb) * 100, 2) if mem_limit_mb > 0 else 0,

                    # Default values for metrics not available from metrics-server
                    "network_in_mbps": 0.0,
                    "network_out_mbps": 0.0,
                    "pvc_read_mbps": 0.0,
                    "pvc_write_mbps": 0.0,
                    "latency_ms": 0.0,
                    
                    "is_simulated": False,
                    "timestamp": pod.metadata.creation_timestamp.timestamp() if pod.metadata.creation_timestamp else 0,
                })
            return real_pods

        except ApiException as e:
            if e.status == 404:
                logger.warning("Metrics API (metrics.k8s.io) not found. CPU/Memory data will be zero. Install metrics-server for full functionality.")
            else:
                logger.error(f"Kubernetes API error: {e.reason} (status: {e.status})")
            self.connected = False # Assume connection is lost
            return []
        except Exception as e:
            logger.error(f"Failed listing real pods due to an unexpected error: {str(e)}")
            self.connected = False # Assume connection is lost
            return []

    async def execute_remediation(self, action: str, target: str, namespace: str = "production", **kwargs) -> Dict[str, Any]:
        """
        Executes a remediation action against the live cluster.
        Supported actions: 'restart_pod', 'scale_deployment'
        """
        if not self.connected:
            return {"status": "error", "message": "Not connected to live cluster. Action simulated."}

        try:
            if action == "restart_pod":
                await asyncio.to_thread(
                    self.core_api.delete_namespaced_pod,
                    name=target,
                    namespace=namespace,
                    body=client.V1DeleteOptions()
                )
                return {"status": "success", "message": f"Pod {target} deleted (will be recreated by ReplicaSet)."}
            
            elif action == "scale_deployment":
                apps_api = client.AppsV1Api()
                replicas = kwargs.get("replicas", 2)
                
                # Fetch current scale
                scale = await asyncio.to_thread(
                    apps_api.read_namespaced_deployment_scale,
                    name=target,
                    namespace=namespace
                )
                scale.spec.replicas = replicas
                
                # Update scale
                await asyncio.to_thread(
                    apps_api.replace_namespaced_deployment_scale,
                    name=target,
                    namespace=namespace,
                    body=scale
                )
                return {"status": "success", "message": f"Deployment {target} scaled to {replicas} replicas."}
            
            elif action == "isolate_pod":
                logger.info(f"Simulating isolation of pod {target} in namespace {namespace}.")
                return {"status": "success", "message": f"Pod {target} isolated (simulated)."}
            
            return {"status": "error", "message": f"Unknown action: {action}"}
            
        except Exception as e:
            logger.error(f"Failed to execute remediation: {str(e)}")
            return {"status": "error", "message": f"K8s API error: {str(e)}"}

# Singleton driver object
kube_driver = KubernetesLiveDriver()
