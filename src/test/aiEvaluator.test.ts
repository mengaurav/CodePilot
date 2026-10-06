import { describe, it, expect } from 'vitest';
import { evaluateWithOfflineMock, evaluateCodeAnalysis } from '../services/aiEvaluator';

describe('aiEvaluator service', () => {
  it('correctly evaluates Python Two Sum algorithm using smart offline evaluator', async () => {
    const code = `def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`;

    const analysis = {
      problemStatement: 'Find two indices in array that add up to target',
      inputOutput: 'Input: nums list and target number, Output: list of two indices',
      algorithmPurpose: 'Use dictionary hash map for O(1) complement lookup in one pass',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
      edgeCases: 'empty array, duplicate numbers, negative values',
    };

    const result = await evaluateWithOfflineMock(code, analysis, 'python');

    expect(result).toBeDefined();
    expect(result.overallScore).toBeGreaterThanOrEqual(60);
    expect(result.codeUnderstanding.problemStatement.correct).toBe(true);
    expect(result.complexityAnalysis.timeComplexity.correct).toBe(true);
    expect(result.complexityAnalysis.spaceComplexity.correct).toBe(true);
    expect(result.socraticQuestions.length).toBeGreaterThan(0);
    expect(result.optimizationChallenge.challenge).toBeDefined();
  });

  it('orchestrator safely falls back to offline mode when no API keys are present (Java Binary Search)', async () => {
    const result = await evaluateCodeAnalysis(
      `public class Solution {
    public int binarySearch(int[] arr, int target) {
        int low = 0, high = arr.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (arr[mid] == target) return mid;
            else if (arr[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }
}`,
      {
        problemStatement: 'Search for target in sorted array',
        inputOutput: 'Array, target -> index',
        algorithmPurpose: 'Divide and conquer',
        timeComplexity: 'O(log n)',
        spaceComplexity: 'O(1)',
        edgeCases: 'empty array, not found',
      },
      { provider: 'offline' },
      'java'
    );

    expect(result.source).toBe('offline');
    expect(result.evaluation.overallScore).toBeGreaterThan(0);
  });
});
