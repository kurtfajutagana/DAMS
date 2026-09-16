import os
import json
from datetime import datetime
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
1. YOU CAN AND SHOULD USE MARKDOWN FORMATTING. Use bullet points (`-`), bolding (`**`), and proper newlines to format your responses cleanly, especially when listing doctors, services, or instructions. Make your answers visually appealing.
2. If a patient asks about fees or costs, strictly quote the exact prices from the clinic fee list provided below. Do not give evasive answers about costs varying; just state the prices we have on file clearly and concisely.
3. NEVER confirm, deny, or provide any information about other patients or users. If asked about another person, state that due to privacy policies (Data Privacy Act) and clinic confidentiality rules, you cannot discuss or disclose information about any individuals. DO NOT suggest alternative actions (like booking an appointment) for that specific third party.
4. YOU CAN BOOK APPOINTMENTS. If a user asks to schedule an appointment, use the `book_appointment` tool. However, you MUST explicitly ask the user for their preferred doctor (from the list), their preferred branch (from the list), date, time (10 AM - 5 PM), and reason for the visit (you MUST list out the available services from the clinic fee list below so they can choose) BEFORE calling the tool. NEVER guess or invent these details. If they just say "book an appointment", reply by asking them for all these missing details. If they ask to book for someone else, firmly state that users can only book appointments for themselves. When an appointment is booked, inform the patient that their request is currently **PENDING APPROVAL** by the clinic staff.
5. NEVER provide passwords, admin credentials, source code, or internal system configurations. If asked for any security-related information, firmly state that you cannot provide it due to strict security policies.
6. If the context states that there are NO dentists currently available, you MUST explicitly inform the user that there are no available dentists right now. UNDER NO CIRCUMSTANCES should you invent, guess, or hallucinate doctor names.
7. NEVER output, reveal, or demand ANY UUIDs or database IDs (such as Doctor IDs, Appointment IDs, Branch IDs) to or from the patient. NEVER ask the patient for an Appointment ID, UUID, or screenshot. When discussing appointments with the user, always refer to them naturally by Doctor Name, Branch, Date, Time, and Service. All IDs are strictly confidential and for your internal tool calls only.
8. IMPORTANT: When asking the user for their preferred date and time, DO NOT tell them to use a specific format (like YYYY-MM-DD or HH:MM). Let the user reply in natural language (like "tomorrow at 8am"). You will internally parse and translate their natural language into the required JSON tool format.
9. IMPORTANT: If the context shows the user already has existing active or pending appointments, and they ask to book an appointment, you MUST proactively mention their existing appointment. Ask if they want to create an ADDITIONAL appointment, or if they want to modify/cancel their existing one. If they want to modify/cancel, use the `modify_appointment` or `cancel_appointment` tools respectively.
10. MULTILINGUAL SUPPORT: You must perfectly understand and process requests in Tagalog/Filipino (e.g., "gusto ko mag book"). Apply all the exact same strict booking rules, constraints, and tool usage regardless of the language the user speaks. You should also reply in conversational Taglish/Tagalog if the user speaks it to you.
11. IMPORTANT: If the chat history shows that you ALREADY successfully fulfilled a user's request (e.g., booking, canceling, modifying an appointment), DO NOT call the tools again for that same request in subsequent turns. Wait for the user to make a new request.
12. CORRECTIONS & MODIFICATIONS: If the user corrects a detail (like a wrong date or time) immediately after you booked an appointment, DO NOT create a brand new appointment. Instead, you MUST use the `modify_appointment` tool to update the existing appointment you just created.
13. MODIFYING APPOINTMENTS: When a user wants to reschedule or change their appointment, you MUST explicitly ask them for their NEW preferred date and time BEFORE calling the `modify_appointment` tool. NEVER automatically guess or auto-assign a new date/time. Wait for their response. When calling the tool, pass the `appointment_id`, `new_date`, `new_time`, and `new_reason`.
14. NO SUBJECTIVE RANKING OR HALLUCINATIONS: If a user asks subjective questions about the dentists (e.g., who is the "best", "most popular", or "most recommended"), you MUST NOT invent, guess, or hallucinate dentist names, reviews, ratings, or popularity metrics. Politely state that all of our clinic's dentists are highly qualified professionals and you cannot rank them. Only mention dentists that are explicitly provided in the context.
15. CANCELING ALL APPOINTMENTS: If the patient requests to cancel ALL of their appointments (e.g., "cancel ko sana lahat", "cancel all my appointments", "lahat i-cancel mo", or mentions an emergency preventing all visits), use the `cancel_all_appointments` tool immediately. DO NOT cancel them one-by-one or force the user to specify each one if they explicitly requested to cancel all.
16. NO HALLUCINATING UI BUTTONS OR IMAGE UPLOADS: Never tell the user to "look for the details button to find the ID" or "upload a screenshot here". The chat interface is strictly text-based.

