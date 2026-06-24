class Solution(object):
    def zigZagArrays(self, n, l, r):
        MOD = 10**9 + 7
        m = r - l + 1
        
        if n == 1:
            return m
        
        size = 2 * m
        T = [[0] * size for _ in range(size)]
        
        for i in range(m):
            for j in range(m):
                if j < i:
                    T[i][m+j] = 1
                elif j > i:
                    T[m+i][j] = 1
        
        def mul(A, B):
            n = len(A)
            C = [[0]*n for _ in range(n)]
            for i in range(n):
                for k in range(n):
                    if A[i][k]:
                        for j in range(n):
                            C[i][j] = (C[i][j] + A[i][k]*B[k][j]) % MOD
            return C
        
        def mpow(A, p):
            n = len(A)
            R = [[int(i==j) for j in range(n)] for i in range(n)]
            while p:
                if p & 1:
                    R = mul(R, A)
                A = mul(A, A)
                p >>= 1
            return R
        
        M = mpow(T, n-2)
        
        base = []
        for i in range(m):
            base.append(i)
        for i in range(m):
            base.append(m-1-i)
        
        ans = 0
        for i in range(size):
            for j in range(size):
                ans = (ans + M[i][j] * base[j]) % MOD
        
        return ans