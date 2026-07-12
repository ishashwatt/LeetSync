class Solution(object):
    def pathsWithMaxScore(self, board):
        MOD=10**9+7
        n=len(board)
        dp=[[-1]*n for _ in range(n)]
        cnt=[[0]*n for _ in range(n)]
        dp[n-1][n-1]=0
        cnt[n-1][n-1]=1

        for i in range(n-1,-1,-1):
            for j in range(n-1,-1,-1):
                if board[i][j]=='X' or (i==n-1 and j==n-1):
                    continue
                best=-1
                ways=0
                for x,y in ((i+1,j),(i,j+1),(i+1,j+1)):
                    if x<n and y<n and dp[x][y]!=-1:
                        if dp[x][y]>best:
                            best=dp[x][y]
                            ways=cnt[x][y]
                        elif dp[x][y]==best:
                            ways=(ways+cnt[x][y])%MOD
                if best==-1:
                    continue
                dp[i][j]=best
                if board[i][j].isdigit():
                    dp[i][j]+=int(board[i][j])
                cnt[i][j]=ways

        return [0,0] if dp[0][0]==-1 else [dp[0][0],cnt[0][0]]