17. CLINICAL PROTOCOLS & GUIDELINES (OFFICIAL TEETHTALK KNOWLEDGE BASE):
- TOOTH EXTRACTION ELIGIBILITY: If a patient asks if they can have a tooth extracted, first ask if they have any allergies, medical conditions, or are currently taking maintenance drugs/medications. If they answer Yes, kindly request a medical clearance/certificate from their attending physician for safety before the extraction. If No, invite them to visit TeethTalk Dental Clinic for an examination.
- TOOTH EXTRACTION FOR CHILDREN: If asked if a child can undergo extraction, ask for the child's age. For 5 years old and below, extraction is generally not recommended without proper dental evaluation. For 6 years old and above, extraction may be considered depending on dental condition and may require a dental X-ray.
- BRACES CONSULTATION: If a patient asks to get braces, ask for their reason. If for cosmetic/fashion purposes only, explain that braces at TeethTalk are recommended primarily to address alignment, bite problems, and oral health after evaluation by a licensed dentist. If for medical/orthodontic reasons, recommend scheduling a consultation with diagnostic X-rays.
- FIRST-TIME BRACES AFTERCARE & DIET: Recommend soft foods for the first few days (soup, lugaw/arroz caldo, mashed potatoes, yogurt, oatmeal, scrambled eggs, pasta, soft rice, bananas, soft bread). Strictly advise avoiding hard foods (nuts, popcorn, hard candy), sticky foods (chewing gum, caramel), and chewy foods (bagels, tough meat). For broken brackets or severe pain, advise contacting the clinic immediately.
- BRACES ADJUSTMENTS: Explain that braces adjustments are scheduled once every month, according to the personalized treatment plan prescribed by the dentist.
- BRACES PRICING BREAKDOWN: Metal Braces total ₱35,000 (Down payment ₱4,000, Monthly adjustment ₱1,000, Recementing ₱250, Lost bracket ₱500). Ceramic Braces total ₱45,000 (Down payment ₱5,500, Monthly adjustment ₱1,000, Recementing ₱250, Lost bracket ₱1,000). Self-Ligating Braces total ₱75,000 (Down payment ₱30,000, Adjustment ₱3,500). Sapphire Braces total ₱100,000–₱102,000.
- IN-CLINIC PAYMENT POLICY: Remind patients that online reservation is free (0 prepayment), and all payments (Cash, GCash, Cards, Maya) are settled at the physical front desk after doctor examination.

