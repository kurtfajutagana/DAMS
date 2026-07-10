from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.intent_chatbot import generate_hybrid_response
from services.db import supabase
from typing import Optional, List
from uuid import UUID
from datetime import datetime

router = APIRouter(
    prefix="/chat",
    tags=["Chatbot"]
)

class ChatRequest(BaseModel):
    patient_id: UUID
    message: str

class ChatResponse(BaseModel):
    response: str
    log_id: Optional[str] = None

@router.post("/generative", response_model=ChatResponse)
def handle_chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
        
    # Fetch recent chat history for context
    history = []
    try:
        response = supabase.table("chatbot_logs").select("message_prompt, ai_response").eq("patient_id", str(request.patient_id)).order("created_at", desc=True).limit(5).execute()
        if response.data:
            # Reverse to make it chronological
            history = response.data[::-1]
    except Exception as e:
        print(f"Error fetching chat history: {e}")
        
    # Generate response using Hybrid Chatbot Model
    ai_response = generate_hybrid_response(request.message, history=history)
    
    # Log the interaction to Supabase
    log_id = None
    try:
        data, count = supabase.table("chatbot_logs").insert({
            "patient_id": str(request.patient_id),
            "message_prompt": request.message,
            "ai_response": ai_response
        }).execute()
        
        if data and len(data[1]) > 0:
            log_id = data[1][0].get("id")
    except Exception as e:
        # We don't want to fail the entire request if logging fails, but we should note it
        print(f"Failed to log chat to database: {e}")
        
    return ChatResponse(
        response=ai_response,
        log_id=log_id
    )

class ChatHistoryResponse(BaseModel):
    message_prompt: str
    ai_response: str
    created_at: datetime

@router.get("/history/{patient_id}", response_model=List[ChatHistoryResponse])
def get_chat_history(patient_id: UUID):
    try:
        response = supabase.table("chatbot_logs").select("message_prompt, ai_response, created_at").eq("patient_id", str(patient_id)).order("created_at", desc=True).limit(15).execute()
        
        if response.data:
            return response.data[::-1] # Reverse to chronological
        return []
    except Exception as e:
        print(f"Error fetching chat history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")
