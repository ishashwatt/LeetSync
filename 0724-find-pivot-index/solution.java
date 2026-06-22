class Solution {
    // Approach : Two-pass solution (Original)
    public int pivotIndex(int[] nums) {
        int totalSum = 0;
        
        // Calculate total sum of array
        for (int num : nums) {
            totalSum += num;
        }
        
        int leftSum = 0;
        
        // Iterate through array to find pivot index
        for (int i = 0; i < nums.length; i++) {
            // Right sum = total - leftSum - current element
            int rightSum = totalSum - leftSum - nums[i];
            
            // Check if left sum equals right sum
            if (leftSum == rightSum) {
                return i;
            }
            
            // Update left sum for next iteration
            leftSum += nums[i];
        }
        
        // No pivot index found
        return -1;
    }
}