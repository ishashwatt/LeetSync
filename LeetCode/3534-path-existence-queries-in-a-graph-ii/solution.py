class Solution(object):
    def pathExistenceQueries(self, n, nums, maxDiff, queries):
        a = sorted((x, i) for i, x in enumerate(nums))
        b = [x for x, _ in a]
        pos = {}
        for i, (_, j) in enumerate(a):
            pos[j] = i

        L = n.bit_length() + 1
        up = [[0] * L for _ in range(n)]

        r = 0
        for i in range(n):
            while r + 1 < n and b[r + 1] - b[i] <= maxDiff:
                r += 1
            up[i][0] = r

        for k in range(1, L):
            for i in range(n):
                up[i][k] = up[up[i][k - 1]][k - 1]

        def jump(l, r):
            if l == r:
                return 0
            if up[l][0] >= r:
                return 1
            if up[l][L - 1] < r:
                return -1

            ans = 0
            for k in range(L - 1, -1, -1):
                if up[l][k] < r:
                    ans += 1 << k
                    l = up[l][k]
            return ans + 1

        res = []
        for u, v in queries:
            x, y = pos[u], pos[v]
            if x > y:
                x, y = y, x
            res.append(jump(x, y))
        return res