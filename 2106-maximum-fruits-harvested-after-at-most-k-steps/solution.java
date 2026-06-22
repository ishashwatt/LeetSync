import java.util.*;

public class Solution {

    public int maxTotalFruits(int[][] fruits, int startPos, int k) {
        int n = fruits.length;
        int[] positions = new int[n];
        int[] amounts = new int[n];

        for (int i = 0; i < n; i++) {
            positions[i] = fruits[i][0];
            amounts[i] = fruits[i][1];
        }

        int maxFruits = 0;
        int left = 0;
        int total = 0;

        for (int right = 0; right < n; right++) {
            total += amounts[right];

            // Move left bound while window exceeds k steps
            while (left <= right && !isReachable(positions[left], positions[right], startPos, k)) {
                total -= amounts[left];
                left++;
            }

            maxFruits = Math.max(maxFruits, total);
        }

        return maxFruits;
    }

    // Check if we can reach both left and right ends of the window within k steps
    private boolean isReachable(int left, int right, int start, int k) {
        int toLeftThenRight = Math.abs(start - left) + (right - left);
        int toRightThenLeft = Math.abs(start - right) + (right - left);
        return Math.min(toLeftThenRight, toRightThenLeft) <= k;
    }
}