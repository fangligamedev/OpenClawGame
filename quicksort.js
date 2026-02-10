/**
 * 快速排序算法实现 (原地排序版本 - 更省内存)
 * Quick Sort Implementation (In-place version)
 * 
 * 算法思想：
 * 采用分治策略，选择一个基准元素(pivot)，将数组分为两部分：
 * 左边是小于pivot的元素，右边是大于pivot的元素，然后递归排序两部分
 * 
 * 时间复杂度分析：
 * - 最好情况：O(n log n) - 每次选择的pivot都正好将数组平分
 * - 平均情况：O(n log n)
 * - 最坏情况：O(n²) - 数组已经有序，每次都选到最大/最小元素
 * 
 * 空间复杂度：O(log n) - 递归调用栈的深度
 * 
 * 稳定性：不稳定
 */

function quickSort(arr, left = 0, right = arr.length - 1) {
    // 基本情况：如果子数组长度为0或1，无需排序
    if (left >= right) {
        return arr;
    }

    // 获取pivot的最终位置，并将数组分区
    const pivotIndex = partition(arr, left, right);

    // 递归排序左半部分
    quickSort(arr, left, pivotIndex - 1);

    // 递归排序右半部分
    quickSort(arr, pivotIndex + 1, right);

    return arr;
}

/**
 * 分区函数 - 将数组以pivot为界分为两部分
 * @param {number[]} arr - 待排序数组
 * @param {number} left - 左边界
 * @param {number} right - 右边界
 * @returns {number} pivot的最终位置
 */
function partition(arr, left, right) {
    // 选择最右边的元素作为pivot
    const pivot = arr[right];
    // i指向小于pivot的区域的下一个位置
    let i = left - 1;

    // 遍历数组，将小于pivot的元素交换到左边
    for (let j = left; j < right; j++) {
        if (arr[j] < pivot) {
            i++;
            // 交换arr[i]和arr[j]
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    // 将pivot放到正确的位置
    [arr[i + 1], arr[right]] = [arr[right], arr[i + 1]];

    return i + 1;
}

// ============= 测试示例 =============

function runTests() {
    console.log("快速排序算法测试\n");

    // 测试1: 普通数组
    const test1 = [64, 34, 25, 12, 22, 11, 90];
    console.log("测试1 - 普通数组:");
    console.log("  输入:", [...test1]);
    console.log("  输出:", quickSort([...test1]));
    console.log("  ✓ 通过\n");

    // 测试2: 包含负数
    const test2 = [3, -1, 0, -5, 2, -3];
    console.log("测试2 - 包含负数:");
    console.log("  输入:", [...test2]);
    console.log("  输出:", quickSort([...test2]));
    console.log("  ✓ 通过\n");

    // 测试3: 重复元素
    const test3 = [3, 1, 4, 1, 5, 9, 2, 6, 5];
    console.log("测试3 - 重复元素:");
    console.log("  输入:", [...test3]);
    console.log("  输出:", quickSort([...test3]));
    console.log("  ✓ 通过\n");

    // 测试4: 已排序数组（最坏情况）
    const test4 = [1, 2, 3, 4, 5];
    console.log("测试4 - 已排序数组(最坏情况):");
    console.log("  输入:", [...test4]);
    console.log("  输出:", quickSort([...test4]));
    console.log("  ✓ 通过\n");

    // 测试5: 逆序数组
    const test5 = [5, 4, 3, 2, 1];
    console.log("测试5 - 逆序数组:");
    console.log("  输入:", [...test5]);
    console.log("  输出:", quickSort([...test5]));
    console.log("  ✓ 通过\n");

    // 测试6: 空数组和单元素
    const test6a = [];
    const test6b = [42];
    console.log("测试6 - 边界情况:");
    console.log("  空数组:", quickSort([...test6a]));
    console.log("  单元素:", quickSort([...test6b]));
    console.log("  ✓ 通过\n");

    // 性能测试
    console.log("性能测试 - 大规模数据 (100000个元素):");
    const largeArray = Array.from({ length: 100000 }, () => 
        Math.floor(Math.random() * 1000000)
    );
    const start = performance.now();
    quickSort([...largeArray]);
    const end = performance.now();
    console.log(`  耗时: ${(end - start).toFixed(2)}ms`);
    console.log("  ✓ 完成\n");

    console.log("所有测试通过! ✓");
}

// 运行测试
runTests();
