import os
import sys
import unittest
from unittest.mock import patch

BACKEND_DIR = os.path.dirname(__file__)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


class StockDatabaseBehaviorTests(unittest.TestCase):
    def setUp(self):
        self.env_patch = patch.dict(
            os.environ,
            {
                "HOT_CACHE_CAPACITY": "2",
                "HOT_STOCK_THRESHOLD": "3",
            },
            clear=False,
        )
        self.env_patch.start()

        get_client_patch = patch(
            "data_structures.get_supabase_client", return_value=None
        )
        self.addCleanup(get_client_patch.stop)
        get_client_patch.start()

        from data_structures import StockDatabase

        self.database = StockDatabase()
        self.record = {
            "open_price": 100.0,
            "close_price": 101.5,
            "high_price": 102.0,
            "low_price": 99.5,
            "volume": 1200,
        }
        self.database.ingest_stock("AAPL", "2025-01-02", self.record.copy())

    def tearDown(self):
        self.env_patch.stop()

    def test_hot_cache_promotes_after_threshold_and_records_hits(self):
        first = self.database.query_stock("AAPL", "2025-01-02")
        second = self.database.query_stock("AAPL", "2025-01-02")
        third = self.database.query_stock("AAPL", "2025-01-02")
        fourth = self.database.query_stock("AAPL", "2025-01-02")

        self.assertEqual(first["close_price"], 101.5)
        self.assertEqual(second["close_price"], 101.5)
        self.assertEqual(third["close_price"], 101.5)
        self.assertEqual(fourth["close_price"], 101.5)

        stats = self.database.get_cache_stats()
        self.assertTrue(self.database.is_hot_stock("AAPL"))
        self.assertEqual(stats["misses"], 3)
        self.assertEqual(stats["hits"], 1)
        self.assertEqual(stats["puts"], 1)
        self.assertEqual(stats["size"], 1)
        self.assertEqual(stats["hot_stocks"], ["AAPL"])

    def test_benchmark_query_workload_reports_cache_activity(self):
        result = self.database.benchmark_query_workload(
            iterations=12, stock_ids=["AAPL"]
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["benchmark"]["iterations"], 12)
        self.assertEqual(result["benchmark"]["cache_hits"], 12)
        self.assertEqual(result["benchmark"]["cache_misses"], 0)
        self.assertGreaterEqual(result["cache"]["benchmark_runs"], 1)

    def test_ingest_stock_immediately_processes_alert_queue(self):
        alert = self.database.create_alert(
            "TSLA",
            "greater_than",
            300,
            created_by="tester",
            tenant_id="global",
        )

        self.database.ingest_stock(
            "TSLA",
            "2025-01-03",
            {
                "open_price": 295.0,
                "close_price": 305.0,
                "high_price": 306.0,
                "low_price": 294.0,
                "volume": 1500,
            },
        )

        configured = self.database.get_configured_alerts("global")
        triggered = self.database.get_triggered_alerts("global")

        self.assertEqual(len(self.database.alerts_queue["global"]), 0)
        self.assertEqual(len(configured), 1)
        self.assertEqual(configured[0]["id"], alert["id"])
        self.assertEqual(configured[0]["status"], "triggered")
        self.assertEqual(len(triggered), 1)
        self.assertEqual(triggered[0]["owner"], "tester")
        self.assertIn("TSLA price (305.0)", triggered[0]["message"])


if __name__ == "__main__":
    unittest.main()
