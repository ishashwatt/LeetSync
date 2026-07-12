class Solution(object):
    def arrayRankTransform(self, arr):
        d = {v:i+1 for i,v in enumerate(sorted(set(arr)))}
        return [d[x] for x in arr]