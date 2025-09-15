import requests
import os
import uuid
import json
import logging
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

# Read N8N configuration directly from environment variables
N8N_URL = os.getenv("N8N_WEBHOOK_URL", "").rstrip("/")
AUTH = os.getenv("N8N_BASIC_AUTH", "")
API_HDR = os.getenv("N8N_API_KEY_HEADER", "")
API_VAL = os.getenv("N8N_API_KEY_VALUE", "")


def post_to_workflow(user_id: str, message: str, locale: str, timezone: str = "Asia/Riyadh", message_type: str = "text", audio_file=None) -> str:
    """
    Send a message to the n8n workflow and return the assistant's reply.
    
    Args:
        user_id: UUID of the user
        message: User's message text
        locale: Language locale (en/ar)
        timezone: User's timezone
        message_type: Type of message ("text" or "voice")
        audio_file: Audio file object for voice messages
        
    Returns:
        Assistant's reply text
        
    Raises:
        requests.RequestException: If the request fails
        ValueError: If the response format is invalid
    """
    if not N8N_URL:
        logger.warning("N8N_WEBHOOK_URL not configured, using mock response")
        return f"Mock response to: {message}"
    
    correlation_id = str(uuid.uuid4())
    
    # Prepare headers
    headers = {
        "X-Request-ID": correlation_id
    }
    
    # Add authentication headers
    if API_HDR and API_VAL:
        headers[API_HDR] = API_VAL
        logger.info(f"Added authentication header: {API_HDR}")
    
    auth = None
    if AUTH and ":" in AUTH:
        user, pw = AUTH.split(":", 1)
        auth = (user, pw)
    
    try:
        logger.info(f"Sending request to n8n workflow", extra={
            "correlation_id": correlation_id,
            "user_id": user_id,
            "message_length": len(message) if isinstance(message, str) else len(str(message)),
            "locale": locale,
            "message_type": message_type
        })
        
        # Handle voice messages with multipart/form-data
        if message_type == "voice" and audio_file:
            logger.info(f"Sending voice file as multipart/form-data")
            
            # Prepare form data
            files = {
                'audio_file': (audio_file.name, audio_file, audio_file.content_type)
            }
            
            data = {
                'user_id': str(user_id),
                'message_type': message_type,
                'language': locale,
                'metadata': json.dumps({
                    "locale": locale,
                    "timezone": timezone,
                    "source": "web",
                    "audio_format": "webm",
                    "encoding": "binary"
                })
            }
            
            response = requests.post(
                N8N_URL,
                files=files,
                data=data,
                headers=headers,
                auth=auth,
                timeout=(20, 45)  # 20s connect, 45s read
            )
        else:
            # Handle text messages with JSON
            payload = {
                "user_id": str(user_id),
                "message": message,
                "message_type": message_type,
                "language": locale,
                "metadata": {
                    "locale": locale,
                    "timezone": timezone,
                    "source": "web"
                }
            }
            
            headers["Content-Type"] = "application/json"
            
            response = requests.post(
                N8N_URL,
                json=payload,
                headers=headers,
                auth=auth,
                timeout=(20, 45)  # 20s connect, 45s read
            )
        
        response.raise_for_status()
        
        # Log response details for debugging
        logger.info(f"N8N response status: {response.status_code}, content-type: {response.headers.get('content-type', 'unknown')}")
        logger.info(f"N8N response text: {response.text}")  # Log full response
        logger.info(f"N8N response headers: {dict(response.headers)}")
        
        try:
            if response.text.strip():
                data = response.json()
                logger.info(f"N8N response data: {data}")
                
                # Try different possible response formats from N8N
                reply = data.get("reply", "") or data.get("output", "") or data.get("response", "") or data.get("message", "")
                
                # If still no reply, try to get the first string value from the response
                if not reply and isinstance(data, dict):
                    for key, value in data.items():
                        if isinstance(value, str) and value.strip():
                            reply = value
                            break
                
                logger.info(f"Extracted reply: '{reply}'")
            else:
                logger.warning("N8N returned empty response")
                reply = "I received your message but got no response from the AI service. This might be a configuration issue."
        except ValueError as e:
            logger.error(f"Failed to parse N8N response as JSON: {e}")
            logger.error(f"Response text: {response.text}")
            # Return the raw response text if it's not JSON
            if response.text.strip():
                return f"N8N Response: {response.text}"
            else:
                return "I apologize, but I received an invalid response from the AI service. Please try again."
        
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

