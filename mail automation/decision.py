import os
import firebase_admin
from firebase_admin import credentials, firestore
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import google.generativeai as genai
import base64
from email.mime.text import MIMEText


import sys

sys.stdout.reconfigure(encoding='utf-8')

# Firebase Setup
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Gmail API Scopes (Read & Send Emails)
SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send"
]



# 🔹 Configure Gemini AI
genai.configure(api_key="AIzaSyDHRx2-t6rBlGYo6Y16p_UDIcxPksKjefo")


def authenticate_gmail():
    """Authenticate and return Gmail API service."""
    creds = None
    token_path = "token.json"

    # Load stored token
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path)

    # Authenticate if no valid token exists
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
            creds = flow.run_local_server(port=0)

        # Save credentials
        with open(token_path, "w") as token:
            token.write(creds.to_json())

    return build("gmail", "v1", credentials=creds)


def sanitize_email(email):
    """Convert an email to a Firestore-safe document ID."""
    return email.replace("@", "_").replace(".", "_").replace("<", "").replace(">", "")


def fetch_latest_emails():
    """Fetch latest emails and store full conversation history in Firestore."""
    service = authenticate_gmail()
    results = service.users().messages().list(userId="me", q="is:unread", maxResults=5).execute()
    messages = results.get("messages", [])
    
    if not messages:
        print("No new unread emails.")
        return []
    
    unread_emails = []
    for msg in messages:
        msg_data = service.users().messages().get(userId="me", id=msg["id"]).execute()
        headers = {h["name"]: h["value"] for h in msg_data["payload"]["headers"]}
        sender = headers.get("From", "Unknown")
        subject = headers.get("Subject", "No Subject")
        email_body = msg_data.get("snippet", "No Content")
        thread_id = msg_data.get("threadId")

        # 🔹 Convert sender email into Firestore-safe format
        sender_id = sanitize_email(sender)

        # 🔹 Store full email conversation history in Firestore
        sender_doc_ref = db.collection("emails").document(sender_id)
        sender_doc = sender_doc_ref.get()
        sender_conversation = sender_doc.to_dict().get("messages", []) if sender_doc.exists else []

        # 🔹 Append new message to history
        sender_conversation.append({"from": sender, "message": email_body})

        sender_doc_ref.set({
            "subject": subject,
            "messages": sender_conversation
        }, merge=True)  # ✅ Prevents overwriting

        # 🔹 Mark email as read (prevents duplicate replies)
        service.users().messages().modify(userId="me", id=msg["id"], body={"removeLabelIds": ["UNREAD"]}).execute()

        unread_emails.append({"sender": sender, "subject": subject, "body": email_body, "threadId": thread_id})
    
    print("Unread emails fetched and stored in Firestore!")
    return unread_emails
def fetch_sent_emails():
    """Fetch sent emails and store them in Firestore under 'me'."""
    service = authenticate_gmail()
    results = service.users().messages().list(userId="me", q="from:me", maxResults=5).execute()
    messages = results.get("messages", [])

    if not messages:
        print("No sent emails found.")
        return

    for msg in messages:
        msg_data = service.users().messages().get(userId="me", id=msg["id"]).execute()
        email_snippet = msg_data.get("snippet", "No Content")

        headers = {h["name"]: h["value"] for h in msg_data["payload"]["headers"]}
        subject = headers.get("Subject", "No Subject")

        # 🔹 Store under "me" in Firestore
        me_doc_ref = db.collection("emails").document("me")
        me_doc = me_doc_ref.get()
        me_conversation = me_doc.to_dict().get("messages", []) if me_doc.exists else []

        me_conversation.append({"from": "me", "message": email_snippet})

        me_doc_ref.set({
            "subject": subject,
            "messages": me_conversation
        }, merge=True)

    print("Sent emails stored in Firestore!")
    

def get_past_conversations(sender):
    """Fetch past email conversations with a specific sender."""
    sender_id = sanitize_email(sender)
    doc_ref = db.collection("emails").document(sender_id)
    doc = doc_ref.get()

    if doc.exists:
        return doc.to_dict().get("messages", [])
    return []


