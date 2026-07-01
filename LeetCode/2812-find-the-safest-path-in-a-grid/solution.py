class Solution(object):
    def maximumSafenessFactor(self, grid):
        """
        :type grid: List[List[int]]
        :rtype: int
        """
        from collections import deque

        n = len(grid)
        d = [[-1] * n for _ in range(n)]
        q = deque()

        for i in range(n):
            for j in range(n):
                if grid[i][j]:
                    d[i][j] = 0
                    q.append((i, j))

        while q:
            x, y = q.popleft()
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < n and 0 <= ny < n and d[nx][ny] == -1:
                    d[nx][ny] = d[x][y] + 1
                    q.append((nx, ny))

        def ok(v):
            if d[0][0] < v:
                return False
            q = deque([(0, 0)])
            vis = [[0] * n for _ in range(n)]
            vis[0][0] = 1
            while q:
                x, y = q.popleft()
                if x == n - 1 and y == n - 1:
                    return True
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < n and 0 <= ny < n and not vis[nx][ny] and d[nx][ny] >= v:
                        vis[nx][ny] = 1
                        q.append((nx, ny))
            return False

        l, r = 0, max(max(row) for row in d)
        while l < r:
            m = (l + r + 1) // 2
            if ok(m):
                l = m
            else:
                r = m - 1
        return l