class Solution(object):
    def findSafeWalk(self, grid, health):
        """
        :type grid: List[List[int]]
        :type health: int
        :rtype: bool
        """
        m, n = len(grid), len(grid[0])
        INF = 10 ** 9
        dist = [[INF] * n for _ in range(m)]
        dist[0][0] = grid[0][0]
        dq = deque([(0, 0)])

        while dq:
            x, y = dq.popleft()
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < m and 0 <= ny < n:
                    nd = dist[x][y] + grid[nx][ny]
                    if nd < dist[nx][ny]:
                        dist[nx][ny] = nd
                        if grid[nx][ny]:
                            dq.append((nx, ny))
                        else:
                            dq.appendleft((nx, ny))

        return dist[m - 1][n - 1] < health