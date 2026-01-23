#!/usr/bin/env python3
"""
GLM-4.7 Prompt Optimization Benchmark

Benchmarks GLM-4.7 performance on prompt optimization tasks.
"""

import requests
import json
import time
import statistics
from datetime import datetime

# GLM API Configuration
GLM_BASE_URL = "https://open.bigmodel.cn/api/coding/paas/v4"
GLM_ENDPOINT = "/chat/completions"


class GLMBenchmark:
    """Benchmark runner for GLM-4.7"""

    def __init__(self, api_key):
        self.api_key = api_key
        self.url = f"{GLM_BASE_URL}{GLM_ENDPOINT}"
        self.results = []

    def optimize_prompt(self, prompt, style="picture-book"):
        """Optimize a single prompt"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        system_prompt = """你是专业的动画绘本提示词专家。

任务：将简单的绘本旁白优化成 Sora 2 视频生成提示词。

三层扩展模型：
1. Layer 1 (核心层 30%)：保持旁白的核心动作，不偏离故事主线
2. Layer 2 (丰富层 40%)：添加视觉细节、环境、氛围
3. Layer 3 (动态层 30%)：留出 AI 自然发挥空间

输出格式：
⚠️ 重要：输出必须是单一段落，绝对禁止使用任何标题、分段、项目符号或列表形式。

视频时长：10秒"""

        user_prompt = f"""请将以下绘本旁白优化成 Sora 2 视频生成提示词：

旁白原文：{prompt}

要求：
1. 保持核心动作不变
2. 添加丰富的视觉细节
3. 使用绘本/卡通风格
4. 包含摄影指导和动画风格描述
5. 适合10秒视频时长

请直接输出优化后的提示词，不要解释。"""

        body = {
            "model": "GLM-4.7",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.7,
            "top_p": 0.9,
            "max_tokens": 2000
        }

        start_time = time.time()

        try:
            response = requests.post(
                self.url,
                headers=headers,
                json=body,
                timeout=120
            )

            elapsed = time.time() - start_time

            if response.status_code == 200:
                data = response.json()

                # Extract content from reasoning_content or content
                message = data["choices"][0]["message"]
                result = message.get("reasoning_content") or message.get("content") or ""
                tokens_used = data.get("usage", {}).get("total_tokens", 0)

                return {
                    "success": True,
                    "time": elapsed,
                    "tokens": tokens_used,
                    "result": result
                }
            else:
                return {
                    "success": False,
                    "time": elapsed,
                    "error": f"HTTP {response.status_code}"
                }

        except Exception as e:
            return {
                "success": False,
                "time": time.time() - start_time,
                "error": str(e)
            }

    def run_benchmark(self, prompts):
        """Run benchmark on multiple prompts"""
        print("=" * 60)
        print("GLM-4.7 Prompt Optimization Benchmark")
        print("=" * 60)
        print(f"\n📊 Benchmark Configuration:")
        print(f"  • Prompts to test: {len(prompts)}")
        print(f"  • Timeout per request: 120 seconds")
        print(f"  • Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        total_tokens = 0
        success_count = 0
        times = []

        for i, prompt in enumerate(prompts, 1):
            print(f"\n{'─' * 60}")
            print(f"Test {i}/{len(prompts)}")
            print(f"{'─' * 60}")
            print(f"📝 Prompt: {prompt[:60]}...")

            result = self.optimize_prompt(prompt)

            if result["success"]:
                success_count += 1
                total_tokens += result["tokens"]
                times.append(result["time"])

                print(f"✅ Success")
                print(f"  • Time: {result['time']:.2f} seconds")
                print(f"  • Tokens: {result['tokens']}")

                # Show preview of result
                result_preview = result['result'][:100]
                print(f"  • Result: {result_preview}...")
            else:
                print(f"❌ Failed: {result.get('error', 'Unknown error')}")

        # Print summary
        self.print_summary(len(prompts), success_count, total_tokens, times)

    def print_summary(self, total, success, total_tokens, times):
        """Print benchmark summary"""
        print("\n" + "=" * 60)
        print("📊 BENCHMARK SUMMARY")
        print("=" * 60)

        print(f"\n📈 Success Rate:")
        success_rate = (success / total * 100) if total > 0 else 0
        print(f"  • Passed: {success}/{total} ({success_rate:.1f}%)")

        if times:
            print(f"\n⏱️  Response Time Statistics:")
            print(f"  • Min: {min(times):.2f} seconds")
            print(f"  • Max: {max(times):.2f} seconds")
            print(f"  • Average: {statistics.mean(times):.2f} seconds")
            print(f"  • Median: {statistics.median(times):.2f} seconds")

        print(f"\n💰 Token Usage:")
        avg_tokens = total_tokens / success if success > 0 else 0
        print(f"  • Total: {total_tokens} tokens")
        print(f"  • Average: {avg_tokens:.0f} tokens/request")

        print("\n" + "=" * 60)


def main():
    """Main benchmark runner"""
    import os

    # Get API key
    api_key = os.environ.get("GLM_CODING_API_KEY")
    if not api_key:
        print("⚠️  GLM_CODING_API_KEY environment variable not set")
        api_key = input("Please enter your GLM Coding Plan API key: ").strip()

    if not api_key:
        print("❌ Error: API key is required")
        return

    # Test prompts (海鹦鹉故事 - Puffin Story)
    prompts = [
        "看！这是海鹦鹉 @b2e75200f.pennypuf ，它住在冰冰凉凉的大海边。",
        "@b2e75200f.pennypuf 它的嘴巴可真特别呀！五颜六色的，像不像一支彩色的铅笔？",
        "@b2e75200f.pennypuf 小小的身体，穿着黑色的外套，白色的肚皮，真漂亮！",
        "在陆地上，@b2e75200f.pennypuf 海鹦鹉摇摇摆摆地走，像个可爱的小胖墩。",
        "“扑棱棱！”@b2e75200f.pennypuf 它的翅膀小小的，扇得可快了，能飞到天上！",
        "@b2e75200f.pennypuf "噗通！"它还会跳进水里，变成游泳小能手。",
        "@@b2e75200f.pennypuf 它在水里抓小鱼吃，真好吃！",
        "@b2e75200f.pennypuf 海鹦鹉喜欢和它的朋友们一起，在海边的悬崖上玩耍。",
        "@b2e75200f.pennypuf 它对你眨眨眼，好像在说："你好呀，小！朋！友！"",
        "@b2e75200f.pennypuf 海鹦鹉真可爱，对不对？我们下次再见咯！"
    ]

    # Run benchmark
    benchmark = GLMBenchmark(api_key)
    benchmark.run_benchmark(prompts)


if __name__ == "__main__":
    main()
