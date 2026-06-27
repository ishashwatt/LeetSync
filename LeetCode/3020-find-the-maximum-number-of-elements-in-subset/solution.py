class Solution(object):
    def maximumLength(self, nums):
        """
        :type nums: List[int]
        :rtype: int
        """
        c = {}
        for x in nums:
            c[x] = c.get(x, 0) + 1

        ans = 1

        if 1 in c:
            ans = c[1] if c[1] % 2 else c[1] - 1

        for x in c:
            if x == 1:
                continue
            cur = x
            t = 0
            while c.get(cur, 0) >= 2:
                t += 2
                if cur * cur not in c:
                    break
                cur *= cur
            if c.get(cur, 0) == 1:
                ans = max(ans, t + 1)
            else:
                ans = max(ans, max(1, t - 1))

        return ans