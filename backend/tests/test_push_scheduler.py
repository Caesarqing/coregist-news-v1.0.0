import unittest
from datetime import datetime, timedelta

from services.scheduler.service import SchedulerService


class PushSchedulerTest(unittest.TestCase):
    def test_push_due_within_window(self):
        now = datetime(2026, 5, 6, 8, 4)
        push_settings = {
            "pushTimes": ["08:00"],
            "pushDays": ["wednesday"],
            "everyday": False,
        }
        scheduled = SchedulerService._scheduled_time_for_push(push_settings, now, window_minutes=5)
        self.assertEqual(scheduled, datetime(2026, 5, 6, 8, 0))

    def test_push_not_due_after_window(self):
        now = datetime(2026, 5, 6, 8, 6)
        push_settings = {
            "pushTimes": ["08:00"],
            "pushDays": ["wednesday"],
            "everyday": False,
        }
        self.assertIsNone(SchedulerService._scheduled_time_for_push(push_settings, now, window_minutes=5))

    def test_everyday_ignores_push_days(self):
        now = datetime(2026, 5, 7, 18, 2)
        push_settings = {
            "pushTimes": ["18:00"],
            "pushDays": ["monday"],
            "everyday": True,
        }
        self.assertEqual(
            SchedulerService._scheduled_time_for_push(push_settings, now, window_minutes=5),
            datetime(2026, 5, 7, 18, 0),
        )

    def test_push_count_clamped(self):
        self.assertEqual(SchedulerService._normalize_push_count(0), 1)
        self.assertEqual(SchedulerService._normalize_push_count(7), 7)
        self.assertEqual(SchedulerService._normalize_push_count(50), 20)


if __name__ == "__main__":
    unittest.main()
