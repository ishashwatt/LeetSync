class Solution(object):
    def numberOfSubstrings(self, s):
        """
        :type s: str
        :rtype: int
        """
        c = {'a': 0, 'b': 0, 'c': 0}
        l = ans = 0

        for r in range(len(s)):
            c[s[r]] += 1
            while c['a'] and c['b'] and c['c']:
                ans += len(s) - r
                c[s[l]] -= 1
                l += 1

        return ans