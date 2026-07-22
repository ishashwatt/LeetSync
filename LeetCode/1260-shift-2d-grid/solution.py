class Solution(object):
    def shiftGrid(self, grid, k):
        m, n = len(grid), len(grid[0])
        a = [x for r in grid for x in r]
        k %= m * n
        a = a[-k:] + a[:-k]
        return [a[i*n:(i+1)*n] for i in range(m)]