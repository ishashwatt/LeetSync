class Solution(object):
    def findMaxPathScore(self, edges, online, k):
        """
        :type edges: List[List[int]]
        :type online: List[bool]
        :type k: int
        :rtype: int
        """
        n = len(online)
        g = [[] for _ in range(n)]
        indeg = [0] * n
        vals = set()

        for u, v, w in edges:
            g[u].append((v, w))
            indeg[v] += 1
            vals.add(w)

        # Topological order
        from collections import deque
        q = deque(i for i in range(n) if indeg[i] == 0)
        topo = []
        while q:
            u = q.popleft()
            topo.append(u)
            for v, _ in g[u]:
                indeg[v] -= 1
                if indeg[v] == 0:
                    q.append(v)

        vals = sorted(vals)

        def ok(x):
            INF = 10 ** 30
            dp = [INF] * n
            dp[0] = 0
            for u in topo:
                if dp[u] == INF:
                    continue
                if u != 0 and u != n - 1 and not online[u]:
                    continue
                for v, w in g[u]:
                    if w < x:
                        continue
                    if v != n - 1 and v != 0 and not online[v]:
                        continue
                    if dp[u] + w < dp[v]:
                        dp[v] = dp[u] + w
            return dp[n - 1] <= k

        if not vals or not ok(vals[0]):
            return -1

        lo, hi = 0, len(vals) - 1
        ans = vals[0]
        while lo <= hi:
            mid = (lo + hi) // 2
            if ok(vals[mid]):
                ans = vals[mid]
                lo = mid + 1
            else:
                hi = mid - 1
        return ans