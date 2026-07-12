class Solution(object):
    def pathExistenceQueries(self, n, nums, maxDiff, queries):
        g = [0] * n
        c = 0
        for i in range(1, n):
            if nums[i] - nums[i - 1] > maxDiff:
                c += 1
            g[i] = c
        return [g[u] == g[v] for u, v in queries]