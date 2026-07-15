import os
from groq import Groq
from dotenv import load_dotenv, find_dotenv
from services.db import supabase

load_dotenv(find_dotenv(), override=True)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()

if not GROQ_API_KEY or GROQ_API_KEY == "your_groq_api_key_here":
    print("Warning: No valid GROQ_API_KEY found in environment variables.")

system_instruction = """
You are a helpful, professional, and friendly virtual assistant for the Teethtalk Dental Clinic Pasig (also known as the Dental Assistant & Monitoring System - DAMS).
Your primary goal is to answer patient inquiries clearly and concisely.
You can help with general questions regarding scheduling, services offered, general post-treatment advice, and clinic policies.
Do not provide definitive medical diagnoses. If a user asks about a specific pain or condition, advise them to schedule an appointment with a dentist.
Maintain a polite and reassuring tone.

CRITICAL INSTRUCTIONS:
1. NEVER use markdown formatting like asterisks (* or **) for bolding or bullet points. Reply in clean, readable plain text.
2. If a patient asks about fees or costs, strictly quote the exact prices from the clinic fee list provided below. Do not give evasive answers about costs varying; just state the prices we have on file clearly and concisely.
"""

def generate_response(prompt: str, history: list = None) -> str:
    """
    Generates a response using the Groq Llama 3 model based on the user's prompt and optional history.
    """
    if not GROQ_API_KEY or GROQ_API_KEY == "your_groq_api_key_here":
        return "I'm sorry, the clinic's AI system is currently offline (Missing API Key). Please contact the clinic directly!"

    # Dynamically inject the latest clinic fees so Groq can answer billing questions accurately
    try:
        res = supabase.table("billing_services").select("service_name, cost").execute()
        if res.data:
            fees_text = "\nHere is the current list of clinic fees to answer patient questions:\n"
            for item in res.data:
                fees_text += f"- {item['service_name']}: PHP {item['cost']}\n"
            
            dynamic_instruction = system_instruction + "\n" + fees_text
        else:
            dynamic_instruction = system_instruction
    except Exception as e:
        print(f"Failed to fetch fees for chatbot context: {e}")
        dynamic_instruction = system_instruction

    messages = [
        {"role": "system", "content": dynamic_instruction}
    ]

    if history:
        for msg in history:
            user_msg = msg.get("message_prompt", "")
            ai_msg = msg.get("ai_response", "")
            if user_msg:
                messages.append({"role": "user", "content": user_msg})
            if ai_msg:
                messages.append({"role": "assistant", "content": ai_msg})
    
    messages.append({"role": "user", "content": prompt})
    
    try:
        client = Groq(api_key=GROQ_API_KEY)
        
        chat_completion = client.chat.completions.create(
            messages=messages,
            model="llama-3.1-8b-instant",
            temperature=0.7,
            max_tokens=1024,
            top_p=1,
        )
        
        return chat_completion.choices[0].message.content
        
    except Exception as e:
        print(f"Groq API Error: {e}")
        return "I'm sorry, my AI services have temporarily reached their limit. Please try again in a minute, or contact the clinic directly!"
