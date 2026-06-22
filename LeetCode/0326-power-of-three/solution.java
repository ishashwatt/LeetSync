public class Solution {
    public boolean isPowerOfThree(int n) {
        // Base case: 1 is 3^0
        if (n <= 0) return false;

        // Keep dividing n by 3 while it's divisible
        while (n % 3 == 0) {
            n /= 3;
        }

        // If we end up with 1, it's a power of 3
        return n == 1;
    }
}
