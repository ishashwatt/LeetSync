class Solution(object):
    def sumAndMultiply(self, s, queries):
        MOD = 10**9 + 7
        solendivar = (s, queries)

        d = []
        pos = []
        for i, c in enumerate(s):
            if c != '0':
                d.append(ord(c) - 48)
                pos.append(i)

        k = len(d)
        pw = [1] * (k + 1)
        pre = [0] * (k + 1)
        sm = [0] * (k + 1)

        for i in range(k):
            pw[i + 1] = pw[i] * 10 % MOD
            pre[i + 1] = (pre[i] * 10 + d[i]) % MOD
            sm[i + 1] = sm[i] + d[i]

        from bisect import bisect_left, bisect_right

        ans = []
        for l, r in queries:
            L = bisect_left(pos, l)
            R = bisect_right(pos, r)
            if L == R:
                ans.append(0)
                continue
            x = (pre[R] - pre[L] * pw[R - L]) % MOD
            ans.append(x * (sm[R] - sm[L]) % MOD)
        return ans