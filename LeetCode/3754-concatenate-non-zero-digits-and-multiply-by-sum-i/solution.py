class Solution(object):
    def sumAndMultiply(self, n):
        """
        :type n: int
        :rtype: int
        """
        s = ''.join(c for c in str(n) if c != '0')
        x = int(s) if s else 0
        return x * sum(map(int, s))