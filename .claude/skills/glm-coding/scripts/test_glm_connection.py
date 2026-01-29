#!/usr/bin/env python3
"""
GLM-4.7 Coding Plan API Connection Test

Tests GLM API connectivity and response format handling.
"""

import requests
import json
import sys
import time

# GLM API Configuration
GLM_BASE_URL = "https://open.bigmodel.cn/api/coding/paas/v4"
GLM_ENDPOINT = "/chat/completions"

def test_connection(api_key):
    """Test basic connection to GLM API"""
    print("=" * 60)
    print("GLM-4.7 Coding Plan Connection Test")
    print("=" * 60)

    url = f"{GLM_BASE_URL}{GLM_ENDPOINT}"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    body = {
        "model": "GLM-4.7",
        "messages": [
            {
                "role": "user",
                "content": "连接测试，请回复'连接成功'"
            }
        ],
        "max_tokens": 100
    }

    print(f"\n📡 Testing endpoint: {url}")
    print(f"🔑 API Key: {api_key[:20]}...{api_key[-10:]}")
    print(f"📤 Request: {json.dumps(body, indent=2, ensure_ascii=False)}")

    start_time = time.time()

    try:
        print("\n⏳ Sending request...")
        response = requests.post(url, headers=headers, json=body, timeout=120)

        elapsed = time.time() - start_time
        print(f"✅ Response received in {elapsed:.2f} seconds")

        print(f"\n📊 Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"\n📦 Response Structure:")
            print(json.dumps(data, indent=2, ensure_ascii=False))

            # ⚠️ Critical: Check response format
            if "choices" in data and len(data["choices"]) > 0:
                message = data["choices"][0]["message"]

                print("\n" + "=" * 60)
                print("🔍 Response Format Analysis")
                print("=" * 60)

                # Check which field has content
                content = message.get("content", "")
                reasoning_content = message.get("reasoning_content", "")

                print(f"  • message.content: '{content}'")
                print(f"  • message.reasoning_content: '{reasoning_content[:50]}...'" if reasoning_content else "  • message.reasoning_content: (empty)")

                # Determine which field to use
                if reasoning_content:
                    print(f"\n✅ GLM Format Detected: Content is in 'reasoning_content' field")
                    result = reasoning_content
                elif content:
                    print(f"\n✅ Standard OpenAI Format: Content is in 'content' field")
                    result = content
                else:
                    print(f"\n❌ Error: Both fields are empty!")
                    return False

                print(f"\n📝 Extracted Content: {result}")

                # Token usage
                if "usage" in data:
                    usage = data["usage"]
                    print(f"\n💰 Token Usage:")
                    print(f"  • Prompt tokens: {usage.get('prompt_tokens', 0)}")
                    print(f"  • Completion tokens: {usage.get('completion_tokens', 0)}")
                    print(f"  • Total tokens: {usage.get('total_tokens', 0)}")

                print("\n" + "=" * 60)
                print("✅ CONNECTION TEST PASSED")
                print("=" * 60)
                return True
            else:
                print("\n❌ Error: Unexpected response format")
                print(f"Response keys: {list(data.keys())}")
                return False
        else:
            print(f"\n❌ Error: HTTP {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except requests.exceptions.Timeout:
        print(f"\n⏱️ Error: Request timed out after {time.time() - start_time:.2f} seconds")
        print("💡 Tip: GLM-4.7 can take up to 60 seconds to respond")
        return False

    except requests.exceptions.RequestException as e:
        print(f"\n❌ Error: {e}")
        return False


def test_optimization(api_key, prompt, style="picture-book"):
    """Test prompt optimization"""
    print("\n" + "=" * 60)
    print("GLM-4.7 Prompt Optimization Test")
    print("=" * 60)

    url = f"{GLM_BASE_URL}{GLM_ENDPOINT}"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # Build system prompt for picture-book style
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

    print(f"\n📝 Input Prompt: {prompt}")
    print(f"🎨 Style: {style}")

    start_time = time.time()

    try:
        print("\n⏳ Sending optimization request...")
        response = requests.post(url, headers=headers, json=body, timeout=120)

        elapsed = time.time() - start_time
        print(f"✅ Response received in {elapsed:.2f} seconds")

        if response.status_code == 200:
            data = response.json()

            # Extract content from reasoning_content or content
            message = data["choices"][0]["message"]
            result = message.get("reasoning_content") or message.get("content") or ""

            print(f"\n💰 Tokens Used: {data.get('usage', {}).get('total_tokens', 0)}")
            print(f"\n✨ Optimized Result:")
            print("-" * 60)
            print(result)
            print("-" * 60)

            print("\n✅ OPTIMIZATION TEST PASSED")
            return True
        else:
            print(f"\n❌ Error: HTTP {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except requests.exceptions.Timeout:
        print(f"\n⏱️ Error: Request timed out after {time.time() - start_time:.2f} seconds")
        return False

    except requests.exceptions.RequestException as e:
        print(f"\n❌ Error: {e}")
        return False


def main():
    """Main test runner"""
    import os

    # Get API key from environment or prompt
    api_key = os.environ.get("GLM_CODING_API_KEY")

    if not api_key:
        print("⚠️  GLM_CODING_API_KEY environment variable not set")
        print("Please enter your GLM Coding Plan API key:")
        api_key = input("> ").strip()

    if not api_key:
        print("❌ Error: API key is required")
        sys.exit(1)

    # Run tests
    print("\n" + "=" * 60)
    print("🧪 GLM-4.7 Coding Plan Test Suite")
    print("=" * 60)

    # Test 1: Connection
    test1_passed = test_connection(api_key)

    # Test 2: Optimization (if connection test passed)
    if test1_passed:
        test_prompt = "一只可爱的海鹦鹉在海边玩耍"
        test_optimization(api_key, test_prompt)
    else:
        print("\n⚠️  Skipping optimization test (connection test failed)")


if __name__ == "__main__":
    main()
