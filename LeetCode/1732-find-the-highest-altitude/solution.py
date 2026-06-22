class Solution(object):
    def largestAltitude(self, gain):
        """
        :type gain: List[int]
        :rtype: int
        """
        current = 0
        highest = 0

        for i in gain:
            current = current + i

            highest = max(highest, current)

        return highest