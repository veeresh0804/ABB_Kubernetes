"""
KubeMind AI - Central Event Bus

This module provides a singleton `EventBus` for the entire application.
It uses asyncio Queues to create a decoupled, pub/sub architecture.
"""
import asyncio
from collections import defaultdict
from typing import Dict, List, Any

_queues: Dict[str, List[asyncio.Queue]] = defaultdict(list)
_instance = None

class EventBus:
    """A singleton, asynchronous event bus."""

    def __new__(cls):
        global _instance
        if _instance is None:
            _instance = super(EventBus, cls).__new__(cls)
        return _instance

    async def publish(self, topic: str, message: Any):
        for queue in list(_queues[topic]):
            await queue.put(message)

    def subscribe(self, topic: str) -> asyncio.Queue:
        queue = asyncio.Queue(maxsize=100)
        _queues[topic].append(queue)
        return queue

    def unsubscribe(self, topic: str, queue: asyncio.Queue):
        if queue in _queues[topic]:
            _queues[topic].remove(queue)

event_bus = EventBus()