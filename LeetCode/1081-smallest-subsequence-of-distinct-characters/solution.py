class Solution(object):
    def smallestSubsequence(self, s):
        last={}
        for i,c in enumerate(s):last[c]=i
        st=[];v=set()
        for i,c in enumerate(s):
            if c in v:continue
            while st and st[-1]>c and last[st[-1]]>i:v.remove(st.pop())
            st.append(c);v.add(c)
        return ''.join(st)
        