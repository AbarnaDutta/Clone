import google.generativeai as genai
import speech_recognition as sr
import requests
import time

session_id = input("Enter session id: ")

def setup_and_start_bot():
    genai.configure(api_key="AIzaSyAd-nPU7hxeG4L5B4CTKnyncLKRYhHiayE")
    model = genai.GenerativeModel('gemini-2.0-flash')

    # Persona definition
    persona = """
From today your identity is Soham.
From now, you are Soham and give all answers in Soham's style.
Don't use emojis in your answers.
Behave like Soham in all chats.
Soham talks like this ↓

here is about soham:
I am Soham Pal. Currently doing B.Tech from Future Institute of Engineering and Management.
I am in 3rd year now. I am from Kolkata. I am a student of ECE.
I am a funny guy but always talk very seriously with teachers and parents.
Today I am in Phoenix Hackathon, working hard on projects and now showcasing to you.

Always reply like Soham's real talking style, attitude, tone & mood.
"""

    print("------ Soham Bot Setup ------\nPlease speak professionally.\n")

    chat = model.start_chat(history=[
        {"role": "user", "parts": ["Act like Soham, a formal corporate employee."]},
        {"role": "model", "parts": ["Understood. Responding as Soham professionally."]},
    ])

    print("\n------ Soham Bot Ready ------")
    print("Speak Anything... (say 'exit' or 'quit' to stop)\n")

    listener = sr.Recognizer()
    backend_url = "https://zxdrkz6n-3000.inc1.devtunnels.ms/persona/heygen/text"
    bot_speaking = False

    print("\nAvailable Microphones:")
    for i, name in enumerate(sr.Microphone.list_microphone_names()):
        print(f"{i}: {name}")

    try:
        mic_index = int(input("\nEnter your microphone index: "))
        print(f"🎤 Using mic: {sr.Microphone.list_microphone_names()[mic_index]}")
    except (ValueError, IndexError):
        print("❌ Invalid mic index.")
        return

    try:
        with sr.Microphone(device_index=mic_index, sample_rate=44100, chunk_size=1024) as source:
            print("🎤 Calibrating for ambient noise...")
            listener.adjust_for_ambient_noise(source, duration=1)

            while True:
                if bot_speaking:
                    continue  # Wait while bot is speaking

                try:
                    print("🎧 Listening...")
                    audio = listener.listen(source, timeout=10, phrase_time_limit=8)
                    print("✅ Got audio... processing...")

                    user_input = listener.recognize_google(audio).strip()
                    print(f"You: {user_input}")

                    if user_input.lower() in ['exit', 'quit']:
                        print("❌ Ending session.")
                        break

                    if "stop" in user_input.lower():
                        print("⏸ Paused.")
                        continue

                    if user_input:
                        prompt = f"{persona}\nUser: {user_input}\nSoham:"
                        gemini_response = chat.send_message(prompt)
                        bot_reply = gemini_response.text.strip()

                        # Send to backend
                        payload = {
                            "session_id": session_id,
                            "text": bot_reply,
                            "generate_ai_response": False
                        }

                        try:
                            bot_speaking = True
                            print("📡 Sending response to backend...")
                            response = requests.post(backend_url, json=payload)

                            if response.ok:
                                print("✅ API Response:", response.status_code)
                                data = response.json()
                                duration = data.get("speaking_duration", 5)  # fallback to 5 sec if missing
                                print(f"🕒 Waiting for {duration} seconds while avatar speaks...\n")
                                time.sleep(duration)
                            else:
                                print("🚫 Backend Error:", response.text)

                        except Exception as api_err:
                            print("🚫 API call failed:", api_err)
                        finally:
                            bot_speaking = False

                except sr.UnknownValueError:
                    print("😕 Didn't catch that. Please repeat.")
                except sr.WaitTimeoutError:
                    print("⏱ Timeout: No speech detected.")
                except Exception as inner_err:
                    print("⚠ Listening error:", inner_err)

    except Exception as outer_err:
        print("❌ Microphone error:", outer_err)


# Run the bot
if __name__ == "__main__":
    setup_and_start_bot()