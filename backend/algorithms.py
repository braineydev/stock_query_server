"""Explicit algorithm implementations for DSA coursework evidence.

This module intentionally includes standalone implementations for:
- Graph traversal (BFS/DFS)
- O(n log n) merge sort
- Binary search on sorted records
"""

from collections import deque
from math import sqrt


class StockRelationshipGraph:
    """Undirected graph representing relationships between stock symbols."""

    def __init__(self):
        self.adjacency = {}

    def clear(self):
        self.adjacency = {}

    def add_node(self, node):
        if node not in self.adjacency:
            self.adjacency[node] = set()

    def add_edge(self, source, target):
        if source == target:
            return
        self.add_node(source)
        self.add_node(target)
        self.adjacency[source].add(target)
        self.adjacency[target].add(source)

    def nodes(self):
        return sorted(self.adjacency.keys())

    def edge_count(self):
        total = sum(len(neighbors) for neighbors in self.adjacency.values())
        return total // 2

    def bfs(self, start, max_depth=2):
        """Breadth-first traversal.

        Time complexity: O(V + E)
        Space complexity: O(V)
        """
        if start not in self.adjacency:
            return {
                "start": start,
                "method": "bfs",
                "visited_order": [],
                "levels": {},
            }

        visited = {start}
        levels = {start: 0}
        order = []
        queue = deque([start])

        while queue:
            node = queue.popleft()
            depth = levels[node]
            order.append(node)

            if depth >= max_depth:
                continue

            for neighbor in sorted(self.adjacency[node]):
                if neighbor in visited:
                    continue
                visited.add(neighbor)
                levels[neighbor] = depth + 1
                queue.append(neighbor)

        return {
            "start": start,
            "method": "bfs",
            "visited_order": order,
            "levels": levels,
        }

    def dfs(self, start, max_depth=2):
        """Depth-first traversal (iterative stack version).

        Time complexity: O(V + E)
        Space complexity: O(V)
        """
        if start not in self.adjacency:
            return {
                "start": start,
                "method": "dfs",
                "visited_order": [],
            }

        visited = set()
        order = []
        stack = [(start, 0)]

        while stack:
            node, depth = stack.pop()
            if node in visited:
                continue

            visited.add(node)
            order.append(node)

            if depth >= max_depth:
                continue

            # Reverse-sorted push preserves ascending traversal order when popped.
            for neighbor in sorted(self.adjacency[node], reverse=True):
                if neighbor not in visited:
                    stack.append((neighbor, depth + 1))

        return {
            "start": start,
            "method": "dfs",
            "visited_order": order,
        }

    @staticmethod
    def _daily_returns(history_by_date):
        dates = sorted(history_by_date.keys())
        if len(dates) < 2:
            return []

        returns = []
        for index in range(1, len(dates)):
            prev_close = float(history_by_date[dates[index - 1]]["close_price"])
            current_close = float(history_by_date[dates[index]]["close_price"])
            if prev_close == 0:
                continue
            returns.append((dates[index], (current_close - prev_close) / prev_close))
        return returns

    @staticmethod
    def _pearson_correlation(values_x, values_y):
        size = len(values_x)
        if size == 0:
            return 0.0

        sum_x = sum(values_x)
        sum_y = sum(values_y)
        sum_x2 = sum(x * x for x in values_x)
        sum_y2 = sum(y * y for y in values_y)
        sum_xy = sum(x * y for x, y in zip(values_x, values_y))

        numerator = (size * sum_xy) - (sum_x * sum_y)
        denominator_term_x = (size * sum_x2) - (sum_x * sum_x)
        denominator_term_y = (size * sum_y2) - (sum_y * sum_y)
        denominator = sqrt(max(denominator_term_x, 0) * max(denominator_term_y, 0))

        if denominator == 0:
            return 0.0

        return numerator / denominator

    def rebuild_from_stock_data(
        self, stocks, min_overlap=30, correlation_threshold=0.45
    ):
        """Build graph edges from historical co-movement correlation.

        For each pair of stocks:
        - Compute daily return series by date
        - Align overlapping dates
        - Connect stocks when Pearson correlation >= threshold

        Pairwise complexity is roughly O(S^2 * D), where:
        - S = number of stocks
        - D = average number of daily points
        """
        self.clear()

        symbols = sorted(stocks.keys())
        for symbol in symbols:
            self.add_node(symbol)

        returns_map = {}
        for symbol in symbols:
            returns_map[symbol] = dict(self._daily_returns(stocks.get(symbol, {})))

        for left_index in range(len(symbols)):
            left = symbols[left_index]
            for right_index in range(left_index + 1, len(symbols)):
                right = symbols[right_index]

                left_returns = returns_map[left]
                right_returns = returns_map[right]
                overlapping_dates = sorted(
                    set(left_returns.keys()).intersection(right_returns.keys())
                )

                if len(overlapping_dates) < min_overlap:
                    continue

                series_left = [left_returns[date] for date in overlapping_dates]
                series_right = [right_returns[date] for date in overlapping_dates]
                correlation = self._pearson_correlation(series_left, series_right)

                if correlation >= correlation_threshold:
                    self.add_edge(left, right)

        return {
            "nodes": len(self.adjacency),
            "edges": self.edge_count(),
            "min_overlap": min_overlap,
            "correlation_threshold": correlation_threshold,
        }


def merge_sort_records(records, key, reverse=False):
    """Stable merge sort implementation.

    Time complexity: O(n log n)
    Space complexity: O(n)
    """

    def merge(left, right):
        merged = []
        left_index = 0
        right_index = 0

        while left_index < len(left) and right_index < len(right):
            left_item = left[left_index]
            right_item = right[right_index]

            left_value = left_item.get(key)
            right_value = right_item.get(key)

            take_left = left_value <= right_value
            if reverse:
                take_left = left_value >= right_value

            if take_left:
                merged.append(left_item)
                left_index += 1
            else:
                merged.append(right_item)
                right_index += 1

        if left_index < len(left):
            merged.extend(left[left_index:])
        if right_index < len(right):
            merged.extend(right[right_index:])
        return merged

    if len(records) <= 1:
        return list(records)

    midpoint = len(records) // 2
    left_sorted = merge_sort_records(records[:midpoint], key=key, reverse=reverse)
    right_sorted = merge_sort_records(records[midpoint:], key=key, reverse=reverse)
    return merge(left_sorted, right_sorted)


def binary_search_records(sorted_records, key, target):
    """Binary search for a record key within sorted records.

    Time complexity: O(log n)
    Space complexity: O(1)
    """
    low = 0
    high = len(sorted_records) - 1

    while low <= high:
        mid = (low + high) // 2
        mid_value = sorted_records[mid].get(key)

        if mid_value == target:
            return sorted_records[mid], mid
        if mid_value < target:
            low = mid + 1
        else:
            high = mid - 1

    return None, -1
