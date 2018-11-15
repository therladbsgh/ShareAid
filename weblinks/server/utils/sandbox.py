import heapq

li = [1, 3, 5, 7]
heapq.heapify(li)
print(li)
heapq.heappush(li, 9)
a = heapq.heappop(li)
print(a)
print(li)
