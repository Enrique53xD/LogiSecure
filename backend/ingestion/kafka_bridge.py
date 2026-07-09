"""Best-effort Kafka producer wrapper.

`confluent_kafka.Producer()` does not raise for an unreachable broker -- that
only shows up later, asynchronously, via delivery-report callbacks. So the
degrade path here doesn't try to catch "broker down" at construction time; it
disables itself only for the cases that *are* synchronous (library missing or
bad config), and otherwise treats every delivery failure as fire-and-forget
logging. `produce_event()` never blocks and never raises.
"""

import logging

from pydantic import BaseModel

logger = logging.getLogger(__name__)


class KafkaBridge:
    def __init__(self, bootstrap_servers: str):
        self.enabled = False
        self._producer = None

        try:
            from confluent_kafka import Producer

            self._producer = Producer({"bootstrap.servers": bootstrap_servers})
            self.enabled = True
        except ImportError:
            logger.warning("kafka_bridge: confluent_kafka not installed, producing disabled")
        except Exception:
            logger.warning("kafka_bridge: failed to configure producer, producing disabled", exc_info=True)

    def _on_delivery(self, err, msg):
        if err is not None:
            logger.warning("kafka_bridge: delivery failed for topic=%s: %s", msg.topic() if msg else "?", err)

    def produce_event(self, topic: str, event: BaseModel) -> None:
        if not self.enabled:
            return

        try:
            self._producer.produce(
                topic,
                value=event.model_dump_json().encode("utf-8"),
                callback=self._on_delivery,
            )
            self._producer.poll(0)
        except BufferError:
            logger.warning("kafka_bridge: local queue full, dropping event for topic=%s", topic)
        except Exception:
            logger.warning("kafka_bridge: produce failed for topic=%s", topic, exc_info=True)

    def close(self) -> None:
        if self.enabled and self._producer is not None:
            self._producer.flush(timeout=5)
