import os
import time
from google import genai
from google.genai import types
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

# Read multiple keys separated by commas
keys_str = os.environ.get("GEMINI_API_KEYS", "")
if not keys_str:
    keys_str = os.environ.get("GEMINI_API_KEY", "")

API_KEYS = [k.strip() for k in keys_str.split(",") if k.strip() and k.strip() != "your_gemini_api_key_here"]

if not API_KEYS:
    print("Warning: No GEMINI API Keys found in environment variables.")

system_instruction = """
You are a helpful, professional, and friendly virtual assistant for the Teethtalk Dental Clinic Pasig (also known as the Dental Assistant & Monitoring System - DAMS).
Your primary goal is to answer patient inquiries clearly and concisely.
You can help with general questions regarding scheduling, services offered, general post-treatment advice, and clinic policies.
Do not provide definitive medical diagnoses. If a user asks about a specific pain or condition, advise them to schedule an appointment with a dentist.
Maintain a polite and reassuring tone.
"""

FALLBACK_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash'
]


def generate_response(prompt: str, history: list = None) -> str:
    """
    Generates a response using the Gemini model based on the user's prompt and optional history.
    """
    last_error = None
    
    contents = []
    if history:
        for msg in history:
            contents.append(types.Content(role="user", parts=[types.Part.from_text(text=msg.get("message_prompt", ""))]))
            contents.append(types.Content(role="model", parts=[types.Part.from_text(text=msg.get("ai_response", ""))]))
    
    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=prompt)]))
    
    for model_name in FALLBACK_MODELS:
        for api_key in API_KEYS:
            try:
                # Create a fresh client for this specific key
                client = genai.Client(api_key=api_key)
                
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.7,
                        top_p=0.95,
                        top_k=64,
                        max_output_tokens=8192,
                    )
                )
                return response.text
            except Exception as e:
                error_str = str(e)
                # If it's a quota/rate-limit error, try the next API key
                if "429" in error_str or "quota" in error_str.lower():
                    masked_key = f"...{api_key[-4:]}" if len(api_key) > 4 else "unknown"
                    print(f"Model {model_name} hit limit on key {masked_key}. Trying next key...")
                    last_error = e
                    continue # Next key
                else:
                    # Some other error (like model not found), break key loop and try next model
                    print(f"Error with model {model_name}: {e}")
                    last_error = e
                    break
    print(f"All models failed. Last error: {last_error}")
    return "I'm sorry, my AI services have temporarily reached their limit. Please try again in a minute, or contact the clinic directly!"
