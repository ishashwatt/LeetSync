class Solution(object):
    def g(self, a, b):
        while b:
            a, b = b, a % b
        return a

    def gcdSum(self, nums):
        """
        :type nums: List[int]
        :rtype: int
        """
        a = []
        mx = 0
        for x in nums:
            if x > mx:
                mx = x
            a.append(self.g(x, mx))

        a.sort()
        ans = 0
        n = len(a)
        for i in range(n // 2):
            ans += self.g(a[i], a[n - 1 - i])
        return ans