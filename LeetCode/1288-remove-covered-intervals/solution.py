class Solution(object):
    def removeCoveredIntervals(self, intervals):

        intervals.sort(key=lambda x: (x[0], -x[1]))
        ans = 0
        end = 0

        for s, e in intervals:
            if e > end:
                ans += 1
                end = e
        return ans