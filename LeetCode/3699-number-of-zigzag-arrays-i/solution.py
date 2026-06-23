class Solution(object):
    def zigZagArrays(self, n, l, r):
        """
        :type n: int
        :type l: int
        :type r: int
        :rtype: int
        """
        MOD = 10**9 + 7
        m = r - l + 1
        
        if n == 1:
            return m
        
        up = [i for i in range(m)]
        down = [m - 1 - i for i in range(m)]
        
        for _ in range(3, n + 1):
            nu = [0] * m
            nd = [0] * m
            
            s = 0
            for i in range(m):
                nu[i] = s
                s = (s + down[i]) % MOD
            
            s = 0
            for i in range(m - 1, -1, -1):
                nd[i] = s
                s = (s + up[i]) % MOD
            
            up, down = nu, nd
        
        return (sum(up) + sum(down)) % MOD