import requests
import os
import uuid
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

N8N_URL = os.getenv("N8N_WEBHOOK_URL", "").rstrip("/")
AUTH = os.getenv("N8N_BASIC_AUTH")
API_HDR = os.getenv("N8N_API_KEY_HEADER")
API_VAL = os.getenv("N8N_API_KEY_VALUE")


def post_to_workflow(user_id: str, message: str, locale: str, timezone: str = "Asia/Riyadh") -> str:
    """
    Send a message to the n8n workflow and return the assistant's reply.
    
    Args:
        user_id: UUID of the user
        message: User's message text
        locale: Language locale (en/ar)
        timezone: User's timezone
        
    Returns:
        Assistant's reply text
        
    Raises:
        requests.RequestException: If the request fails
        ValueError: If the response format is invalid
    """
    if not N8N_URL:
        logger.warning("N8N_WEBHOOK_URL not configured, using mock response")
        return f"Mock response to: {message}"
    
    payload = {
        "user_id": str(user_id),
        "message": message,
        "metadata": {
            "locale": locale,
            "timezone": timezone,
            "source": "web"
        }
    }
    
    headers = {
        "Content-Type": "application/json",
        "X-Request-ID": str(uuid.uuid4())
    }
    
    # Add authentication headers
    if API_HDR and API_VAL:
        headers[API_HDR] = API_VAL
    
    auth = None
    if AUTH and ":" in AUTH:
        user, pw = AUTH.split(":", 1)
        auth = (user, pw)
    
    correlation_id = headers["X-Request-ID"]
    
    try:
        logger.info(f"Sending request to n8n workflow", extra={
            "correlation_id": correlation_id,
            "user_id": user_id,
            "message_length": len(message),
            "locale": locale
        })
        
        response = requests.post(
            N8N_URL,
            json=payload,
            headers=headers,
            auth=auth,
            timeout=(20, 45)  # 20s connect, 45s read
        )
        
        response.raise_for_status()
        
        data = response.json()
        reply = data.get("reply", "")
        
        if not reply:
            logger.warning(f"Empty reply from n8n workflow", extra={
                "correlation_id": correlation_id,
                "response_data": data
            })
            return "I apologize, but I couldn't generate a response at the moment. Please try again."
        
        logger.info(f"Received reply from n8n workflow", extra={
            "correlation_id": correlation_id,
            "reply_length": len(reply)
        })
        
        return reply
        
    except requests.exceptions.Timeout:
        logger.error(f"Timeout calling n8n workflow", extra={
            "correlation_id": correlation_id,
            "user_id": user_id
        })
        raise
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error calling n8n workflow: {e}", extra={
            "correlation_id": correlation_id,
            "user_id": user_id,
            "error": str(e)
        })
        raise
        
    except (ValueError, KeyError) as e:
        logger.error(f"Invalid response format from n8n workflow: {e}", extra={
            "correlation_id": correlation_id,
            "user_id": user_id,
            "error": str(e)
        })
        raise ValueError(f"Invalid response format: {e}")


def simulate_streaming_response(text: str, chunk_size: int = 10):
    """
    Simulate streaming response by splitting text into chunks.
    This is used when n8n doesn't support streaming but we want to 
    provide a streaming experience to the user.
    
    Args:
        text: The complete response text
        chunk_size: Number of words per chunk
        
    Yields:
        Text chunks
    """
    words = text.split()
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        if i + chunk_size < len(words):
            chunk += " "
        yield chunk

