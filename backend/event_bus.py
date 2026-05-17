"""
KubeMind AI - Central Event Bus

This module provides a singleton `EventBus` for the entire application.
It uses asyncio Queues to create a decoupled, pub/sub architecture.
"""
import asyncio
from collections import defaultdict
from typing import Dict, List, Any

# The central store for all event queues
# The key is the event topic (e.g., event class name), and the value is a list of queues
# that subscribers are listening on.
_queues: Dict[str, List[asyncio.Queue]] = defaultdict(list)
_instance = None

class EventBus:
    """A singleton, asynchronous event bus."""

    def __new__(cls):
        """Enforce singleton pattern."""
        global _instance
        if _instance is None:
            _instance = super(EventBus, cls).__new__(cls)
        return _instance

    async def publish(self, topic: str, message: Any):
        """
        Publish a message to a specific topic.
        All subscribers to this topic will receive the message.
        """
        # Create a copy of the list of queues to avoid issues if a subscriber
        # unsubscribes while we are iterating.
        for queue in list(_queues[topic]):
            await queue.put(message)

    def subscribe(self, topic: str) -> asyncio.Queue:
        """
        Subscribe to a topic.

        Returns an asyncio.Queue that the subscriber can await messages on.
        """
        queue = asyncio.Queue()
        _queues[topic].append(queue)
        return queue

    def unsubscribe(self, topic: str, queue: asyncio.Queue):
        """
        Unsubscribe a queue from a topic.
        """
        if queue in _queues[topic]:
            _queues[topic].remove(queue)

# Singleton instance for the application to use
event_bus = EventBus()