18. OFFICIAL CLINIC CONTACT DETAILS & BRANCHES:
- Pasig Branch (Main): +63 917 833 8482 / (02) 8632-1234 (Capitol Commons, Pasig City)
- Fairview Branch: +63 918 844 9593 / (02) 8921-5678 (Regalado Center, Fairview, Quezon City)
- San Juan Branch: +63 919 855 0604 / (02) 8724-9012 (Greenhills Town Center, San Juan City)
- 24/7 Dental Emergency Hotline: +63 917 833 8482
- Official Support Email: support@teethtalk.com
- Clinic Hours: Monday to Saturday, 9:00 AM – 5:00 PM
- NEVER use fake, generic, or placeholder phone numbers like (02) 1234-5678. Always provide the verified official numbers above.
"""

def generate_response(prompt: str, history: list = None, patient_id: str = None) -> str:
    """
    Generates a response using the Groq Llama 3 model based on the user's prompt and optional history.
    """
    if not GROQ_API_KEY or GROQ_API_KEY == "your_groq_api_key_here":
        return "I'm sorry, the clinic's AI system is currently offline (Missing API Key). Please contact the clinic directly!"

    # Fetch active AI settings (temperature, system triage prompt)
    active_temp = 0.2
    triage_system_prompt = ""
    try:
        settings_res = supabase.table("ai_settings").select("temperature, system_prompt").eq("id", 1).execute()
        if settings_res.data and len(settings_res.data) > 0:
            s_data = settings_res.data[0]
            if s_data.get("temperature") is not None:
                active_temp = float(s_data["temperature"])
            if s_data.get("system_prompt"):
                triage_system_prompt = f"\n[ADMIN TRIAGE & CLINICAL SYSTEM INSTRUCTION]:\n{s_data['system_prompt'].strip()}\n"
    except Exception as e:
        print(f"Failed to fetch ai_settings in chatbot: {e}")

    # Dynamically inject the latest clinic fees and doctors so Groq can answer questions accurately
    current_time_str = datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")
    dynamic_instruction = system_instruction + triage_system_prompt + f"\n[SYSTEM CONTEXT: The current date and time is {current_time_str}. Use this to calculate natural language dates like 'tomorrow'.]\n"
    try:
        res = supabase.table("billing_services").select("service_name, cost").execute()
        if res.data:
            fees_text = "\nHere is the current list of clinic fees to answer patient questions:\n"
            for item in res.data:
                fees_text += f"- {item['service_name']}: PHP {item['cost']}\n"
            
            dynamic_instruction += "\n" + fees_text
            
        doc_res = supabase.table("profiles").select("id, first_name, last_name, specialization, branch_id, branches(branch_name)").eq("role", "dentist").eq("is_available", True).execute()
        doc_dict = {}
        if doc_res.data:
            doc_dict = {str(item['id']): f"Dr. {item['first_name']} {item['last_name']}" for item in doc_res.data}
            doc_text = "\nHere is the current list of AVAILABLE dentists with their assigned clinic branch (DO NOT show their IDs to the user, they are confidential):\n"
            for item in doc_res.data:
                d_id = str(item['id'])
                d_name = doc_dict[d_id]
                spec = item.get('specialization') or 'General Dentistry'
                b_info = item.get('branches') or {}
                b_name = b_info.get('branch_name') if isinstance(b_info, dict) else "Assigned Branch"
                b_id = item.get('branch_id') or "N/A"
                doc_text += f"- {d_name} ({spec}) | Stationed Branch: {b_name} (Branch Tool ID: {b_id}) | Doctor Tool ID: {d_id}\n"
            doc_text += "\nCRITICAL RULE FOR DOCTOR APPOINTMENTS: When discussing doctor availability or booking appointments, always inform the patient which clinic branch the doctor is stationed at. Always use the doctor's assigned branch Tool ID when booking with that doctor.\n"
            dynamic_instruction += "\n" + doc_text
        else:
            dynamic_instruction += "\n\nCRITICAL CONTEXT: There are NO dentists currently available. You MUST inform the user that no doctors are available at this moment. DO NOT make up any names."
            
        branch_res = supabase.table("branches").select("id, branch_name").eq("is_active", True).execute()
        branch_dict = {}
        if branch_res.data:
            branch_dict = {str(item['id']): item['branch_name'] for item in branch_res.data}
            branch_text = "\nHere is the current list of AVAILABLE clinic branches (DO NOT show their IDs to the user):\n"
            for item in branch_res.data:
                branch_text += f"- {item['branch_name']} (Tool ID: {item['id']})\n"
            dynamic_instruction += "\n" + branch_text
            
        if patient_id:
            # Fetch all active, scheduled, confirmed, and pending appointments so AI has full visibility
            appt_res = supabase.table("appointments").select("id, appointment_date, dentist_id, branch_id, status, service_requested, notes").eq("patient_id", patient_id).in_("status", ["scheduled", "pending", "confirmed"]).order("appointment_date", desc=False).execute()
            if appt_res.data:
                appt_text = "\nCRITICAL CONTEXT: The user currently has the following active/pending appointment(s) in their account:\n"
                for appt in appt_res.data:
                    doc_name = doc_dict.get(str(appt.get('dentist_id')), "Assigned Doctor / General Dentist")
                    b_name = branch_dict.get(str(appt.get('branch_id')), "Main Branch")
                    svc_name = appt.get('service_requested') or appt.get('notes') or "Dental Consultation"
                    status_str = appt.get('status', 'scheduled').upper()
                    appt_text += f"- Appointment Tool ID: {appt['id']} | Status: {status_str} | Date/Time: {appt['appointment_date']} | Branch: {b_name} | Doctor: {doc_name} | Service: {svc_name}\n"
                appt_text += "\nIMPORTANT: When discussing these appointments with the user, refer to them naturally by Branch, Doctor, Date, Time, and Service. NEVER show the Appointment Tool ID to the user.\n"
                dynamic_instruction += "\n" + appt_text
            
    except Exception as e:
        print(f"Failed to fetch context for chatbot: {e}")

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
    
    tools = [
        {
            "type": "function",
            "function": {
                "name": "book_appointment",
                "description": "Book a dental appointment for the current user. Clinic hours are 10 AM to 5 PM.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "dentist_id": {
                            "type": "string",
                            "description": "The ID of the dentist to book with. Must be exactly one of the provided dentist IDs.",
                        },
                        "branch_id": {
                            "type": "string",
                            "description": "The ID of the clinic branch the patient wants to visit. Must be exactly one of the provided branch IDs.",
                        },
                        "date": {
                            "type": "string",
                            "description": "The date of the appointment in YYYY-MM-DD format.",
                        },
                        "time": {
                            "type": "string",
                            "description": "The time of the appointment in HH:MM format (24-hour). Must be between 09:00 and 17:00.",
                        },
                        "reason": {
                            "type": "string",
                            "description": "The reason for the appointment or the service requested by the patient.",
                        }
                    },
                    "required": ["dentist_id", "branch_id", "date", "time", "reason"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "modify_appointment",
                "description": "Modify an existing dental appointment. Use this when the user wants to reschedule.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "appointment_id": {
                            "type": "string",
                            "description": "The ID of the existing appointment to modify."
                        },
                        "new_date": {
                            "type": "string",
                            "description": "The new date of the appointment in YYYY-MM-DD format."
                        },
                        "new_time": {
                            "type": "string",
                            "description": "The new time of the appointment in HH:MM format (24-hour)."
                        },
                        "new_reason": {
                            "type": "string",
                            "description": "The new reason or service requested for the appointment."
                        }
                    },
                    "required": ["appointment_id", "new_date", "new_time", "new_reason"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "cancel_appointment",
                "description": "Cancel an existing dental appointment.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "appointment_id": {
                            "type": "string",
                            "description": "The ID of the existing appointment to cancel."
                        }
                    },
                    "required": ["appointment_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "cancel_all_appointments",
                "description": "Cancel ALL active (pending, scheduled, or confirmed) appointments for the current user when they request to cancel all of their bookings or due to an emergency.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "reason": {
                            "type": "string",
                            "description": "Optional reason for canceling all appointments (e.g. 'Emergency', 'Patient requested cancellation')."
                        }
                    },
                    "required": []
                }
            }
        }
    ]
    
    try:
        client = Groq(api_key=GROQ_API_KEY)
        
        chat_completion = client.chat.completions.create(
            messages=messages,
            model="openai/gpt-oss-120b",
            temperature=active_temp,
            max_tokens=1024,
            top_p=1,
            tools=tools,
            tool_choice="auto"
        )
        
        response_message = chat_completion.choices[0].message
        
        if response_message.tool_calls:
            tool_calls_data = []
            for tc in response_message.tool_calls:
                tool_calls_data.append({
                    "id": tc.id,
                    "type": tc.type,
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments
                    }
                })
                
            messages.append({
                "role": "assistant",
                "content": response_message.content or "",
                "tool_calls": tool_calls_data
            })
            
            for tool_call in response_message.tool_calls:
                tool_result = ""
                if tool_call.function.name == "book_appointment":
                    try:
                        args = json.loads(tool_call.function.arguments)
                        dentist_id = args.get("dentist_id")
                        branch_id = args.get("branch_id")
                        date = args.get("date")
                        time_str = args.get("time")
                        reason = args.get("reason", "Booked via AI Chatbot")
                        
                        if not patient_id:
                            tool_result = "Failed: Missing user ID. Ask the user to log in again."
                        else:
                            valid_dentist_ids = [str(d['id']) for d in doc_res.data] if 'doc_res' in locals() and doc_res.data else []
                            valid_branch_ids = [str(b['id']) for b in branch_res.data] if 'branch_res' in locals() and branch_res.data else []
                            
                            if dentist_id not in valid_dentist_ids:
                                tool_result = "Failed: Invalid doctor ID. Ask the user to choose from the available doctors."
                            elif branch_id not in valid_branch_ids:
                                tool_result = "Failed: Invalid branch ID. Ask the user to choose from the available branches."
                            else:
                                # Ensure branch matches dentist assigned branch if dentist has one
                                matched_doc = next((d for d in (doc_res.data or []) if str(d.get('id')) == dentist_id), None)
                                if matched_doc and matched_doc.get('branch_id'):
                                    doc_b_id = str(matched_doc.get('branch_id'))
                                    if branch_id != doc_b_id:
                                        branch_id = doc_b_id
                                
                                appointment_timestamp = f"{date}T{time_str}:00+08:00" if len(time_str.split(":")) == 2 else f"{date}T{time_str}+08:00"
                                
                                # Check for appointment conflicts (same-day same-branch or cross-branch buffer)
                                overlap_res = supabase.table("appointments") \
                                    .select("id, appointment_date, branch_id, status, service_requested") \
                                    .eq("patient_id", patient_id) \
                                    .in_("status", ["pending", "scheduled", "confirmed", "waiting", "in_progress"]) \
                                    .execute()
                                
                                conflict_reason = None
                                if overlap_res.data:
                                    try:
                                        target_dt = datetime.fromisoformat(appointment_timestamp.replace("+08:00", ""))
                                        for ex in overlap_res.data:
                                            ex_date_str = ex.get("appointment_date", "")
                                            if not ex_date_str:
                                                continue
                                            clean_iso = ex_date_str.replace("Z", "").replace("+00:00", "").replace("+08:00", "")[:19]
                                            ex_dt = datetime.fromisoformat(clean_iso)
                                            
                                            # Check same calendar day
                                            if ex_dt.date() == target_dt.date():
                                                ex_branch_id = ex.get("branch_id")
                                                # Same branch restriction
                                                if ex_branch_id and ex_branch_id == branch_id:
                                                    conflict_reason = f"Conflict detected: The patient already has an active appointment on {date} at {ex_dt.strftime('%I:%M %p')} at this branch. A patient cannot book multiple appointments on the same day at the same branch. Please suggest another date or rescheduling."
                                                    break
                                                else:
                                                    # Cross-branch travel buffer: 3.5 hours = 210 minutes
                                                    diff_mins = abs((target_dt - ex_dt).total_seconds()) / 60
                                                    if diff_mins < 210:
                                                        conflict_reason = f"Travel buffer required: The patient already has an appointment on {date} at {ex_dt.strftime('%I:%M %p')} at another branch. Appointments in different branches on the same day must be scheduled at least 3.5 hours apart due to treatment duration and inter-branch transit time."
                                                        break
                                            else:
                                                # General 60 min overlap check
                                                diff_mins = abs((target_dt - ex_dt).total_seconds()) / 60
                                                if diff_mins < 60:
                                                    conflict_reason = f"Conflict detected: The patient already has an appointment scheduled around this time ({ex_dt.strftime('%b %d at %I:%M %p')})."
                                                    break
                                    except Exception as parse_err:
                                        print("Date parse error in chatbot validation:", parse_err)
                                
                                if conflict_reason:
                                    tool_result = f"Failed: {conflict_reason}"
                                else:
                                    supabase.table("appointments").insert({
                                        "patient_id": patient_id,
                                        "dentist_id": dentist_id,
                                        "branch_id": branch_id,
                                        "appointment_date": appointment_timestamp,
                                        "status": "pending",
                                        "service_requested": reason,
                                        "notes": f"Reason: {reason} (Booked via AI)"
                                    }).execute()
                                    tool_result = f"Success! Booked for {date} at {time_str}."
                    except Exception as e:
                        print(f"Failed to book appointment via tool: {e}")
                        tool_result = "Failed: Server error during booking."
                
                elif tool_call.function.name == "modify_appointment":
                    try:
                        args = json.loads(tool_call.function.arguments)
                        appointment_id = args.get("appointment_id")
                        new_date = args.get("new_date")
                        new_time = args.get("new_time")
                        new_reason = args.get("new_reason", "General Consultation")
                        
                        if not patient_id:
                            tool_result = "Failed: Missing user ID. Ask the user to log in again."
                        else:
                            new_timestamp = f"{new_date}T{new_time}:00+08:00" if len(new_time.split(":")) == 2 else f"{new_date}T{new_time}+08:00"
                            supabase.table("appointments").update({
                                "appointment_date": new_timestamp,
                                "service_requested": new_reason,
                                "notes": f"Rescheduled/Modified via AI Chatbot"
                            }).eq("id", appointment_id).eq("patient_id", patient_id).execute()
                            tool_result = f"Success! Rescheduled to {new_date} at {new_time} for {new_reason}."
                    except Exception as e:
                        print(f"Failed to modify appointment: {e}")
                        tool_result = "Failed: Server error during modification."
                        
                elif tool_call.function.name == "cancel_appointment":
                    try:
                        args = json.loads(tool_call.function.arguments)
                        appointment_id = args.get("appointment_id")
                        
                        if not patient_id:
                            tool_result = "Failed: Missing user ID. Ask the user to log in again."
                        else:
                            supabase.table("appointments").update({
                                "status": "cancelled",
                                "notes": "Cancelled via AI Chatbot"
                            }).eq("id", appointment_id).eq("patient_id", patient_id).execute()
                            tool_result = "Success! Appointment cancelled."
                    except Exception as e:
                        print(f"Failed to cancel appointment: {e}")
                        tool_result = "Failed: Server error during cancellation."
                        
                elif tool_call.function.name == "cancel_all_appointments":
                    try:
                        args = json.loads(tool_call.function.arguments or "{}")
                        cancel_reason = args.get("reason", "Patient requested full cancellation via AI Chatbot")
                        
                        if not patient_id:
                            tool_result = "Failed: Missing user ID. Ask the user to log in again."
                        else:
                            supabase.table("appointments").update({
                                "status": "cancelled",
                                "notes": f"Cancelled all via AI Chatbot ({cancel_reason})"
                            }).eq("patient_id", patient_id).in_("status", ["scheduled", "pending", "confirmed"]).execute()
                            tool_result = "Success! All active and pending appointments for this patient have been cancelled."
                    except Exception as e:
                        print(f"Failed to cancel all appointments: {e}")
                        tool_result = "Failed: Server error during batch cancellation."
                        
                # Append tool result to messages
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": tool_call.function.name,
                    "content": tool_result
                })
                
            # Make the second API call to get the final conversational response with tools enabled
            try:
                second_response = client.chat.completions.create(
                    messages=messages,
                    model="openai/gpt-oss-120b",
                    temperature=active_temp,
                    max_tokens=1024,
                    top_p=1,
                    tools=tools,
                    tool_choice="auto"
                )
                final_content = second_response.choices[0].message.content or ""
                return final_content if final_content.strip() else tool_result
            except Exception as second_err:
                print(f"Second response generation fallback: {second_err}")
                return tool_result
        
        content = response_message.content or ""
        
        # Catch raw tool call leaks
        if "function=book_appointment" in content or "<function" in content:
            return "I need a few more details to book that. Please provide the exact doctor you want, the clinic branch, the date, time, and reason for your visit."
            
        return content
        
    except Exception as e:
        print(f"Groq API Error: {e}")
        return "I'm sorry, my AI services have temporarily reached their limit. Please try again in a minute, or contact the clinic directly!"
