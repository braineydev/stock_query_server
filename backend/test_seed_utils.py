import os
import sys
import unittest

BACKEND_DIR = os.path.dirname(__file__)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from seed_utils import generate_seed_data


class SeedGenerationTests(unittest.TestCase):
    def test_same_seed_produces_identical_records(self):
        first = generate_seed_data(seed="2026-demo-seed")
        second = generate_seed_data(seed="2026-demo-seed")

        self.assertEqual(first, second)
        self.assertGreater(len(first), 0)

    def test_different_seeds_produce_different_records(self):
        first = generate_seed_data(seed="2026-demo-seed")
        second = generate_seed_data(seed="another-seed")

        self.assertNotEqual(first, second)


if __name__ == "__main__":
    unittest.main()