def get_all_conversations():
    """Retrieve all past email conversations from Firestore."""
    docs = db.collection("emails").stream()
    all_messages = []

    for doc in docs:
        data = doc.to_dict()
        all_messages.extend(data.get("messages", []))

    return all_messages


def generate_ai_reply(sender, email_subject, new_email_body):
    """AI generates a reply based on the user's entire email response behavior."""
    
    all_conversations = get_all_conversations()  # Fetch all past emails
    sender_conversations = get_past_conversations(sender)  # Fetch sender-specific emails
    my_past_responses = get_past_conversations("me")  # Fetch past responses I have sent
    # Convert all conversation history into text for AI
    all_conversation_text = "\n".join([f"{msg['from']}: {msg['message']}" for msg in all_conversations])
    sender_conversation_text = "\n".join([f"{msg['from']}: {msg['message']}" for msg in sender_conversations])
    my_responses_text = "\n".join([f"{msg['from']}: {msg['message']}" for msg in my_past_responses])
    prompt = f"""
    You are an intelligent email assistant replying on behalf of the user.

### GOAL:
Write a natural, polite, and thoughtful reply to a new email by:
- Matching the user’s past communication tone (formal/informal, brief/detailed)
- Considering all prior confirmed or acknowledged events
- Ensuring no scheduling conflicts
- Following the user’s typical behavior in similar scenarios

---

### 🧠 CONTEXT TO UNDERSTAND:
1. Carefully read the user's previous replies and communication style.
2. Identify any **prior commitments** already acknowledged by the user (meetings, exams, deadlines, personal events, etc.).
3. Check for conflicts between this **new email request** and existing plans.
4. Analyze how the user has responded to **similar requests** (acceptance or decline) in the past.
5. If there is a clear pattern (e.g., user usually says no to spontaneous requests), follow that.
6. If the new request **conflicts** with existing plans, politely decline and suggest an alternative.
7. If there's **no conflict**, write an appropriate reply in the user's style.
8. If unclear, ask for more details respectfully.

---

### 🧾 PAST EMAIL HISTORY (Various Conversations):
{all_conversation_text}

---

### 📩 CONVERSATIONS WITH {sender}:
{sender_conversation_text}

---

### ✉️ USER'S PAST SENT EMAILS:
{my_responses_text}

---

### 📬 NEW EMAIL RECEIVED:
Subject: {email_subject}
Message: {new_email_body}

### ✍️ WRITE A REPLY AS IF YOU ARE THE USER:
- Use the same tone/style as seen in previous messages
- Respect existing commitments
- Be polite and complete
- Don’t say just “Ok” or “No”
    ### Based on the user's past responses, generate the most logical reply.
    """
    
    model = genai.GenerativeModel("gemini-1.5-pro-latest")  
    response = model.generate_content(prompt)
    print(response)
    return response.text.strip()  # AI's suggested reply

def send_email_reply(to, subject, reply_text, thread_id):
    """Send an email reply in the same thread."""
    service = authenticate_gmail()

    message = MIMEText(reply_text)
    message["to"] = to
    message["subject"] = "Re: " + subject
    message["threadId"] = thread_id

    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

    service.users().messages().send(userId="me", body={"raw": raw_message, "threadId": thread_id}).execute()
    print(f"Reply sent to {to}")


def auto_reply():
    """Fetch unread emails, generate AI replies, and send responses automatically."""
    unread_emails = fetch_latest_emails()
    fetch_sent_emails()  # Fetch & store sent emails

    for email in unread_emails:
        sender = email["sender"]
        subject = email["subject"]
        body = email["body"]
        thread_id = email["threadId"]

        ai_reply = generate_ai_reply(sender, subject, body)
        send_email_reply(sender, subject, ai_reply, thread_id)

auto_reply()

'''
# Test New Email
sender = "newperson@example.com"
subject = "Can we schedule a meeting?"
body = "Would you be available for a discussion tomorrow at 6 AM?"

ai_suggested_reply = generate_ai_reply(sender, subject, body)
print("AI Suggested Reply:", ai_suggested_reply)
'''