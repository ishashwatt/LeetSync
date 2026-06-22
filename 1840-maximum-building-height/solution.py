class Solution(object):
    def maxBuilding(self, n, restrictions):
        """
        :type n: int
        :type restrictions: List[List[int]]
        :rtype: int
        """
        restrictions.append([1, 0])
        restrictions.sort()

        if restrictions[-1][0] != n:
            restrictions.append([n, n-1])

        # left to right
        for i in range(1, len(restrictions)):
            restrictions[i][1] = min(
                restrictions[i][1],
                restrictions[i-1][1] + restrictions[i][0] - restrictions[i-1][0]
            )

        # right to left
        for i in range(len(restrictions)-2, -1, -1):
            restrictions[i][1] = min(
                restrictions[i][1],
                restrictions[i+1][1] + restrictions[i+1][0] - restrictions[i][0]
            )

        ans = 0

        for i in range(1, len(restrictions)):
            d = restrictions[i][0] - restrictions[i-1][0]
            h1 = restrictions[i-1][1]
            h2 = restrictions[i][1]

            ans = max(ans, max(h1, h2) + (d - abs(h1-h2)) // 2)

        return ans