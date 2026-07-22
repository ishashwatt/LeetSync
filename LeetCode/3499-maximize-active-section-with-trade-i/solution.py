class Solution(object):
    def maxActiveSectionsAfterTrade(self, s):
        ans = mx = i = 0
        pre = float("-inf")

        while i < len(s):
            j = i
            while j < len(s) and s[j] == s[i]:
                j += 1
            cnt = j - i
            if s[i] == '1':
                ans += cnt
            else:
                mx = max(mx, pre + cnt)
                pre = cnt
            i = j

        return ans + mx