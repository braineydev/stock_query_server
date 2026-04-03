#======================================================================
#Name:Lewis Thegetha
#REG NO: BSCCS/2025/69379
#ROLE: Algorithm specialist (Theme C2)
#TASK: Rollling Metrics Implementation (Heaps/Deques)
#======================================================================
from collections import deque
import heapq 
class StockMetrics:
    def __init__(self, window_size):
        self.window_size = window_size
        self.prices = deque(maxlen=window_size)
        self.current_sum = 0.0
        self.max_heap = []
        self.min_heap = []
    def add_price(self, new_price):
        if len(self.prices) == self.window_size:
            self.current_sum -= self.prices[0]
        self.prices.append(new_price)
        self.current_sum += new_price
        heapq.heappush(self.max_heap, -new_price)
        heapq.heappush(self.min_heap, new_price)
        avg = self.current_sum / len(self.prices)
        return avg
    def get_max(self):
       while self.max_heap and -self.max_heap[0] not in self.prices:
           heapq.heappop(self.max_heap)
       return -self.max_heap[0] if self.max_heap else None
    def get_min(self):
        while self.min_heap and self.min_heap[0] not in self.prices:
            heapq.heappop(self.min_heap)
        return self.min_heap[0] if self.min_heap else None
if __name__ == "__main__":
        tracker = StockMetrics(window_size=3)
        prices_to_add = [100, 200, 300, 50]
        for p in prices_to_add:
            avg = tracker.add_price(p)
            print(f"Added {p}: Avg={avg:.2f}, Max={tracker.get_max()}, Min{tracker.get_min()}")    
    



                

