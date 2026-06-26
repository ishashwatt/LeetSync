class Solution(object):
    def countMajoritySubarrays(self, nums, target):
        """
        :type nums: List[int]
        :type target: int
        :rtype: int
        """
        n = len(nums)
        size = 2 * n + 3
        bit = [0] * size

        def update(i):
            while i < size:
                bit[i] += 1
                i += i & -i

        def query(i):
            s = 0
            while i:
                s += bit[i]
                i -= i & -i
            return s

        offset = n + 1
        pref = 0
        ans = 0

        update(offset)

        for x in nums:
            pref += 1 if x == target else -1
            idx = pref + offset
            ans += query(idx - 1)
            update(idx)

        return ans
        