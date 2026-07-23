class Solution:
    def uniqueXorTriplets(self, nums: List[int]) -> int:
        n = len(nums)
        if n < 3:
            return n
        ans = 1
        while ans <= n:
            ans <<= 1
        return ans