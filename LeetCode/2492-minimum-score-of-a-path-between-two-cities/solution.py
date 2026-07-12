class Solution(object):
    def minScore(self, n, roads):
        """
        :type n: int
        :type roads: List[List[int]]
        :rtype: int
        """
        g=[[] for _ in range(n+1)]
        for a,b,d in roads:
            g[a].append((b,d))
            g[b].append((a,d))

        ans=float('inf')
        vis=[0]*(n+1)
        st=[1]
        vis[1]=1

        while st:
            u=st.pop()
            for v,d in g[u]:
                ans=min(ans,d)
                if not vis[v]:
                    vis[v]=1
                    st.append(v)

        return ans