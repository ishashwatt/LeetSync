import java.util.PriorityQueue;

class Solution {
    public int trapRainWater(int[][] heightMap) {
        if (heightMap == null || heightMap.length <= 2 || heightMap[0].length <= 2)
            return 0;
        int m = heightMap.length;
        int n = heightMap[0].length;
        boolean[][] visited = new boolean[m][n];
        PriorityQueue<Cell> pq = new PriorityQueue<>((a, b) -> a.height - b.height);
        for (int i = 0; i < m; i++) {
            pq.offer(new Cell(i, 0, heightMap[i][0]));
            pq.offer(new Cell(i, n - 1, heightMap[i][n - 1]));
            visited[i][0] = true;
            visited[i][n - 1] = true;
        }
        for (int j = 1; j < n - 1; j++) {
            pq.offer(new Cell(0, j, heightMap[0][j]));
            pq.offer(new Cell(m - 1, j, heightMap[m - 1][j]));
            visited[0][j] = true;
            visited[m - 1][j] = true;
        }

        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        int waterTrapped = 0;

        while (!pq.isEmpty()) {
            Cell cell = pq.poll();

            for (int[] dir : dirs) {
                int row = cell.row + dir[0];
                int col = cell.col + dir[1];

                if (row >= 0 && row < m && col >= 0 && col < n && !visited[row][col]) {
                    visited[row][col] = true;
                    waterTrapped += Math.max(0, cell.height - heightMap[row][col]);
                    pq.offer(new Cell(row, col, Math.max(heightMap[row][col], cell.height)));
                }
            }
        }

        return waterTrapped;
    }

    class Cell {
        int row;
        int col;
        int height;

        public Cell(int row, int col, int height) {
            this.row = row;
            this.col = col;
            this.height = height;
        }
    }
}