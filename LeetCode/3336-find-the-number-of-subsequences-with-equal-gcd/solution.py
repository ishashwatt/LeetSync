class Solution(object):
    def subsequencePairCount(self, nums):
        MOD = 10 ** 9 + 7

        def gcd(a, b):
            while b:
                a, b = b, a % b
            return a

        dp = {(0, 0): 1}

        for x in nums:
            ndp = dp.copy()
            for (g1, g2), cnt in dp.items():
                ng1 = x if g1 == 0 else gcd(g1, x)
                ng2 = x if g2 == 0 else gcd(g2, x)

                ndp[(ng1, g2)] = (ndp.get((ng1, g2), 0) + cnt) % MOD
                ndp[(g1, ng2)] = (ndp.get((g1, ng2), 0) + cnt) % MOD

            dp = ndp

        ans = 0
        for (g1, g2), cnt in dp.items():
            if g1 == g2 and g1:
                ans = (ans + cnt) % MOD

        return ans