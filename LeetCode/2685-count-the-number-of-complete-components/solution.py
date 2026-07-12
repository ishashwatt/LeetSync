class Solution(object):
    def countCompleteComponents(self, n, edges):
        g=[[] for _ in range(n)]
        for u,v in edges:
            g[u].append(v)
            g[v].append(u)
        vis=[0]*n

        def dfs(u):
            vis[u]=1
            c,e=1,len(g[u])
            for v in g[u]:
                if not vis[v]:
                    x,y=dfs(v)
                    c+=x
                    e+=y
            return c,e

        ans=0
        for i in range(n):
            if not vis[i]:
                c,e=dfs(i)
                if e==c*(c-1):
                    ans+=1
        return ans