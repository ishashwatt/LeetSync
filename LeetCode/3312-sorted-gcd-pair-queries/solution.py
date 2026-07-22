from bisect import bisect_right

class Solution:
    def gcdValues(self, nums, queries):
        m = max(nums)

        freq = [0] * (m + 1)
        for x in nums:
            freq[x] += 1

        cnt = [0] * (m + 1)
        for i in range(1, m + 1):
            for j in range(i, m + 1, i):
                cnt[i] += freq[j]

        pairs = [0] * (m + 1)
        for i in range(m, 0, -1):
            c = cnt[i]
            pairs[i] = c * (c - 1) // 2
            for j in range(i * 2, m + 1, i):
                pairs[i] -= pairs[j]

        pref = []
        vals = []
        s = 0
        for i in range(1, m + 1):
            if pairs[i]:
                s += pairs[i]
                pref.append(s)
                vals.append(i)

        return [vals[bisect_right(pref, q)] for q in queries]